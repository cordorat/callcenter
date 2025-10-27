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

from apps.calls.models import Llamada
from apps.users.models import User
from apps.users.permissions import IsAdminOrCoordinador, IsAdmin
from apps.kpis.serializers import AgenteListSerializer, KPIAgenteDetailSerializer
from common.estados_helper import get_estado_id, get_estado


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
            ventas = llamadas.exclude(estado_venta_id=estado_no_venta_id).count()
        else:
            ventas = 0

        # Cumplimiento
        cumplimiento = (ventas / total_llamadas * 100) if total_llamadas > 0 else 0

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

        
        horas_dict = {i: 0 for i in range(9,19)}
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
        
        total_llamadas = llamadas.count()
        
        # Ventas realizadas (excluir NO_VENTA usando estados_helper)
        estado_no_venta_id = get_estado_id('ESTADO_VENTA', 'NO_VENTA')
        if estado_no_venta_id:
            ventas = llamadas.exclude(estado_venta_id=estado_no_venta_id).count()
        else:
            ventas = 0
        
        # Cumplimiento como decimal 0-1
        cumplimiento_decimal = (ventas / total_llamadas) if total_llamadas > 0 else 0
        
        # Llamadas por hora (promedio)
        dias = (fecha_hasta - fecha_desde).days + 1
        horas_totales = dias * 8  # Asumiendo 8 horas laborales por día
        llamadas_por_hora_promedio = round(total_llamadas / horas_totales, 2) if horas_totales > 0 else 0
        
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
            horas_dict[item['hora']] = item['total']
        
        # Convertir a lista con key "valor" (como espera el frontend)
        series_llamadas_por_hora = [
            {"hora": f"{hora:02d}:00", "valor": total}
            for hora, total in sorted(horas_dict.items())
        ]
        
        # Duración promedio de llamada
        duracion_promedio = llamadas.filter(
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
        
        # Filtrar agentes (todos si es admin, solo asignados si es coordinador)
        if request.user.is_admin():
            agentes = User.objects.filter(
                rol=get_estado('ROL_USUARIO', 'AGENTE'),
                is_active=True
            ).order_by('first_name', 'last_name')
        else:
            # Los coordinadores ven todos los agentes por ahora
            # En el futuro se puede restringir según equipo asignado
            agentes = User.objects.filter(
                rol=get_estado('ROL_USUARIO', 'AGENTE'),
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
        agente = get_object_or_404(User, documento_id=documento_id, rol=get_estado('ROL_USUARIO', 'AGENTE'))
        
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
            ventas = llamadas.exclude(estado_venta_id=estado_no_venta_id).count()
        else:
            ventas = 0
        
        # Tasa de conversión
        tasa_conversion = (ventas / total_llamadas * 100) if total_llamadas > 0 else 0
        
        # Tiempo trabajado (sumatoria de duraciones)
        tiempo_trabajado_segundos = llamadas.filter(
            duracion__isnull=False
        ).aggregate(total=Count('id') * 0)['total'] or 0
        
        # En realidad, necesitamos sumar las duraciones reales
        duraciones = llamadas.filter(duracion__isnull=False).values_list('duracion', flat=True)
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