from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import Avg, Count
from datetime import timedelta, datetime
from django.utils.dateparse import parse_date

from apps.calls.models import Llamada
from apps.users.models import User


class KPIViewSet(viewsets.ViewSet):
    """
    ViewSet para KPIs de agentes.
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

        agente = get_object_or_404(User, id=agente_id)

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
        inicio_dia = timezone.make_aware(
            datetime.combine(fecha_desde, datetime.min.time())
        )
        fin_dia = timezone.make_aware(
            datetime.combine(fecha_hasta, datetime.max.time())
        )

        # Filtrar llamadas del agente en el rango de fechas
        llamadas = Llamada.objects.filter(
            agente=agente,
            hora_inicio_timbrado__gte=inicio_dia,
            hora_inicio_timbrado__lte=fin_dia
        )

        total_llamadas = llamadas.count()

        # Ventas realizadas (usando estado_venta)
        ventas = llamadas.exclude(estado_venta='NO_VENTA').count()

        # Cumplimiento
        cumplimiento = (ventas / total_llamadas * 100) if total_llamadas > 0 else 0

        # Llamadas por hora
        dias = (fecha_hasta - fecha_desde).days + 1
        horas = dias * 24
        llamadas_por_hora = round(total_llamadas / horas, 2)

        # Duración promedio
        duracion_promedio = llamadas.filter(
            duracion_llamada_segundos__isnull=False
        ).aggregate(promedio=Avg('duracion_llamada_segundos'))['promedio'] or 0

        return Response({
            "agente_id": agente.id,
            "agente_nombre": agente.get_full_name(),
            "total_llamadas": total_llamadas,
            "ventas_realizadas": ventas,
            "cumplimiento": round(cumplimiento, 2),
            "llamadas_por_hora": llamadas_por_hora,
            "duracion_promedio_segundos": round(duracion_promedio, 2),
            "fecha_desde": fecha_desde,
            "fecha_hasta": fecha_hasta
        })