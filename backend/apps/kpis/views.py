from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import Avg, Count, F, Q
from datetime import timedelta, datetime, time, date
from django.utils.dateparse import parse_date
from django.db.models.functions import Extract
from django.http import HttpResponse
from io import BytesIO

from apps.calls.models import Llamada
from apps.users.models import Centro, User
from apps.users.permissions import IsAdminOrCoordinador, IsAdmin, IsJefeCampana, IsCoordinador, IsJefeCentro
from apps.kpis.serializers import AgenteListSerializer, KPIAgenteDetailSerializer
from common.estados_helper import get_estado_id, get_estado
from apps.campaigns.models import Campana, Equipo
from rest_framework.pagination import PageNumberPagination

# Importaciones para PDF
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT



class KPIViewSet(viewsets.ViewSet):
    """
    ViewSet para KPIs de agentes.
    Endpoints disponibles:
    - GET /api/kpis/agentes/ → Listar agentes
    - GET /api/kpis/agentes/<documento_id>/detalle/ → KPI detallado de un agente
    """

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def agente(self, request):
        """
        Devuelve los KPIs de un agente según rango de fechas.
        Query params:
            agente_id: ID del agente
            rango: 'hoy', 'semana', 'mes', 'personalizado'
            fecha_desde, fecha_hasta: opcional si rango='personalizado'
        """
        agente_id = request.query_params.get('agente_id')
        if not agente_id:
            return Response(
                {"detail": "El parámetro 'agente_id' es requerido"},
                status=status.HTTP_400_BAD_REQUEST
            )

        agente = get_object_or_404(User, documento_id=agente_id)

        rango = request.query_params.get('rango', 'hoy')
        hoy = timezone.now().date()

        if rango == 'hoy':
            fecha_desde = fecha_hasta = hoy
        elif rango == 'semana':
            fecha_desde = hoy - timedelta(days=hoy.weekday())
            fecha_hasta = hoy
        elif rango == 'mes':
            fecha_desde = hoy.replace(day=1)
            fecha_hasta = hoy
        elif rango == 'personalizado':
            fecha_desde = parse_date(request.query_params.get('fecha_desde'))
            fecha_hasta = parse_date(request.query_params.get('fecha_hasta'))
            if not fecha_desde or not fecha_hasta:
                return Response(
                    {"detail": "Debes enviar fecha_desde y fecha_hasta válidas"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            return Response(
                {"detail": "Rango inválido"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Convertir fechas a datetime para la consulta
        tz = timezone.get_current_timezone()

        # Crear datetimes "aware" correctamente localizados
        inicio_dia = datetime.combine(fecha_desde, time.min).replace(tzinfo=tz)
        fin_dia = datetime.combine(fecha_hasta, time.max).replace(tzinfo=tz)

        # Filtro
        llamadas = Llamada.objects.filter(
            agente=agente,
            fecha_hora_inicio__range=(inicio_dia, fin_dia)
        )

        total_llamadas = llamadas.count()

        # Ventas realizadas (excluir NO_VENTA usando estados_helper)
        estado_no_venta_id = get_estado_id('ESTADO_VENTA', 'NO_VENTA')
        if estado_no_venta_id:
            ventas = llamadas.exclude(
                estado_venta_id=estado_no_venta_id).count()
        else:
            ventas = 0

        # Cumplimiento
        cumplimiento = (ventas / total_llamadas *
                        100) if total_llamadas > 0 else 0

        # Llamadas por hora
        dias = (fecha_hasta - fecha_desde).days + 1
        horas = dias * 8
        llamadas_por_hora = round(total_llamadas / horas, 2)

        llamadas_por_hora_qs = (
            llamadas.annotate(
                hora=Extract('fecha_hora_inicio', 'hour')
            )
            .values('hora')
            .annotate(total=Count('id'))
            .order_by('hora')
        )

        horas_dict = {i: 0 for i in range(9, 19)}
        for item in llamadas_por_hora_qs:
            horas_dict[item['hora']] = item['total']

        llamadas_por_hora_ls = [
            {"hora": f"{hora:02d}:00", "total": total}
            for hora, total in sorted(horas_dict.items())
        ]

        # Duración promedio
        duracion_promedio = llamadas.filter(
            duracion__isnull=False
        ).aggregate(promedio=Avg('duracion'))['promedio'] or 0

        return Response({
            "agente_id": agente.pk,
            "agente_nombre": agente.get_full_name(),
            "total_llamadas": total_llamadas,
            "ventas_realizadas": ventas,
            "cumplimiento": round(cumplimiento, 2),
            "llamadas_por_hora": llamadas_por_hora,
            "duracion_promedio_segundos": round(duracion_promedio, 2),
            "fecha_desde": fecha_desde,
            "fecha_hasta": fecha_hasta,
            "llamadas_por_hora_detalle": llamadas_por_hora_ls
        })

    @action(detail=False, methods=['get'], url_path='overview')
    def overview(self, request):
        """
        Endpoint compatible con el frontend.
        Devuelve KPIs del agente autenticado en estructura anidada.

        Query params:
            from: Fecha inicio (YYYY-MM-DD)
            to: Fecha fin (YYYY-MM-DD)

        Response:
            {
                "now": "2025-10-10T15:30:00Z",
                "values": { ... },
                "meta": { ... },
                "series": { ... }
            }
        """
        # Obtener agente del token JWT (seguridad)
        agente = request.user

        # Parsear fechas desde query params
        fecha_desde_str = request.query_params.get('from')
        fecha_hasta_str = request.query_params.get('to')

        if not fecha_desde_str or not fecha_hasta_str:
            return Response(
                {"detail": "Los parámetros 'from' y 'to' son requeridos (formato YYYY-MM-DD)"},
                status=status.HTTP_400_BAD_REQUEST
            )

        fecha_desde = parse_date(fecha_desde_str)
        fecha_hasta = parse_date(fecha_hasta_str)

        if not fecha_desde or not fecha_hasta:
            return Response(
                {"detail": "Fechas inválidas. Usa formato YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar que fecha_desde <= fecha_hasta
        if fecha_desde > fecha_hasta:
            return Response(
                {"detail": "La fecha 'from' no puede ser posterior a 'to'"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Convertir fechas a datetime con timezone
        tz = timezone.get_current_timezone()
        inicio_dia = datetime.combine(fecha_desde, time.min).replace(tzinfo=tz)
        fin_dia = datetime.combine(fecha_hasta, time.max).replace(tzinfo=tz)

        # Filtrar llamadas del agente en el rango
        llamadas = Llamada.objects.filter(
            agente=agente,
            fecha_hora_inicio__range=(inicio_dia, fin_dia)
        )

        # Total de llamadas atendidas (solo las contestadas)
        total_llamadas = llamadas.filter(fue_contestada=True).count()

        # Ventas realizadas (excluir NO_VENTA usando estados_helper) - solo de llamadas contestadas
        estado_no_venta_id = get_estado_id('ESTADO_VENTA', 'NO_VENTA')
        if estado_no_venta_id:
            ventas = llamadas.filter(fue_contestada=True).exclude(
                estado_venta_id=estado_no_venta_id).count()
        else:
            ventas = 0

        # Cumplimiento como decimal 0-1
        cumplimiento_decimal = (
            ventas / total_llamadas) if total_llamadas > 0 else 0

        # Llamadas por hora (promedio) - solo contestadas
        dias = (fecha_hasta - fecha_desde).days + 1
        horas_totales = dias * 8  # Asumiendo 8 horas laborales por día
        llamadas_por_hora_promedio = round(
            total_llamadas / horas_totales, 2) if horas_totales > 0 else 0

        # Desglose de llamadas por hora (para gráfica) - solo contestadas
        llamadas_por_hora_qs = (
            llamadas.filter(fue_contestada=True).annotate(
                hora=Extract('fecha_hora_inicio', 'hour')
            )
            .values('hora')
            .annotate(total=Count('id'))
            .order_by('hora')
        )

        # Crear diccionario con todas las horas (9-18)
        horas_dict = {i: 0 for i in range(9, 19)}
        for item in llamadas_por_hora_qs:
            horas_dict[item['hora']] = item['total']

        # Convertir a lista con key "valor" (como espera el frontend)
        series_llamadas_por_hora = [
            {"hora": f"{hora:02d}:00", "valor": total}
            for hora, total in sorted(horas_dict.items())
        ]

        # Duración promedio de llamada - solo de llamadas contestadas
        duracion_promedio = llamadas.filter(
            fue_contestada=True,
            duracion__isnull=False
        ).aggregate(promedio=Avg('duracion'))['promedio'] or 0

        # Metas fijas (TODO: Implementar modelo Meta en el futuro)
        # Estas metas son valores de ejemplo que se pueden ajustar
        metas = {
            "llamadas_atendidas": 50,
            "ventas_realizadas": 15,
            "tiempo_promedio_llamada": 180,  # 3 minutos en segundos
            "llamadas_por_hora": 6,
            "cumplimiento": 1  # 100% como decimal
        }

        # Respuesta en formato que espera el frontend
        return Response({
            "now": timezone.now().isoformat(),
            "values": {
                "llamadas_atendidas": total_llamadas,
                "ventas_realizadas": ventas,
                "tiempo_promedio_llamada": round(duracion_promedio, 2),
                "llamadas_por_hora": llamadas_por_hora_promedio,
                "cumplimiento": round(cumplimiento_decimal, 4)  # Decimal 0-1
            },
            "meta": metas,
            "series": {
                "llamadas_por_hora": series_llamadas_por_hora
            }
        })

    @action(detail=False, methods=['get'], url_path='agentes')
    def agentes_list(self, request):
        """
        Endpoint para coordinadores: Devuelve lista de agentes.
        Solo accesible para Admin y Coordinadores.

        GET /api/kpis/agentes/

        Response:
            [
                {
                    "id": "documento_id",
                    "nombre_completo": "Nombre del Agente",
                    "email": "agente@email.com",
                    "phone": "+573001234567",
                    "estado_actual": "DISPONIBLE"
                },
                ...
            ]
        """
        # Validar permisos: Solo Admin y Coordinadores
        if not (request.user.is_admin() or request.user.rol == get_estado('ROL_USUARIO', 'COORDINADOR')):
            return Response(
                {"detail": "No tienes permiso para acceder a este recurso"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Filtrar agentes (todos si es admin, solo del equipo si es coordinador)
        if request.user.is_admin():
            agentes = User.objects.filter(
                rol=get_estado('ROL_USUARIO', 'AGENTE'),
                is_active=True
            ).order_by('first_name', 'last_name')
        else:
            # Los coordinadores solo ven agentes de sus equipos asignados
            # Obtener equipos donde el usuario actual es coordinador
            from apps.campaigns.models import Equipo

            equipos_coordinados = Equipo.objects.filter(
                coordinador=request.user,
                is_active=True
            )

            # Obtener los IDs de agentes en esos equipos usando la tabla intermedia
            agentes_ids = []
            for equipo in equipos_coordinados:
                ids_equipo = equipo.agentes_detalle.values_list(
                    'agente_id', flat=True)
                agentes_ids.extend(ids_equipo)

            # Eliminar duplicados
            agentes_ids = list(set(agentes_ids))

            # Filtrar agentes por sus documento_id
            agentes = User.objects.filter(
                documento_id__in=agentes_ids,
                is_active=True
            ).order_by('first_name', 'last_name')

        serializer = AgenteListSerializer(agentes, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='agentes/(?P<documento_id>[^/.]+)/detalle')
    def agente_detalle(self, request, documento_id=None):
        """
        Endpoint para coordinadores: Devuelve KPI detallado de un agente.
        Solo accesible para Admin y Coordinadores.

        GET /api/kpis/agentes/{documento_id}/detalle/?fecha_desde=2025-10-01&fecha_hasta=2025-10-21

        Query params:
            fecha_desde: Fecha inicio (YYYY-MM-DD), obligatorio
            fecha_hasta: Fecha fin (YYYY-MM-DD), obligatorio

        Response:
            {
                "agente_id": "documento_id",
                "agente_nombre": "Nombre del Agente",
                "agente_email": "agente@email.com",
                "fecha_desde": "2025-10-01",
                "fecha_hasta": "2025-10-21",
                "total_llamadas": 50,
                "ventas_realizadas": 15,
                "tasa_conversion": 30.0,
                "tiempo_trabajado_segundos": 28800,
                "tiempo_trabajado_formateado": "8h 0m",
                "duracion_promedio_segundos": 180.5,
                "duracion_promedio_formateado": "3m 0s",
                "estado_actual": "DISPONIBLE",
                "llamadas_por_hora": [...]
            }
        """
        # Validar permisos: Solo Admin y Coordinadores
        if not (request.user.is_admin() or request.user.rol == get_estado('ROL_USUARIO', 'COORDINADOR')):
            return Response(
                {"detail": "No tienes permiso para acceder a este recurso"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Obtener agente
        agente = get_object_or_404(
            User, documento_id=documento_id, rol=get_estado('ROL_USUARIO', 'AGENTE'))

        # Parsear fechas
        fecha_desde_str = request.query_params.get('fecha_desde')
        fecha_hasta_str = request.query_params.get('fecha_hasta')

        if not fecha_desde_str or not fecha_hasta_str:
            return Response(
                {"detail": "Los parámetros 'fecha_desde' y 'fecha_hasta' son requeridos (formato YYYY-MM-DD)"},
                status=status.HTTP_400_BAD_REQUEST
            )

        fecha_desde = parse_date(fecha_desde_str)
        fecha_hasta = parse_date(fecha_hasta_str)

        if not fecha_desde or not fecha_hasta:
            return Response(
                {"detail": "Fechas inválidas. Usa formato YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST
            )

        hoy = date.today()

        # Validar que no sean fechas futuras
        if fecha_desde > hoy:
            return Response(
                {"detail": "No se pueden elegir fechas futuras"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if fecha_hasta > hoy:
            return Response(
                {"detail": "No se pueden elegir fechas futuras"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar rango de fechas
        if fecha_desde > fecha_hasta:
            return Response(
                {"detail": "La fecha inicial no puede ser mayor a la fecha posterior"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Convertir fechas a datetime con timezone
        tz = timezone.get_current_timezone()
        inicio_dia = datetime.combine(fecha_desde, time.min).replace(tzinfo=tz)
        fin_dia = datetime.combine(fecha_hasta, time.max).replace(tzinfo=tz)

        # Filtrar llamadas del agente en el rango
        llamadas = Llamada.objects.filter(
            agente=agente,
            fecha_hora_inicio__range=(inicio_dia, fin_dia)
        )

        total_llamadas = llamadas.count()

        # Ventas realizadas (excluir NO_VENTA)
        estado_no_venta_id = get_estado_id('ESTADO_VENTA', 'NO_VENTA')
        if estado_no_venta_id:
            ventas = llamadas.exclude(
                estado_venta_id=estado_no_venta_id).count()
        else:
            ventas = 0

        # Tasa de conversión
        tasa_conversion = (ventas / total_llamadas *
                           100) if total_llamadas > 0 else 0

        # Tiempo trabajado (sumatoria de duraciones)
        tiempo_trabajado_segundos = llamadas.filter(
            duracion__isnull=False
        ).aggregate(total=Count('id') * 0)['total'] or 0

        # En realidad, necesitamos sumar las duraciones reales
        duraciones = llamadas.filter(
            duracion__isnull=False).values_list('duracion', flat=True)
        tiempo_trabajado_segundos = sum(duraciones) if duraciones else 0

        # Duración promedio
        duracion_promedio = llamadas.filter(
            duracion__isnull=False
        ).aggregate(promedio=Avg('duracion'))['promedio'] or 0

        # Desglose de llamadas por hora (para gráfica)
        llamadas_por_hora_qs = (
            llamadas.annotate(
                hora=Extract('fecha_hora_inicio', 'hour')
            )
            .values('hora')
            .annotate(total=Count('id'))
            .order_by('hora')
        )

        # Crear diccionario con todas las horas (9-18)
        horas_dict = {i: 0 for i in range(9, 19)}
        for item in llamadas_por_hora_qs:
            if item['hora'] is not None:
                horas_dict[item['hora']] = item['total']

        # Convertir a lista
        llamadas_por_hora = [
            {"hora": f"{hora:02d}:00", "total": total}
            for hora, total in sorted(horas_dict.items())
        ]

        # Obtener estado actual del agente
        estado_actual = 'SIN_ESTADO'
        try:
            if agente.estado_actual and agente.estado_actual.estado_id:
                estado_actual = agente.estado_actual.estado_id.valor
        except:
            pass

        # Formatear tiempo trabajado
        horas = tiempo_trabajado_segundos // 3600
        minutos = (tiempo_trabajado_segundos % 3600) // 60
        tiempo_trabajado_formateado = f"{horas}h {minutos}m"

        # Formatear duración promedio
        minutos_prom = int(duracion_promedio) // 60
        segundos_prom = int(duracion_promedio) % 60
        duracion_promedio_formateado = f"{minutos_prom}m {segundos_prom}s"

        # Crear respuesta
        data = {
            "agente_id": agente.documento_id,
            "agente_nombre": agente.get_full_name(),
            "agente_email": agente.email,
            "fecha_desde": fecha_desde,
            "fecha_hasta": fecha_hasta,
            "total_llamadas": total_llamadas,
            "ventas_realizadas": ventas,
            "tasa_conversion": round(tasa_conversion, 2),
            "tiempo_trabajado_segundos": tiempo_trabajado_segundos,
            "tiempo_trabajado_formateado": tiempo_trabajado_formateado,
            "duracion_promedio_segundos": round(duracion_promedio, 2),
            "duracion_promedio_formateado": duracion_promedio_formateado,
            "estado_actual": estado_actual,
            "llamadas_por_hora": llamadas_por_hora
        }

        return Response(data)

    @action(detail=False, methods=['get'], url_path='equipo/overview')
    def equipo_overview(self, request):
        """
        Endpoint para coordinadores: Devuelve KPIs agregados del equipo.
        Solo accesible para Coordinadores y Admins.

        GET /api/kpis/equipo/overview/?from=2025-10-01&to=2025-10-21

        Query params:
            from: Fecha inicio (YYYY-MM-DD), obligatorio
            to: Fecha fin (YYYY-MM-DD), obligatorio

        Response:
            {
                "llamadas_en_curso": 5,
                "agentes_disponibles": 3,
                "tiempo_promedio_llamada": 180.5,
                "llamadas_realizadas": 150,
                "tasa_conversion": 25.5
            }
        """
        # Validar permisos: Solo Admin y Coordinadores
        if not (request.user.is_admin() or request.user.rol == get_estado('ROL_USUARIO', 'COORDINADOR')):
            return Response(
                {"detail": "No tienes permiso para acceder a este recurso"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Parsear fechas
        fecha_desde_str = request.query_params.get('from')
        fecha_hasta_str = request.query_params.get('to')

        if not fecha_desde_str or not fecha_hasta_str:
            return Response(
                {"detail": "Los parámetros 'from' y 'to' son requeridos (formato YYYY-MM-DD)"},
                status=status.HTTP_400_BAD_REQUEST
            )

        fecha_desde = parse_date(fecha_desde_str)
        fecha_hasta = parse_date(fecha_hasta_str)

        if not fecha_desde or not fecha_hasta:
            return Response(
                {"detail": "Fechas inválidas. Usa formato YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar rango de fechas
        if fecha_desde > fecha_hasta:
            return Response(
                {"detail": "La fecha 'from' no puede ser posterior a 'to'"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Obtener agentes del equipo
        if request.user.is_admin():
            # Admin ve todos los agentes
            agentes = User.objects.filter(
                rol=get_estado('ROL_USUARIO', 'AGENTE'),
                is_active=True
            )
        else:
            # Coordinador ve solo sus equipos
            from apps.campaigns.models import Equipo

            equipos_coordinados = Equipo.objects.filter(
                coordinador=request.user,
                is_active=True
            )

            agentes_ids = []
            for equipo in equipos_coordinados:
                ids_equipo = equipo.agentes_detalle.values_list(
                    'agente_id', flat=True)
                agentes_ids.extend(ids_equipo)

            agentes_ids = list(set(agentes_ids))
            agentes = User.objects.filter(
                documento_id__in=agentes_ids,
                is_active=True
            )

        # Convertir fechas a datetime con timezone
        tz = timezone.get_current_timezone()
        inicio_dia = datetime.combine(fecha_desde, time.min).replace(tzinfo=tz)
        fin_dia = datetime.combine(fecha_hasta, time.max).replace(tzinfo=tz)

        # Obtener IDs de agentes
        agentes_ids_final = list(
            agentes.values_list('documento_id', flat=True))

        # KPI 1 y 2: Contar agentes por estado (tiempo real)
        estado_disponible = get_estado('ESTADO_AGENTE', 'DISPONIBLE')
        estado_en_llamada = get_estado('ESTADO_AGENTE', 'EN_LLAMADA')
        
        agentes_disponibles = 0
        llamadas_en_curso = 0
        
        for agente in agentes:
            try:
                if agente.estado_actual and agente.estado_actual.estado_id:
                    # Contar agentes disponibles
                    if agente.estado_actual.estado_id == estado_disponible:
                        agentes_disponibles += 1
                    # Contar llamadas activas (agentes en llamada)
                    elif agente.estado_actual.estado_id == estado_en_llamada:
                        llamadas_en_curso += 1
            except:
                pass

        # KPI 3, 4, 5: Llamadas en el rango de fechas
        llamadas = Llamada.objects.filter(
            agente_id__in=agentes_ids_final,
            fecha_hora_inicio__range=(inicio_dia, fin_dia)
        )

        # Total de llamadas realizadas
        llamadas_realizadas = llamadas.count()

        # Duración promedio de llamadas
        duracion_promedio = llamadas.filter(
            duracion__isnull=False
        ).aggregate(promedio=Avg('duracion'))['promedio'] or 0

        # Tasa de conversión (ventas / total llamadas)
        estado_no_venta_id = get_estado_id('ESTADO_VENTA', 'NO_VENTA')
        if estado_no_venta_id:
            ventas = llamadas.exclude(
                estado_venta_id=estado_no_venta_id).count()
        else:
            ventas = 0

        tasa_conversion = (ventas / llamadas_realizadas *
                           100) if llamadas_realizadas > 0 else 0

        # Respuesta
        return Response({
            "llamadas_en_curso": llamadas_en_curso,
            "agentes_disponibles": agentes_disponibles,
            "tiempo_promedio_llamada": round(duracion_promedio, 2),
            "llamadas_realizadas": llamadas_realizadas,
            "tasa_conversion": round(tasa_conversion, 2)
        })

    @action(detail=False, methods=['get'], url_path='campana/overview', permission_classes=[IsJefeCampana])
    def campana_overview(self, request):
        """
        Endpoint para Jefe de Campaña: Devuelve KPIs agregados de una campaña.
        Solo accesible para Jefes de Campaña y Admins.

        GET /api/kpis/campana/overview/?campana_id=1
        GET /api/kpis/campana/overview/?campana_id=1&fecha_desde=2025-10-01&fecha_hasta=2025-11-05

        Query params:
            campana_id: ID de la campaña (opcional si solo tiene una)
            fecha_desde: Fecha inicio del período (YYYY-MM-DD, opcional, por defecto: hoy)
            fecha_hasta: Fecha fin del período (YYYY-MM-DD, opcional, por defecto: hoy)

        Response:
            {
                "campana_id": 1,
                "campana_nombre": "Campaña Navidad 2025",
                "llamadas_activas": 3,
                "agentes_disponibles": 5,
                "tiempo_promedio_llamada": 180.5,
                "llamadas_del_dia": 150,
                "ventas_realizadas": 45,
                "tasa_conversion": 30.0,
                "fecha_consulta": "2025-11-05T15:30:00Z",
                "total_agentes": 15,
                "fecha_desde": "2025-11-01",
                "fecha_hasta": "2025-11-05"
            }
        """
        # ===========================
        # 1. OBTENER CAMPAÑA
        # ===========================
        campana_id = request.query_params.get('campana_id')

        # Si no envía campana_id, buscar su campaña automáticamente
        if not campana_id:
            if request.user.is_admin():
                return Response(
                    {"detail": "Los administradores deben especificar campana_id"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Buscar la campaña más reciente del jefe
            campana = Campana.objects.filter(
                jefe_campana=request.user,
                estado=get_estado('ESTADO_CAMPANA', 'ACTIVA')
            ).order_by('-fecha_inicio').first()

            if not campana:
                return Response(
                    {"detail": "No hay una campaña asignada en el momento"},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Validar que el jefe tenga acceso a esta campaña
            campana = get_object_or_404(Campana, pk=campana_id)

            if not request.user.is_admin():
                if campana.jefe_campana != request.user:
                    return Response(
                        {"detail": "No tienes permiso para ver KPIs de esta campaña"},
                        status=status.HTTP_403_FORBIDDEN
                    )

        # ===========================
        # 2. OBTENER AGENTES DE LA CAMPAÑA
        # ===========================
        # Los agentes están en equipos asignados a esta campaña
        equipos_campana = Equipo.objects.filter(
            campana=campana,
            is_active=True
        )

        # Obtener IDs de agentes de todos los equipos de esta campaña
        agentes_ids = []
        for equipo in equipos_campana:
            ids_equipo = equipo.agentes_detalle.values_list(
                'agente_id', flat=True)
            agentes_ids.extend(ids_equipo)

        # Eliminar duplicados
        agentes_ids = list(set(agentes_ids))

        if not agentes_ids:
            # Si no hay agentes, retornar KPIs en 0
            return Response({
                "campana_id": campana.pk,
                "campana_nombre": campana.nombre,
                "llamadas_activas": 0,
                "agentes_disponibles": 0,
                "tiempo_promedio_llamada": 0,
                "llamadas_del_dia": 0,
                "ventas_realizadas": 0,
                "tasa_conversion": 0,
                "fecha_consulta": timezone.now(),
                "total_agentes": 0
            })

        # Obtener objetos de agentes
        agentes = User.objects.filter(
            documento_id__in=agentes_ids,
            is_active=True
        )

        total_agentes = agentes.count()

        # ===========================
        # 3. KPI 1: LLAMADAS ACTIVAS
        # ===========================
        # Llamadas en curso (estado EN_CURSO) de esta campaña
        estado_en_curso = get_estado('ESTADO_LLAMADA', 'EN_CURSO')
        llamadas_activas = Llamada.objects.filter(
            agente_id__in=agentes_ids,
            cliente__campana=campana,
            estado_llamada=estado_en_curso
        ).count()

        # ===========================
        # 4. KPI 2: AGENTES DISPONIBLES
        # ===========================
        # Agentes con estado actual DISPONIBLE
        estado_disponible = get_estado('ESTADO_AGENTE', 'DISPONIBLE')
        agentes_disponibles = 0

        for agente in agentes:
            try:
                if hasattr(agente, 'estado_actual') and agente.estado_actual:
                    if agente.estado_actual.estado_id == estado_disponible:
                        agentes_disponibles += 1
            except:
                pass

        # ===========================
        # 5. RANGO DE FECHAS PARA KPIs
        # ===========================
        # Permitir filtrar por rango de fechas (opcional)
        # Si no se envía, usa el día actual por defecto
        from django.utils.dateparse import parse_date

        fecha_desde_str = request.query_params.get('fecha_desde')
        fecha_hasta_str = request.query_params.get('fecha_hasta')

        if fecha_desde_str and fecha_hasta_str:
            fecha_desde = parse_date(fecha_desde_str)
            fecha_hasta = parse_date(fecha_hasta_str)

            if not fecha_desde or not fecha_hasta:
                return Response(
                    {"detail": "Fechas inválidas. Usa formato YYYY-MM-DD"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if fecha_desde > fecha_hasta:
                return Response(
                    {"detail": "fecha_desde no puede ser posterior a fecha_hasta"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            # Por defecto: hoy
            hoy = date.today()
            fecha_desde = fecha_hasta = hoy

        # Convertir a datetime con timezone
        tz = timezone.get_current_timezone()
        inicio_periodo = timezone.datetime.combine(
            fecha_desde, timezone.datetime.min.time()).replace(tzinfo=tz)
        fin_periodo = timezone.datetime.combine(
            fecha_hasta, timezone.datetime.max.time()).replace(tzinfo=tz)

        # ===========================
        # 6. KPI 3: LLAMADAS DEL PERÍODO
        # ===========================
        llamadas_periodo = Llamada.objects.filter(
            agente_id__in=agentes_ids,
            cliente__campana=campana,
            fecha_hora_inicio__range=(inicio_periodo, fin_periodo)
        )

        llamadas_del_periodo = llamadas_periodo.count()

        # ===========================
        # 7. KPI 4: TIEMPO PROMEDIO DE LLAMADA
        # ===========================
        # Duración promedio de llamadas contestadas del período
        from django.db.models import Avg

        duracion_promedio = llamadas_periodo.filter(
            fue_contestada=True,
            duracion__isnull=False
        ).aggregate(promedio=Avg('duracion'))['promedio'] or 0

        # ===========================
        # 8. KPI 5 y 6: VENTAS Y TASA DE CONVERSIÓN
        # ===========================
        # Ventas realizadas en el período (excluir NO_VENTA)
        estado_no_venta_id = get_estado_id('ESTADO_VENTA', 'NO_VENTA')

        if estado_no_venta_id:
            ventas_periodo = llamadas_periodo.filter(
                fue_contestada=True
            ).exclude(estado_venta_id=estado_no_venta_id).count()
        else:
            ventas_periodo = 0

        # Llamadas contestadas del período (para calcular tasa de conversión)
        llamadas_contestadas_periodo = llamadas_periodo.filter(
            fue_contestada=True).count()

        # Tasa de conversión = (ventas / llamadas contestadas) * 100
        tasa_conversion = (ventas_periodo / llamadas_contestadas_periodo *
                           100) if llamadas_contestadas_periodo > 0 else 0

        # ===========================
        # 9. CONSTRUIR RESPUESTA
        # ===========================
        return Response({
            "campana_id": campana.pk,
            "campana_nombre": campana.nombre,
            "llamadas_activas": llamadas_activas,
            "agentes_disponibles": agentes_disponibles,
            "tiempo_promedio_llamada": round(duracion_promedio, 2),
            "llamadas_del_dia": llamadas_del_periodo,
            "ventas_realizadas": ventas_periodo,
            "tasa_conversion": round(tasa_conversion, 2),
            "fecha_consulta": timezone.now(),
            "total_agentes": total_agentes,
            "fecha_desde": fecha_desde.isoformat(),
            "fecha_hasta": fecha_hasta.isoformat()
        })

    @action(detail=False, methods=['get'], url_path='coordinador/overview', permission_classes=[IsCoordinador])
    def coordinador_overview(self, request):
        """
        Endpoint para coordinadores: Devuelve KPIs agregados de su equipo.
        Solo accesible para Coordinadores y Admins.

        GET /api/kpis/coordinador/overview/
        GET /api/kpis/coordinador/overview/?fecha_desde=2025-11-01&fecha_hasta=2025-11-08

        Query params:
            fecha_desde: Fecha inicio (YYYY-MM-DD), opcional (default: hoy)
            fecha_hasta: Fecha fin (YYYY-MM-DD), opcional (default: hoy)

        Response (ver KPICoordinadorSerializer para estructura completa):
            {
                "coordinador_id": "123456789",
                "coordinador_nombre": "Juan Pérez",
                "total_equipos": 2,
                "llamadas_activas": 5,
                "estados_equipo": {"DISPONIBLE": 3, "EN_LLAMADA": 5, ...},
                "tiempo_promedio_llamada": 180.5,
                "llamadas_del_periodo": 150,
                "ventas_realizadas": 45,
                "tasa_conversion": 30.0,
                "ranking_agentes": [...],
                "total_agentes": 15,
                "fecha_desde": "2025-11-08",
                "fecha_hasta": "2025-11-08",
                "fecha_consulta": "2025-11-08T15:30:00Z"
            }
        """
        # ===========================
        # 1. PARSEAR Y VALIDAR FECHAS
        # ===========================
        fecha_desde_str = request.query_params.get('fecha_desde')
        fecha_hasta_str = request.query_params.get('fecha_hasta')

        hoy = date.today()

        # Si no envía fechas, usar el día actual
        if not fecha_desde_str and not fecha_hasta_str:
            fecha_desde = fecha_hasta = hoy
        elif fecha_desde_str and fecha_hasta_str:
            fecha_desde = parse_date(fecha_desde_str)
            fecha_hasta = parse_date(fecha_hasta_str)

            if not fecha_desde or not fecha_hasta:
                return Response(
                    {"detail": "Fechas inválidas. Usa formato YYYY-MM-DD"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            return Response(
                {"detail": "Debes enviar ambas fechas (fecha_desde y fecha_hasta) o ninguna"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar que fecha_desde no sea futura
        if fecha_desde > hoy:
            return Response(
                {"detail": "No se pueden elegir fechas futuras (fecha_desde)"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Si fecha_hasta es futura, ajustarla a hoy
        if fecha_hasta > hoy:
            fecha_hasta = hoy

        # Validar rango de fechas (Criterio 3.4)
        if fecha_desde > fecha_hasta:
            return Response(
                {"detail": "La fecha inicial no puede ser mayor a la fecha posterior"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ===========================
        # 2. OBTENER EQUIPOS DEL COORDINADOR
        # ===========================
        coordinador = request.user

        if coordinador.is_admin():
            # Admin ve todos los equipos (opcional: podrías limitarlo)
            equipos = Equipo.objects.filter(is_active=True)
        else:
            # Coordinador ve solo sus equipos activos
            equipos = Equipo.objects.filter(
                coordinador=coordinador,
                is_active=True
            )

        if not equipos.exists():
            return Response(
                {"detail": "No tienes equipos asignados"},
                status=status.HTTP_404_NOT_FOUND
            )

        # ===========================
        # 3. OBTENER AGENTES DE LOS EQUIPOS
        # ===========================
        agentes_ids = []
        for equipo in equipos:
            ids_equipo = equipo.agentes_detalle.values_list('agente_id', flat=True)
            agentes_ids.extend(ids_equipo)

        # Eliminar duplicados (un agente podría estar en múltiples equipos en el pasado)
        agentes_ids = list(set(agentes_ids))

        if not agentes_ids:
            # Si no hay agentes, retornar KPIs en 0
            return Response({
                "coordinador_id": coordinador.documento_id,
                "coordinador_nombre": coordinador.full_name,
                "total_equipos": equipos.count(),
                "llamadas_activas": 0,
                "estados_equipo": {},
                "tiempo_promedio_llamada": 0,
                "llamadas_del_periodo": 0,
                "ventas_realizadas": 0,
                "tasa_conversion": 0,
                "ranking_agentes": [],
                "total_agentes": 0,
                "fecha_desde": fecha_desde.isoformat(),
                "fecha_hasta": fecha_hasta.isoformat(),
                "fecha_consulta": timezone.now()
            })

        # Obtener objetos de agentes
        agentes = User.objects.filter(
            documento_id__in=agentes_ids,
            is_active=True
        )

        total_agentes = agentes.count()

        # ===========================
        # 4. KPI 1: LLAMADAS ACTIVAS (Tiempo Real)
        # KPI 2: DESGLOSE DE ESTADOS DEL EQUIPO (Tiempo Real)
        # ===========================
        # Diccionario para contar estados
        estados_equipo = {}
        agentes_disponibles = 0
        llamadas_activas = 0

        # Obtener estados relevantes
        estado_disponible = get_estado('ESTADO_AGENTE', 'DISPONIBLE')
        estado_en_llamada = get_estado('ESTADO_AGENTE', 'EN_LLAMADA')

        # Iterar sobre cada agente y obtener su estado actual
        for agente in agentes:
            try:
                if hasattr(agente, 'estado_actual') and agente.estado_actual:
                    estado_valor = agente.estado_actual.estado_id.valor if agente.estado_actual.estado_id else 'SIN_ESTADO'
                    
                    # Contar agentes disponibles
                    if agente.estado_actual.estado_id == estado_disponible:
                        agentes_disponibles += 1
                    
                    # Contar llamadas activas (agentes en estado EN_LLAMADA)
                    if agente.estado_actual.estado_id == estado_en_llamada:
                        llamadas_activas += 1
                else:
                    estado_valor = 'SIN_ESTADO'

                # Incrementar contador
                if estado_valor in estados_equipo:
                    estados_equipo[estado_valor] += 1
                else:
                    estados_equipo[estado_valor] = 1
            except:
                # Si falla, contar como sin estado
                if 'SIN_ESTADO' in estados_equipo:
                    estados_equipo['SIN_ESTADO'] += 1
                else:
                    estados_equipo['SIN_ESTADO'] = 1

        # ===========================
        # 6. CONVERTIR FECHAS A DATETIME CON TIMEZONE
        # ===========================
        tz = timezone.get_current_timezone()
        inicio_periodo = datetime.combine(fecha_desde, time.min).replace(tzinfo=tz)
        fin_periodo = datetime.combine(fecha_hasta, time.max).replace(tzinfo=tz)

        # ===========================
        # 7. FILTRAR LLAMADAS DEL PERÍODO
        # ===========================
        llamadas_periodo = Llamada.objects.filter(
            agente_id__in=agentes_ids,
            fecha_hora_inicio__range=(inicio_periodo, fin_periodo)
        )

        # ===========================
        # 8. KPI 3: LLAMADAS DEL PERÍODO
        # ===========================
        llamadas_del_periodo = llamadas_periodo.count()

        # ===========================
        # 9. KPI 4: TIEMPO PROMEDIO DE LLAMADA
        # ===========================
        duracion_promedio = llamadas_periodo.filter(
            fue_contestada=True,
            duracion__isnull=False
        ).aggregate(promedio=Avg('duracion'))['promedio'] or 0

        # ===========================
        # 10. KPI 5: VENTAS REALIZADAS
        # ===========================
        estado_no_venta_id = get_estado_id('ESTADO_VENTA', 'NO_VENTA')

        if estado_no_venta_id:
            ventas_periodo = llamadas_periodo.filter(
                fue_contestada=True
            ).exclude(estado_venta_id=estado_no_venta_id).count()
        else:
            ventas_periodo = 0

        # ===========================
        # 11. KPI 6: TASA DE CONVERSIÓN
        # ===========================
        llamadas_contestadas_periodo = llamadas_periodo.filter(
            fue_contestada=True).count()
        tasa_conversion = (ventas_periodo / llamadas_contestadas_periodo *
                        100) if llamadas_contestadas_periodo > 0 else 0

        # ===========================
        # 12. KPI 7: RANKING DE AGENTES POR VENTAS
        # ===========================
        # Agrupar llamadas por agente y contar ventas
        from django.db.models import Count

        ranking_data = llamadas_periodo.filter(
            fue_contestada=True
        ).exclude(
            estado_venta_id=estado_no_venta_id
        ).values(
            'agente_id'
        ).annotate(
            total_ventas=Count('id')
        ).order_by('-total_ventas')

        # Construir lista de ranking con información del agente
        ranking_agentes = []
        for item in ranking_data:
            try:
                agente = User.objects.get(documento_id=item['agente_id'])
                ranking_agentes.append({
                    'agente_id': agente.documento_id,
                    'agente_nombre': agente.full_name,
                    'ventas': item['total_ventas']
                })
            except User.DoesNotExist:
                pass

        # ===========================
        # 13. CONSTRUIR RESPUESTA
        # ===========================
        return Response({
            "coordinador_id": coordinador.documento_id,
            "coordinador_nombre": coordinador.full_name,
            "total_equipos": equipos.count(),
            "llamadas_activas": llamadas_activas,
            "agentes_disponibles": agentes_disponibles,
            "estados_equipo": estados_equipo,
            "tiempo_promedio_llamada": round(duracion_promedio, 2),
            "llamadas_del_periodo": llamadas_del_periodo,
            "ventas_realizadas": ventas_periodo,
            "tasa_conversion": round(tasa_conversion, 2),
            "ranking_agentes": ranking_agentes,
            "total_agentes": total_agentes,
            "fecha_desde": fecha_desde.isoformat(),
            "fecha_hasta": fecha_hasta.isoformat(),
            "fecha_consulta": timezone.now()
        })
        
    @action(detail=False, methods=['get'], url_path='jefe-campana/equipos', permission_classes=[IsJefeCampana])
    def equipos_campana_list(self, request):
        """
        Endpoint para Jefe de Campaña: Lista equipos de su campaña.
        Solo accesible para Jefes de Campaña y Admins.

        GET /api/kpis/jefe-campana/equipos/?campana_id=1&page=1&page_size=10

        Query params:
            campana_id: ID de la campaña (opcional si solo tiene una)
            page: Número de página (default: 1)
            page_size: Registros por página (default: 10, máx: 50)

        Response (lista paginada):
            {
                "count": 25,
                "next": "http://.../api/kpis/jefe-campana/equipos/?page=2",
                "previous": null,
                "results": [
                    {
                        "equipo_id": 1,
                        "nombre": "Equipo Alpha",
                        "coordinador_id": "123456",
                        "coordinador_nombre": "Juan Pérez",
                        "total_agentes": 8,
                        "campana_nombre": "Campaña Navidad"
                    },
                    ...
                ]
            }
        """
        
        # ===========================
        # 1. OBTENER CAMPAÑA
        # ===========================
        campana_id = request.query_params.get('campana_id')
        
        if not campana_id:
            if request.user.is_admin():
                return Response(
                    {"detail": "Los administradores deben especificar campana_id"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Buscar la campaña más reciente del jefe que tenga equipos activos
            campanas_activas = Campana.objects.filter(
                jefe_campana=request.user,
                estado=get_estado('ESTADO_CAMPANA', 'ACTIVA')
            ).order_by('-fecha_inicio')
            
            # Filtrar campañas que tengan al menos un equipo activo
            campana = None
            for c in campanas_activas:
                if Equipo.objects.filter(campana=c, is_active=True).exists():
                    campana = c
                    break
            
            if not campana:
                return Response(
                    {"detail": "No hay una campaña con equipos asignados en el momento"},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Validar que el jefe tenga acceso a esta campaña
            campana = get_object_or_404(Campana, pk=campana_id)
            
            if not request.user.is_admin():
                if campana.jefe_campana != request.user:
                    return Response(
                        {"detail": "No tienes permiso para ver equipos de esta campaña"},
                        status=status.HTTP_403_FORBIDDEN
                    )
        
        # ===========================
        # 2. OBTENER EQUIPOS DE LA CAMPAÑA
        # ===========================
        equipos = Equipo.objects.filter(
            campana=campana,
            is_active=True
        ).select_related('coordinador', 'campana').prefetch_related('agentes_detalle')
        
        # ===========================
        # 3. PREPARAR DATOS PARA SERIALIZER
        # ===========================
        equipos_data = []
        for equipo in equipos:
            coordinador_nombre = None
            coordinador_id = None
            
            if equipo.coordinador:
                coordinador_nombre = equipo.coordinador.get_full_name()
                coordinador_id = equipo.coordinador.documento_id
            
            equipos_data.append({
                'equipo_id': equipo.equipo_id,
                'nombre': equipo.nombre,
                'coordinador_id': coordinador_id,
                'coordinador_nombre': coordinador_nombre,
                'total_agentes': equipo.agentes_detalle.count(),
                'campana_nombre': campana.nombre
            })
        
        # ===========================
        # 4. PAGINACIÓN (criterio 2.3: 10 registros)
        # ===========================
        paginator = PageNumberPagination()
        paginator.page_size = int(request.query_params.get('page_size', 10))
        paginator.max_page_size = 50
        
        page = paginator.paginate_queryset(equipos_data, request)
        
        if page is not None:
            return paginator.get_paginated_response(page)
        
        return Response(equipos_data)

    @action(detail=False, methods=['get'], url_path='jefe-campana/equipos/(?P<equipo_id>[^/.]+)/detalle', permission_classes=[IsJefeCampana])
    def equipo_detalle_kpis(self, request, equipo_id=None):
        """
        Endpoint para Jefe de Campaña: KPIs detallados de un equipo.
        Solo accesible para Jefes de Campaña y Admins.

        GET /api/kpis/jefe-campana/equipos/<equipo_id>/detalle/?fecha_desde=2025-11-01&fecha_hasta=2025-11-08

        Query params:
            fecha_desde: Fecha inicio (YYYY-MM-DD), opcional (default: hoy)
            fecha_hasta: Fecha fin (YYYY-MM-DD), opcional (default: hoy)

        Response (ver KPIEquipoSerializer):
            {
                "equipo_id": 1,
                "equipo_nombre": "Equipo Alpha",
                "campana_id": 5,
                "campana_nombre": "Campaña Navidad",
                "llamadas_activas": 3,
                "agentes_disponibles": 5,
                "tiempo_promedio_llamada": 180.5,
                "llamadas_del_dia": 120,
                "ventas_realizadas": 35,
                "tasa_conversion": 29.17,
                "total_agentes": 10,
                "coordinador_nombre": "Juan Pérez",
                "fecha_desde": "2025-11-08",
                "fecha_hasta": "2025-11-08",
                "fecha_consulta": "2025-11-08T15:30:00Z"
            }
        """
        # ===========================
        # 1. OBTENER Y VALIDAR EQUIPO
        # ===========================
        equipo = get_object_or_404(Equipo, equipo_id=equipo_id, is_active=True)
        
        # Validar que el jefe tenga acceso a este equipo
        if not request.user.is_admin():
            if not equipo.campana or equipo.campana.jefe_campana != request.user:
                return Response(
                    {"detail": "No tienes permiso para ver KPIs de este equipo"},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # ===========================
        # 2. PARSEAR Y VALIDAR FECHAS
        # ===========================
        fecha_desde_str = request.query_params.get('fecha_desde')
        fecha_hasta_str = request.query_params.get('fecha_hasta')
        
        hoy = date.today()
        
        # Si no envía fechas, usar el día actual
        if not fecha_desde_str and not fecha_hasta_str:
            fecha_desde = fecha_hasta = hoy
        elif fecha_desde_str and fecha_hasta_str:
            fecha_desde = parse_date(fecha_desde_str)
            fecha_hasta = parse_date(fecha_hasta_str)
            
            if not fecha_desde or not fecha_hasta:
                return Response(
                    {"detail": "Fechas inválidas. Usa formato YYYY-MM-DD"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            return Response(
                {"detail": "Debes enviar ambas fechas (fecha_desde y fecha_hasta) o ninguna"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validar que la fecha inicial no sea futura
        if fecha_desde > hoy:
            return Response(
                {"detail": "La fecha inicial no puede ser futura"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validar rango de fechas
        if fecha_desde > fecha_hasta:
            return Response(
                {"detail": "La fecha inicial no puede ser mayor a la fecha posterior"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Si fecha_hasta es futura, ajustarla a hoy para los cálculos
        if fecha_hasta > hoy:
            fecha_hasta = hoy
        
        # ===========================
        # 3. OBTENER AGENTES DEL EQUIPO
        # ===========================
        agentes_ids = list(equipo.agentes_detalle.values_list('agente_id', flat=True))
        
        if not agentes_ids:
            # Si no hay agentes, retornar KPIs en 0
            return Response({
                "equipo_id": equipo.equipo_id,
                "equipo_nombre": equipo.nombre,
                "campana_id": equipo.campana.pk if equipo.campana else None,
                "campana_nombre": equipo.campana.nombre if equipo.campana else "Sin campaña",
                "llamadas_activas": 0,
                "agentes_disponibles": 0,
                "tiempo_promedio_llamada": 0,
                "llamadas_del_dia": 0,
                "ventas_realizadas": 0,
                "tasa_conversion": 0,
                "total_agentes": 0,
                "coordinador_nombre": equipo.coordinador.get_full_name() if equipo.coordinador else None,
                "fecha_desde": fecha_desde.isoformat(),
                "fecha_hasta": fecha_hasta.isoformat(),
                "fecha_consulta": timezone.now()
            })
        
        # Obtener objetos de agentes
        agentes = User.objects.filter(
            documento_id__in=agentes_ids,
            is_active=True
        )
        
        total_agentes = agentes.count()
        
        # ===========================
        # 4. KPI 1: LLAMADAS ACTIVAS (Tiempo Real)
        # ===========================
        # Contar agentes en estado EN_LLAMADA
        estado_en_llamada = get_estado('ESTADO_AGENTE', 'EN_LLAMADA')
        llamadas_activas = 0
        
        for agente in agentes:
            try:
                if hasattr(agente, 'estado_actual') and agente.estado_actual:
                    if agente.estado_actual.estado_id == estado_en_llamada:
                        llamadas_activas += 1
            except:
                pass
        
        # ===========================
        # 5. KPI 2: AGENTES DISPONIBLES (Tiempo Real)
        # ===========================
        estado_disponible = get_estado('ESTADO_AGENTE', 'DISPONIBLE')
        agentes_disponibles = 0
        
        for agente in agentes:
            try:
                if hasattr(agente, 'estado_actual') and agente.estado_actual:
                    if agente.estado_actual.estado_id == estado_disponible:
                        agentes_disponibles += 1
            except:
                pass
        
        # ===========================
        # 6. CONVERTIR FECHAS A DATETIME CON TIMEZONE
        # ===========================
        tz = timezone.get_current_timezone()
        inicio_periodo = datetime.combine(fecha_desde, time.min).replace(tzinfo=tz)
        fin_periodo = datetime.combine(fecha_hasta, time.max).replace(tzinfo=tz)
        
        # ===========================
        # 7. FILTRAR LLAMADAS DEL PERÍODO
        # ===========================
        llamadas_periodo = Llamada.objects.filter(
            agente_id__in=agentes_ids,
            fecha_hora_inicio__range=(inicio_periodo, fin_periodo)
        )
        
        # ===========================
        # 8. KPI 4: LLAMADAS DEL DÍA/PERÍODO
        # ===========================
        llamadas_del_periodo = llamadas_periodo.count()
        
        # ===========================
        # 9. KPI 3: TIEMPO PROMEDIO DE LLAMADA
        # ===========================
        duracion_promedio = llamadas_periodo.filter(
            fue_contestada=True,
            duracion__isnull=False
        ).aggregate(promedio=Avg('duracion'))['promedio'] or 0
        
        # ===========================
        # 10. KPI 5: VENTAS REALIZADAS
        # ===========================
        estado_no_venta_id = get_estado_id('ESTADO_VENTA', 'NO_VENTA')
        
        if estado_no_venta_id:
            ventas_periodo = llamadas_periodo.filter(
                fue_contestada=True
            ).exclude(estado_venta_id=estado_no_venta_id).count()
        else:
            ventas_periodo = 0
        
        # ===========================
        # 11. KPI 6: TASA DE CONVERSIÓN
        # ===========================
        llamadas_contestadas_periodo = llamadas_periodo.filter(fue_contestada=True).count()
        tasa_conversion = (ventas_periodo / llamadas_contestadas_periodo * 100) if llamadas_contestadas_periodo > 0 else 0
        
        # ===========================
        # 12. CONSTRUIR RESPUESTA
        # ===========================
        return Response({
            "equipo_id": equipo.equipo_id,
            "equipo_nombre": equipo.nombre,
            "campana_id": equipo.campana.pk if equipo.campana else None,
            "campana_nombre": equipo.campana.nombre if equipo.campana else "Sin campaña",
            "llamadas_activas": llamadas_activas,
            "agentes_disponibles": agentes_disponibles,
            "tiempo_promedio_llamada": round(duracion_promedio, 2),
            "llamadas_del_dia": llamadas_del_periodo,
            "ventas_realizadas": ventas_periodo,
            "tasa_conversion": round(tasa_conversion, 2),
            "total_agentes": total_agentes,
            "coordinador_nombre": equipo.coordinador.get_full_name() if equipo.coordinador else None,
            "fecha_desde": fecha_desde.isoformat(),
            "fecha_hasta": fecha_hasta.isoformat(),
            "fecha_consulta": timezone.now()
        })
    
    @action(detail=False, methods=['get'], url_path='coordinador/exportar-pdf', permission_classes=[IsCoordinador])
    def exportar_kpis_pdf(self, request):
        """
        Endpoint para exportar KPIs del equipo a PDF.
        Solo accesible para Coordinadores.
        
        GET /api/kpis/coordinador/exportar-pdf/
        GET /api/kpis/coordinador/exportar-pdf/?fecha_desde=2025-11-01&fecha_hasta=2025-11-08
        
        Query params:
            fecha_desde: Fecha inicio (YYYY-MM-DD), opcional (default: hoy)
            fecha_hasta: Fecha fin (YYYY-MM-DD), opcional (default: hoy)
        
        Response:
            Archivo PDF descargable con todos los KPIs del equipo
        """
        # ===========================
        # 1. OBTENER DATOS DE KPI
        # ===========================
        fecha_desde_str = request.query_params.get('fecha_desde')
        fecha_hasta_str = request.query_params.get('fecha_hasta')

        hoy = date.today()

        if not fecha_desde_str and not fecha_hasta_str:
            fecha_desde = fecha_hasta = hoy
        elif fecha_desde_str and fecha_hasta_str:
            fecha_desde = parse_date(fecha_desde_str)
            fecha_hasta = parse_date(fecha_hasta_str)
            if not fecha_desde or not fecha_hasta:
                return Response(
                    {"detail": "Fechas inválidas. Usa formato YYYY-MM-DD"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            return Response(
                {"detail": "Debes enviar ambas fechas o ninguna"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar que fecha_desde no sea futura
        if fecha_desde > hoy:
            return Response(
                {"detail": "No se pueden elegir fechas futuras (fecha_desde)"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Si fecha_hasta es futura, ajustarla a hoy
        if fecha_hasta > hoy:
            fecha_hasta = hoy

        if fecha_desde > fecha_hasta:
            return Response(
                {"detail": "La fecha inicial no puede ser mayor a la fecha posterior"},
                status=status.HTTP_400_BAD_REQUEST
            )

        coordinador = request.user

        # Obtener equipos
        if coordinador.is_admin():
            equipos = Equipo.objects.filter(is_active=True)
        else:
            equipos = Equipo.objects.filter(coordinador=coordinador, is_active=True)

        if not equipos.exists():
            return Response(
                {"detail": "No tienes equipos asignados"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Obtener agentes
        agentes_ids = []
        for equipo in equipos:
            ids_equipo = equipo.agentes_detalle.values_list('agente_id', flat=True)
            agentes_ids.extend(ids_equipo)

        agentes_ids = list(set(agentes_ids))
        agentes = User.objects.filter(documento_id__in=agentes_ids, is_active=True)
        total_agentes = agentes.count()

        # Calcular tiempo promedio por estado usando EstadoAgenteDetalle
        from apps.users.models import EstadoAgenteDetalle
        import logging
        logger = logging.getLogger(__name__)
        
        # Obtener tiempos promedio por estado en el período
        estados_tiempo_promedio = {}
        
        # Primero, verificar qué estados existen en el período
        # agente_id es la FK, así que filtramos directamente con los objetos User
        registros_estados = EstadoAgenteDetalle.objects.filter(
            agente_id__in=agentes,
            fecha__range=(fecha_desde, fecha_hasta)
        ).select_related('estado_id')
        
        logger.info(f"Total registros encontrados: {registros_estados.count()}")
        
        # Agrupar manualmente por estado
        estados_agrupados = {}
        registros_procesados = 0
        registros_con_tiempo_cero = 0
        
        for registro in registros_estados:
            logger.info(f"Registro: agente={registro.agente_id.documento_id}, estado={registro.estado_id.valor if registro.estado_id else 'None'}, tiempo={registro.tiempo}")
            
            if registro.estado_id and registro.estado_id.valor:
                estado_nombre = registro.estado_id.valor
                if estado_nombre not in estados_agrupados:
                    estados_agrupados[estado_nombre] = []
                
                # Convertir tiempo HH:MM:SS a segundos
                try:
                    if registro.tiempo:
                        h, m, s = map(int, registro.tiempo.split(':'))
                        segundos = h * 3600 + m * 60 + s
                        estados_agrupados[estado_nombre].append(segundos)
                        registros_procesados += 1
                        if segundos == 0:
                            registros_con_tiempo_cero += 1
                        logger.info(f"  -> Agregado: {segundos} segundos")
                except Exception as e:
                    logger.error(f"Error convirtiendo tiempo {registro.tiempo}: {e}")
                    pass
        
        logger.info(f"Registros procesados: {registros_procesados}, con tiempo cero: {registros_con_tiempo_cero}")
        
        # Calcular promedios (incluir estados con tiempo 0)
        for estado_nombre, tiempos in estados_agrupados.items():
            if tiempos:
                promedio_segundos = sum(tiempos) / len(tiempos)
                estados_tiempo_promedio[estado_nombre] = promedio_segundos
                logger.info(f"Estado {estado_nombre}: {len(tiempos)} registros, promedio: {promedio_segundos} seg")

        # Filtrar llamadas del período
        tz = timezone.get_current_timezone()
        inicio_periodo = datetime.combine(fecha_desde, time.min).replace(tzinfo=tz)
        fin_periodo = datetime.combine(fecha_hasta, time.max).replace(tzinfo=tz)

        llamadas_periodo = Llamada.objects.filter(
            agente_id__in=agentes_ids,
            fecha_hora_inicio__range=(inicio_periodo, fin_periodo)
        )

        llamadas_del_periodo = llamadas_periodo.count()

        duracion_promedio = llamadas_periodo.filter(
            fue_contestada=True,
            duracion__isnull=False
        ).aggregate(promedio=Avg('duracion'))['promedio'] or 0

        estado_no_venta_id = get_estado_id('ESTADO_VENTA', 'NO_VENTA')
        if estado_no_venta_id:
            ventas_periodo = llamadas_periodo.filter(
                fue_contestada=True
            ).exclude(estado_venta_id=estado_no_venta_id).count()
        else:
            ventas_periodo = 0

        llamadas_contestadas_periodo = llamadas_periodo.filter(fue_contestada=True).count()
        tasa_conversion = (ventas_periodo / llamadas_contestadas_periodo * 100) if llamadas_contestadas_periodo > 0 else 0

        # Ranking de agentes
        ranking_data = llamadas_periodo.filter(
            fue_contestada=True
        ).exclude(
            estado_venta_id=estado_no_venta_id
        ).values(
            'agente_id'
        ).annotate(
            total_ventas=Count('id')
        ).order_by('-total_ventas')

        ranking_agentes = []
        for item in ranking_data:
            try:
                agente = User.objects.get(documento_id=item['agente_id'])
                ranking_agentes.append({
                    'nombre': agente.full_name,
                    'ventas': item['total_ventas']
                })
            except User.DoesNotExist:
                pass

        # ===========================
        # 2. GENERAR PDF
        # ===========================
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=18)
        
        # Estilos
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=20,
            textColor=colors.HexColor('#1a365d'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#2d3748'),
            spaceAfter=12,
            spaceBefore=12
        )
        
        # Contenido del PDF
        elements = []
        
        # Logo y Título alineados horizontalmente
        from reportlab.platypus import Image as RLImage
        from django.conf import settings
        import os
        
        logo_added = False
        logo_paths = [
            './frontend/public/call-center-service-blue.png',
        ]
        
        # Intentar cargar el logo
        logo_img = None
        for logo_path in logo_paths:
            try:
                full_path = os.path.join(settings.BASE_DIR.parent if hasattr(settings.BASE_DIR, 'parent') else settings.BASE_DIR, logo_path)
                if os.path.exists(full_path):
                    logo_img = RLImage(full_path, width=0.6*inch, height=0.6*inch)
                    logo_added = True
                    break
            except:
                continue
        
        # Crear tabla con logo y título alineados y centrados
        if logo_added and logo_img:
            header_data = [[logo_img, Paragraph("Reporte de KPIs del Equipo", title_style)]]
            header_table = Table(header_data, colWidths=[0.8*inch, 4*inch])
            header_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
            ]))
            elements.append(header_table)
        else:
            # Si no hay logo, solo el título
            elements.append(Paragraph("Reporte de KPIs del Equipo", title_style))
        
        elements.append(Spacer(1, 0.3 * inch))
        
        # Información del coordinador y período (SIN Total Equipos)
        info_data = [
            ['Coordinador:', coordinador.full_name],
            ['Total Agentes:', str(total_agentes)],
            ['Período:', f"{fecha_desde.strftime('%d/%m/%Y')} - {fecha_hasta.strftime('%d/%m/%Y')}"],
            ['Fecha de Reporte:', timezone.now().strftime('%d/%m/%Y %H:%M:%S')]
        ]
        
        info_table = Table(info_data, colWidths=[2*inch, 4*inch])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e2e8f0')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey)
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 0.3 * inch))
        
        # KPIs Principales (SIN Llamadas Activas)
        elements.append(Paragraph("Indicadores Principales", heading_style))
        
        kpis_data = [
            ['KPI', 'Valor'],
            ['Llamadas del Período', str(llamadas_del_periodo)],
            ['Tiempo Promedio de Llamada', f"{round(duracion_promedio, 2)} seg"],
            ['Ventas Realizadas', str(ventas_periodo)],
            ['Tasa de Conversión', f"{round(tasa_conversion, 2)}%"]
        ]
        
        kpis_table = Table(kpis_data, colWidths=[3.5*inch, 2.5*inch])
        kpis_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2d3748')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey)
        ]))
        elements.append(kpis_table)
        elements.append(Spacer(1, 0.3 * inch))
        
        # Tiempo Promedio por Estado (en lugar de cantidad de agentes)
        elements.append(Paragraph("Tiempo Promedio por Estado", heading_style))
        
        # Mapeo de estados técnicos a nombres amigables
        estados_nombres = {
            'DISPONIBLE': 'Disponible',
            'EN_LLAMADA': 'En Llamada',
            'AFTERCALL': 'After Call',
            'BREAK': 'Break',
            'ALMUERZO': 'Almuerzo',
            'CAPACITACION': 'Capacitación',
            'BAÑO': 'Baño',
            'NO_DISPONIBLE': 'No Disponible',
            'DESCONECTADO': 'Desconectado'
        }
        
        estados_data = [['Estado', 'Tiempo Promedio']]
        if estados_tiempo_promedio:
            for estado, segundos_promedio in sorted(estados_tiempo_promedio.items(), key=lambda x: x[1], reverse=True):
                # Convertir segundos a formato legible
                horas = int(segundos_promedio // 3600)
                minutos = int((segundos_promedio % 3600) // 60)
                segundos = int(segundos_promedio % 60)
                
                if horas > 0:
                    tiempo_str = f"{horas}h {minutos}m {segundos}s"
                elif minutos > 0:
                    tiempo_str = f"{minutos}m {segundos}s"
                else:
                    tiempo_str = f"{segundos}s"
                
                # Usar nombre amigable si existe, sino usar el original
                estado_amigable = estados_nombres.get(estado, estado.replace('_', ' ').title())
                estados_data.append([estado_amigable, tiempo_str])
        else:
            estados_data.append(['No hay datos de estados en este período', '-'])
        
        estados_table = Table(estados_data, colWidths=[3.5*inch, 2.5*inch])
        estados_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2d3748')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey)
        ]))
        elements.append(estados_table)
        elements.append(Spacer(1, 0.3 * inch))
        
        # Ranking de Agentes
        if ranking_agentes:
            elements.append(Paragraph("Ranking de Agentes por Ventas", heading_style))
            
            ranking_table_data = [['Posición', 'Agente', 'Ventas']]
            for i, agente_rank in enumerate(ranking_agentes[:10], 1):  # Top 10
                ranking_table_data.append([
                    str(i),
                    agente_rank['nombre'],
                    str(agente_rank['ventas'])
                ])
            
            ranking_table = Table(ranking_table_data, colWidths=[1*inch, 3.5*inch, 1.5*inch])
            ranking_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2d3748')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (0, -1), 'CENTER'),
                ('ALIGN', (1, 0), (1, -1), 'LEFT'),
                ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
                ('TOPPADDING', (0, 0), (-1, -1), 10),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ]))
            elements.append(ranking_table)
        
        # Construir PDF
        doc.build(elements)
        
        # Preparar respuesta HTTP
        buffer.seek(0)
        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        filename = f"KPIs_Equipo_{coordinador.documento_id}_{fecha_desde.strftime('%Y%m%d')}_{fecha_hasta.strftime('%Y%m%d')}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response
    

    @action(detail=False, methods=['get'], url_path='jefe-centro/campanas', permission_classes=[IsJefeCentro])
    def campanas_jefe_centro(self, request):
        jefe_centro = request.user

        # Obtener el centro donde este jefe trabaja
        centro = Centro.objects.filter(jefe_centro=jefe_centro).first()

        if not centro:
            return Response(
                {"detail": "No tienes un centro asignado"},
                status=status.HTTP_404_NOT_FOUND
            )
        fecha_desde_str = request.query_params.get('fecha_desde')
        fecha_hasta_str = request.query_params.get('fecha_hasta')

        hoy = date.today()

        # Si no envía fechas, usar el día actual por defecto
        if not fecha_desde_str and not fecha_hasta_str:
            fecha_desde = fecha_hasta = hoy
        elif fecha_desde_str and fecha_hasta_str:
            fecha_desde = parse_date(fecha_desde_str)
            fecha_hasta = parse_date(fecha_hasta_str)
            
            if not fecha_desde or not fecha_hasta:
                return Response(
                    {"detail": "Fechas inválidas. Usa formato YYYY-MM-DD"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            return Response(
                {"detail": "Debes enviar ambas fechas o ninguna"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Validar que fecha_desde no sea futura
        if fecha_desde > hoy:
            return Response(
                {"detail": "No se pueden elegir fechas futuras (fecha_desde)"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Si fecha_hasta es futura, ajustarla a hoy
        if fecha_hasta > hoy:
            fecha_hasta = hoy

        # Validar rango de fechas
        if fecha_desde > fecha_hasta:
            return Response(
                {"detail": "La fecha inicial no puede ser mayor a la fecha posterior"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        estado_activa = get_estado('ESTADO_CAMPANA', 'ACTIVA')

        # Filtrar campañas activas del centro
        campanas = Campana.objects.filter(
            centro=centro,
            estado=estado_activa
        )

        # Si se especifica una campaña, filtrar solo esa
        campana_id = request.query_params.get('campana_id')
        if campana_id:
            campanas = campanas.filter(pk=campana_id)

        if not campanas.exists():
            return Response({
                "mensaje": "No hay campañas activas en el momento",
                "campanas": []
            })
            
        tz = timezone.get_current_timezone()
        inicio_periodo = datetime.combine(fecha_desde, time.min).replace(tzinfo=tz)
        fin_periodo = datetime.combine(fecha_hasta, time.max).replace(tzinfo=tz)
        
        campanas_data = []

        for campana in campanas:
            # 8.1: Obtener agentes de la campaña
            equipos_campana = Equipo.objects.filter(
                campana=campana,
                is_active=True
            )
            
            agentes_ids = []
            for equipo in equipos_campana:
                ids_equipo = equipo.agentes_detalle.values_list('agente_id', flat=True)
                agentes_ids.extend(ids_equipo)
            
            agentes_ids = list(set(agentes_ids))  # Eliminar duplicados
            
            # 8.2: KPI 1 - Llamadas Activas (tiempo real)
            estado_en_curso = get_estado('ESTADO_LLAMADA', 'EN_CURSO')
            llamadas_activas = Llamada.objects.filter(
                agente_id__in=agentes_ids,
                cliente__campana=campana,
                estado_llamada=estado_en_curso
            ).count()
            
            # 8.3: KPI 2 - Tiempo Promedio de Llamada
            llamadas_periodo = Llamada.objects.filter(
                agente_id__in=agentes_ids,
                cliente__campana=campana,
                fecha_hora_inicio__range=(inicio_periodo, fin_periodo)
            )
            
            duracion_promedio = llamadas_periodo.filter(
                fue_contestada=True,
                duracion__isnull=False
            ).aggregate(promedio=Avg('duracion'))['promedio'] or 0
            
            # 8.4: KPI 3 - Llamadas del Día/Período
            llamadas_del_periodo = llamadas_periodo.count()
            
            # 8.5: KPI 4 y 5 - Ventas y Tasa de Conversión
            estado_no_venta_id = get_estado_id('ESTADO_VENTA', 'NO_VENTA')

            if estado_no_venta_id:
                ventas_periodo = llamadas_periodo.filter(
                    fue_contestada=True
                ).exclude(estado_venta_id=estado_no_venta_id).count()
            else:
                ventas_periodo = 0

            llamadas_contestadas_periodo = llamadas_periodo.filter(fue_contestada=True).count()

            tasa_conversion = (ventas_periodo / llamadas_contestadas_periodo * 100) if llamadas_contestadas_periodo > 0 else 0
            
            campanas_data.append({
                "campana_id": campana.pk,
                "campana_nombre": campana.nombre,
                "llamadas_activas": llamadas_activas,
                "tiempo_promedio_llamada": round(duracion_promedio, 2),
                "llamadas_del_periodo": llamadas_del_periodo,
                "ventas_realizadas": ventas_periodo,
                "tasa_conversion": round(tasa_conversion, 2)
            })

        # Retornar respuesta completa
        return Response({
            "centro_id": centro.pk,
            "centro_nombre": centro.nombre,
            "total_campanas_activas": len(campanas_data),
            "fecha_desde": fecha_desde.isoformat(),
            "fecha_hasta": fecha_hasta.isoformat(),
            "fecha_consulta": timezone.now(),
            "campanas": campanas_data
        })
    
    @action(detail=False, methods=['get'], url_path='jefe-centro/equipos', permission_classes=[IsJefeCentro])
    def equipos_centro_list(self, request):
        """
        Endpoint para Jefe de Centro: Lista TODOS los equipos del centro (sin filtrar por campaña).
        Solo accesible para Jefes de Centro y Admins.

        GET /api/kpis/jefe-centro/equipos/?page=1&page_size=10

        Query params:
            page: Número de página (default: 1)
            page_size: Registros por página (default: 10, máx: 50)

        Response (lista paginada):
            {
                "count": 25,
                "next": "http://.../api/kpis/jefe-centro/equipos/?page=2",
                "previous": null,
                "results": [
                    {
                        "equipo_id": 1,
                        "nombre": "Equipo Alpha",
                        "coordinador_id": "123456",
                        "coordinador_nombre": "Juan Pérez",
                        "total_agentes": 8,
                        "campana_nombre": "Campaña Navidad"
                    },
                    ...
                ]
            }
        """
        jefe_centro = request.user

        # Obtener el centro donde este jefe trabaja
        centro = Centro.objects.filter(jefe_centro=jefe_centro).first()

        if not centro:
            return Response(
                {"detail": "No tienes un centro asignado"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Obtener TODOS los equipos del centro (sin filtrar por campaña)
        equipos = Equipo.objects.filter(
            campana__centro=centro,
            is_active=True
        ).select_related('coordinador', 'campana').prefetch_related('agentes_detalle')
        
        # Preparar datos para serializer
        equipos_data = []
        for equipo in equipos:
            coordinador_nombre = None
            coordinador_id = None
            
            if equipo.coordinador:
                coordinador_nombre = equipo.coordinador.get_full_name()
                coordinador_id = equipo.coordinador.documento_id
            
            equipos_data.append({
                'equipo_id': equipo.equipo_id,
                'nombre': equipo.nombre,
                'coordinador_id': coordinador_id,
                'coordinador_nombre': coordinador_nombre,
                'total_agentes': equipo.agentes_detalle.count(),
                'campana_nombre': equipo.campana.nombre if equipo.campana else 'Sin campaña'
            })
        
        # Paginación (10 registros por defecto)
        paginator = PageNumberPagination()
        paginator.page_size = int(request.query_params.get('page_size', 10))
        paginator.max_page_size = 50
        
        page = paginator.paginate_queryset(equipos_data, request)
        
        if page is not None:
            return paginator.get_paginated_response(page)
        
        return Response(equipos_data)

    @action(detail=False, methods=['get'], url_path='jefe-centro/equipos/(?P<equipo_id>[^/.]+)/detalle', permission_classes=[IsJefeCentro])
    def equipo_centro_detalle_kpis(self, request, equipo_id=None):
        """
        Endpoint para Jefe de Centro: KPIs detallados de un equipo del centro.
        Solo accesible para Jefes de Centro y Admins.

        GET /api/kpis/jefe-centro/equipos/<equipo_id>/detalle/?fecha_desde=2025-11-01&fecha_hasta=2025-11-08

        Query params:
            fecha_desde: Fecha inicio (YYYY-MM-DD), opcional (default: hoy)
            fecha_hasta: Fecha fin (YYYY-MM-DD), opcional (default: hoy)

        Response:
            {
                "equipo_id": 1,
                "equipo_nombre": "Equipo Alpha",
                "campana_id": 5,
                "campana_nombre": "Campaña Navidad",
                "llamadas_activas": 3,
                "agentes_disponibles": 5,
                "tiempo_promedio_llamada": 180.5,
                "llamadas_del_dia": 120,
                "ventas_realizadas": 35,
                "tasa_conversion": 29.17,
                "total_agentes": 10,
                "coordinador_nombre": "Juan Pérez",
                "fecha_desde": "2025-11-08",
                "fecha_hasta": "2025-11-08",
                "fecha_consulta": "2025-11-08T15:30:00Z"
            }
        """
        jefe_centro = request.user

        # Obtener el centro donde este jefe trabaja
        centro = Centro.objects.filter(jefe_centro=jefe_centro).first()

        if not centro:
            return Response(
                {"detail": "No tienes un centro asignado"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Obtener y validar equipo
        equipo = get_object_or_404(Equipo, equipo_id=equipo_id, is_active=True)
        
        # Validar que el equipo pertenezca al centro del jefe
        if not request.user.is_admin():
            if not equipo.campana or equipo.campana.centro != centro:
                return Response(
                    {"detail": "No tienes permiso para ver KPIs de este equipo"},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Parsear y validar fechas
        fecha_desde_str = request.query_params.get('fecha_desde')
        fecha_hasta_str = request.query_params.get('fecha_hasta')
        
        hoy = date.today()
        
        if not fecha_desde_str and not fecha_hasta_str:
            fecha_desde = fecha_hasta = hoy
        elif fecha_desde_str and fecha_hasta_str:
            fecha_desde = parse_date(fecha_desde_str)
            fecha_hasta = parse_date(fecha_hasta_str)
            
            if not fecha_desde or not fecha_hasta:
                return Response(
                    {"detail": "Fechas inválidas. Usa formato YYYY-MM-DD"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            return Response(
                {"detail": "Debes enviar ambas fechas (fecha_desde y fecha_hasta) o ninguna"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validar que la fecha inicial no sea futura
        if fecha_desde > hoy:
            return Response(
                {"detail": "La fecha inicial no puede ser futura"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validar rango de fechas
        if fecha_desde > fecha_hasta:
            return Response(
                {"detail": "La fecha inicial no puede ser mayor a la fecha posterior"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Si fecha_hasta es futura, ajustarla a hoy
        if fecha_hasta > hoy:
            fecha_hasta = hoy
        
        # Obtener agentes del equipo
        agentes_ids = list(equipo.agentes_detalle.values_list('agente_id', flat=True))
        
        if not agentes_ids:
            # Si no hay agentes, retornar KPIs en 0
            return Response({
                "equipo_id": equipo.equipo_id,
                "equipo_nombre": equipo.nombre,
                "campana_id": equipo.campana.pk if equipo.campana else None,
                "campana_nombre": equipo.campana.nombre if equipo.campana else "Sin campaña",
                "llamadas_activas": 0,
                "agentes_disponibles": 0,
                "tiempo_promedio_llamada": 0,
                "llamadas_del_dia": 0,
                "ventas_realizadas": 0,
                "tasa_conversion": 0,
                "total_agentes": 0,
                "coordinador_nombre": equipo.coordinador.get_full_name() if equipo.coordinador else None,
                "fecha_desde": fecha_desde.isoformat(),
                "fecha_hasta": fecha_hasta.isoformat(),
                "fecha_consulta": timezone.now()
            })
        
        # Obtener objetos de agentes
        agentes = User.objects.filter(
            documento_id__in=agentes_ids,
            is_active=True
        )
        
        total_agentes = agentes.count()
        
        # KPI 1: LLAMADAS ACTIVAS (Tiempo Real)
        estado_en_llamada = get_estado('ESTADO_AGENTE', 'EN_LLAMADA')
        llamadas_activas = 0
        
        for agente in agentes:
            try:
                if hasattr(agente, 'estado_actual') and agente.estado_actual:
                    if agente.estado_actual.estado_id == estado_en_llamada:
                        llamadas_activas += 1
            except:
                pass
        
        # KPI 2: AGENTES DISPONIBLES (Tiempo Real)
        estado_disponible = get_estado('ESTADO_AGENTE', 'DISPONIBLE')
        agentes_disponibles = 0
        
        for agente in agentes:
            try:
                if hasattr(agente, 'estado_actual') and agente.estado_actual:
                    if agente.estado_actual.estado_id == estado_disponible:
                        agentes_disponibles += 1
            except:
                pass
        
        # Convertir fechas a datetime con timezone
        tz = timezone.get_current_timezone()
        inicio_periodo = datetime.combine(fecha_desde, time.min).replace(tzinfo=tz)
        fin_periodo = datetime.combine(fecha_hasta, time.max).replace(tzinfo=tz)
        
        # Filtrar llamadas del período
        llamadas_periodo = Llamada.objects.filter(
            agente_id__in=agentes_ids,
            fecha_hora_inicio__range=(inicio_periodo, fin_periodo)
        )
        
        # KPI 4: LLAMADAS DEL DÍA/PERÍODO
        llamadas_del_periodo = llamadas_periodo.count()
        
        # KPI 3: TIEMPO PROMEDIO DE LLAMADA
        duracion_promedio = llamadas_periodo.filter(
            fue_contestada=True,
            duracion__isnull=False
        ).aggregate(promedio=Avg('duracion'))['promedio'] or 0
        
        # KPI 5: VENTAS REALIZADAS
        estado_no_venta_id = get_estado_id('ESTADO_VENTA', 'NO_VENTA')
        
        if estado_no_venta_id:
            ventas_periodo = llamadas_periodo.filter(
                fue_contestada=True
            ).exclude(estado_venta_id=estado_no_venta_id).count()
        else:
            ventas_periodo = 0
        
        # KPI 6: TASA DE CONVERSIÓN
        llamadas_contestadas_periodo = llamadas_periodo.filter(fue_contestada=True).count()
        tasa_conversion = (ventas_periodo / llamadas_contestadas_periodo * 100) if llamadas_contestadas_periodo > 0 else 0
        
        # Construir respuesta
        return Response({
            "equipo_id": equipo.equipo_id,
            "equipo_nombre": equipo.nombre,
            "campana_id": equipo.campana.pk if equipo.campana else None,
            "campana_nombre": equipo.campana.nombre if equipo.campana else "Sin campaña",
            "llamadas_activas": llamadas_activas,
            "agentes_disponibles": agentes_disponibles,
            "tiempo_promedio_llamada": round(duracion_promedio, 2),
            "llamadas_del_dia": llamadas_del_periodo,
            "ventas_realizadas": ventas_periodo,
            "tasa_conversion": round(tasa_conversion, 2),
            "total_agentes": total_agentes,
            "coordinador_nombre": equipo.coordinador.get_full_name() if equipo.coordinador else None,
            "fecha_desde": fecha_desde.isoformat(),
            "fecha_hasta": fecha_hasta.isoformat(),
            "fecha_consulta": timezone.now()
        })