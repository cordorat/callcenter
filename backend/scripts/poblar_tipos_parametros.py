"""
Script para poblar la tabla TiposParametros con todos los valores necesarios
para el funcionamiento del sistema de CallCenter.
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'callcenter.settings')
django.setup()

from apps.users.models import TiposParametros


def poblar_tipos_parametros():
    """Pobla la tabla TiposParametros con todos los valores necesarios."""
    
    print("=" * 80)
    print("POBLANDO TIPOS DE PARÁMETROS")
    print("=" * 80)
    
    parametros = [
        # ============================================================
        # ROL_USUARIO - Roles de usuarios del sistema
        # ============================================================
        {
            'nombre': 'ROL_USUARIO',
            'valor': 'ADMIN',
            'descripcion': 'Administrador del sistema con acceso completo'
        },
        {
            'nombre': 'ROL_USUARIO',
            'valor': 'COORDINADOR',
            'descripcion': 'Supervisor de equipos y campañas'
        },
        {
            'nombre': 'ROL_USUARIO',
            'valor': 'BACKOFFICE',
            'descripcion': 'Backoffice encargado de revisar llamadas'
        },
        {
            'nombre': 'ROL_USUARIO',
            'valor': 'AGENTE',
            'descripcion': 'Agente de call center que atiende llamadas'
        },
        {
            'nombre': 'ROL_USUARIO',
            'valor': 'ANALISTA',
            'descripcion': 'Analista de datos y reportes'
        },
        {
            'nombre': 'ROL_USUARIO',
            'valor': 'JEFE_CENTRO',
            'descripcion': 'Jefe de centro que gestiona equipos de trabajo'
        },
        {
            'nombre': 'ROL_USUARIO',
            'valor': 'JEFE_CAMPAÑA',
            'descripcion': 'Jefe de campaña que supervisa campañas específicas'
        },
        
        # ============================================================
        # ESTADO_AGENTE - Estados en los que puede estar un agente
        # ============================================================
        {
            'nombre': 'ESTADO_AGENTE',
            'valor': 'DISPONIBLE',
            'descripcion': 'Agente disponible para recibir llamadas'
        },
        {
            'nombre': 'ESTADO_AGENTE',
            'valor': 'EN_LLAMADA',
            'descripcion': 'Agente atendiendo una llamada'
        },
        {
            'nombre': 'ESTADO_AGENTE',
            'valor': 'AFTERCALL',
            'descripcion': 'Agente en trabajo posterior a la llamada'
        },
        {
            'nombre': 'ESTADO_AGENTE',
            'valor': 'BREAK',
            'descripcion': 'Agente en descanso corto'
        },
        {
            'nombre': 'ESTADO_AGENTE',
            'valor': 'ALMUERZO',
            'descripcion': 'Agente en hora de almuerzo'
        },
        {
            'nombre': 'ESTADO_AGENTE',
            'valor': 'CAPACITACION',
            'descripcion': 'Agente en capacitación'
        },
        {
            'nombre': 'ESTADO_AGENTE',
            'valor': 'BAÑO',
            'descripcion': 'Agente en baño'
        },
        {
            'nombre': 'ESTADO_AGENTE',
            'valor': 'NO_DISPONIBLE',
            'descripcion': 'Agente no disponible por motivos varios'
        },
        {
            'nombre': 'ESTADO_AGENTE',
            'valor': 'DESCONECTADO',
            'descripcion': 'Agente desconectado del sistema'
        },
        
        # ============================================================
        # ESTADO_CAMPANA - Estados de campañas
        # ============================================================
        {
            'nombre': 'ESTADO_CAMPANA',
            'valor': 'ACTIVA',
            'descripcion': 'Campaña activa y en ejecución'
        },
        {
            'nombre': 'ESTADO_CAMPANA',
            'valor': 'FINALIZADA',
            'descripcion': 'Campaña completada'
        },
        {
            'nombre': 'ESTADO_CAMPANA',
            'valor': 'NO_ACTIVA',
            'descripcion': 'Campaña no activa o pausada'
        },
        
        # ============================================================
        # ESTADO_LLAMADA - Estados de las llamadas
        # ============================================================
        {
            'nombre': 'ESTADO_LLAMADA',
            'valor': 'TIMBRADO',
            'descripcion': 'Llamada sonando, esperando respuesta'
        },
        {
            'nombre': 'ESTADO_LLAMADA',
            'valor': 'EN_CURSO',
            'descripcion': 'Llamada en progreso'
        },
        {
            'nombre': 'ESTADO_LLAMADA',
            'valor': 'COMPLETADA',
            'descripcion': 'Llamada finalizada exitosamente'
        },
        {
            'nombre': 'ESTADO_LLAMADA',
            'valor': 'NO_CONTESTADA',
            'descripcion': 'Llamada no contestada por el cliente'
        },
        {
            'nombre': 'ESTADO_LLAMADA',
            'valor': 'RECHAZADA',
            'descripcion': 'Llamada rechazada por el agente'
        },
        {
            'nombre': 'ESTADO_LLAMADA',
            'valor': 'TRANSFERIDA',
            'descripcion': 'Llamada transferida a otro agente'
        },
        {
            'nombre': 'ESTADO_LLAMADA',
            'valor': 'COLGADA',
            'descripcion': 'Llamada colgada antes de completarse'
        },
        {
            'nombre': 'ESTADO_LLAMADA',
            'valor': 'OCUPADO',
            'descripcion': 'Línea ocupada'
        },
        {
            'nombre': 'ESTADO_LLAMADA',
            'valor': 'ERROR',
            'descripcion': 'Error en la llamada'
        },
        
        # ============================================================
        # ESTADO_INTERACION_LLAMADA - Estados de iteraciones con clientes
        # ============================================================
        {
            'nombre': 'ESTADO_INTERACION_LLAMADA',
            'valor': 'CONTACTADO',
            'descripcion': 'Cliente contactado exitosamente'
        },
        {
            'nombre': 'ESTADO_INTERACION_LLAMADA',
            'valor': 'NO_CONTACTADO',
            'descripcion': 'No se logró contactar al cliente'
        },

        
        # ============================================================
        # ESTADO_VENTA - Estados de ventas
        # ============================================================
        {
            'nombre': 'ESTADO_VENTA',
            'valor': 'VENTA',
            'descripcion': 'Venta realizada exitosamente'
        },
        {
            'nombre': 'ESTADO_VENTA',
            'valor': 'NO_VENTA',
            'descripcion': 'No se realizó venta'
        },
        
        # ============================================================
        # ESTADO_REPORTE - Estados de reportes de llamadas
        # ============================================================
        {
            'nombre': 'ESTADO_REPORTE',
            'valor': 'NO_REPORTADA',
            'descripcion': 'Llamada no ha sido reportada aún'
        },
        {
            'nombre': 'ESTADO_REPORTE',
            'valor': 'REPORTADA',
            'descripcion': 'Llamada ya fue reportada'
        },
        {
            'nombre': 'ESTADO_REPORTE',
            'valor': 'PENDIENTE_REVISION',
            'descripcion': 'Reporte pendiente de revisión'
        },
        
        # ============================================================
        # ESTADO_AUDITORIA - Estados de auditoría de llamadas
        # ============================================================
        {
            'nombre': 'ESTADO_AUDITORIA',
            'valor': 'NO_AUDITADA',
            'descripcion': 'Llamada no ha sido auditada'
        },
        {
            'nombre': 'ESTADO_AUDITORIA',
            'valor': 'AUDITADA',
            'descripcion': 'Llamada ya fue auditada'
        },
        
        
        # ============================================================
        # MOTIVO_RECHAZO - Motivos por los que se rechaza una llamada
        # ============================================================
        {
            'nombre': 'MOTIVO_RECHAZO',
            'valor': 'FUERA_DE_HORARIO',
            'descripcion': 'Llamada fuera de horario laboral'
        },
        {
            'nombre': 'MOTIVO_RECHAZO',
            'valor': 'SIN_CAPACIDAD',
            'descripcion': 'Agente sin capacidad para atender'
        },
        {
            'nombre': 'MOTIVO_RECHAZO',
            'valor': 'CLIENTE_INADECUADO',
            'descripcion': 'Cliente inadecuado o agresivo'
        },
        {
            'nombre': 'MOTIVO_RECHAZO',
            'valor': 'PROBLEMA_TECNICO',
            'descripcion': 'Problema técnico con el sistema'
        },
        {
            'nombre': 'MOTIVO_RECHAZO',
            'valor': 'OTRO',
            'descripcion': 'Otro motivo'
        },
        
        # ============================================================
        # TIPO_LLAMADA - Tipos de llamadas
        # ============================================================
        {
            'nombre': 'TIPO_LLAMADA',
            'valor': 'ENTRANTE',
            'descripcion': 'Llamada entrante (inbound)'
        },
        {
            'nombre': 'TIPO_LLAMADA',
            'valor': 'SALIENTE',
            'descripcion': 'Llamada saliente (outbound)'
        },
        {
            'nombre': 'TIPO_LLAMADA',
            'valor': 'TRANSFERENCIA',
            'descripcion': 'Llamada transferida'
        },

    ]
    
    contador_creados = 0
    contador_existentes = 0
    
    for param in parametros:
        obj, created = TiposParametros.objects.get_or_create(
            nombre=param['nombre'],
            valor=param['valor'],
            defaults={'descripcion': param['descripcion']}
        )
        
        if created:
            print(f"✅ Creado: {param['nombre']} - {param['valor']}")
            contador_creados += 1
        else:
            print(f"ℹ️  Ya existe: {param['nombre']} - {param['valor']}")
            contador_existentes += 1
    
    print("\n" + "=" * 80)
    print("RESUMEN")
    print("=" * 80)
    print(f"✅ Registros creados: {contador_creados}")
    print(f"ℹ️  Registros existentes: {contador_existentes}")
    print(f"📊 Total procesados: {len(parametros)}")
    print("=" * 80)
    
    # Mostrar resumen por categoría
    print("\n" + "=" * 80)
    print("RESUMEN POR CATEGORÍA")
    print("=" * 80)
    
    categorias = TiposParametros.objects.values_list('nombre', flat=True).distinct()
    for categoria in categorias:
        count = TiposParametros.objects.filter(nombre=categoria).count()
        print(f"📁 {categoria}: {count} valores")
    
    print("=" * 80)
    print("✅ PROCESO COMPLETADO EXITOSAMENTE")
    print("=" * 80)


if __name__ == '__main__':
    poblar_tipos_parametros()
