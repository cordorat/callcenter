"""
Comando de Django para poblar la tabla TiposParametros con los datos iniciales
necesarios para el funcionamiento del sistema de Call Center.

Uso:
    python manage.py populate_tipos_parametros

Este comando es idempotente: puede ejecutarse múltiples veces sin crear duplicados.
"""
from django.core.management.base import BaseCommand
from apps.users.models import TiposParametros


class Command(BaseCommand):
    help = 'Pobla la tabla TiposParametros con los valores iniciales del sistema'

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING('=' * 70))
        self.stdout.write(self.style.MIGRATE_HEADING('POBLANDO TIPOS DE PARÁMETROS'))
        self.stdout.write(self.style.MIGRATE_HEADING('=' * 70))

        parametros = [
            # ============================================================
            # ROL_USUARIO - Roles de usuarios del sistema
            # ============================================================
            {'parametros_id': 1, 'nombre': 'ROL_USUARIO', 'valor': 'ADMIN', 
             'descripcion': 'Administrador del sistema con acceso completo'},
            {'parametros_id': 2, 'nombre': 'ROL_USUARIO', 'valor': 'COORDINADOR', 
             'descripcion': 'Supervisor de equipos y campañas'},
            {'parametros_id': 3, 'nombre': 'ROL_USUARIO', 'valor': 'AGENTE', 
             'descripcion': 'Agente de call center que atiende llamadas'},
            {'parametros_id': 4, 'nombre': 'ROL_USUARIO', 'valor': 'ANALISTA', 
             'descripcion': 'Analista de datos y reportes'},
            {'parametros_id': 40, 'nombre': 'ROL_USUARIO', 'valor': 'JEFE_CENTRO', 
             'descripcion': 'Jefe de centro que gestiona equipos de trabajo'},
            {'parametros_id': 42, 'nombre': 'ROL_USUARIO', 'valor': 'JEFE_CAMPANA', 
             'descripcion': 'Jefe de Campaña - Administra campañas y visualiza equipos'},
            {'parametros_id': 43, 'nombre': 'ROL_USUARIO', 'valor': 'BACKOFFICE', 
             'descripcion': 'Backoffice encargado de revisar llamadas'},
            {'parametros_id': 44, 'nombre': 'ROL_USUARIO', 'valor': 'JEFE_CAMPAÑA', 
             'descripcion': 'Jefe de campaña que supervisa campañas específicas'},

            # ============================================================
            # ESTADO_AGENTE - Estados en los que puede estar un agente
            # ============================================================
            {'parametros_id': 5, 'nombre': 'ESTADO_AGENTE', 'valor': 'DISPONIBLE', 
             'descripcion': 'Agente disponible para recibir llamadas'},
            {'parametros_id': 6, 'nombre': 'ESTADO_AGENTE', 'valor': 'EN_LLAMADA', 
             'descripcion': 'Agente atendiendo una llamada'},
            {'parametros_id': 7, 'nombre': 'ESTADO_AGENTE', 'valor': 'AFTERCALL', 
             'descripcion': 'Agente en trabajo posterior a la llamada'},
            {'parametros_id': 8, 'nombre': 'ESTADO_AGENTE', 'valor': 'BREAK', 
             'descripcion': 'Agente en descanso corto'},
            {'parametros_id': 9, 'nombre': 'ESTADO_AGENTE', 'valor': 'ALMUERZO', 
             'descripcion': 'Agente en hora de almuerzo'},
            {'parametros_id': 10, 'nombre': 'ESTADO_AGENTE', 'valor': 'CAPACITACION', 
             'descripcion': 'Agente en capacitación'},
            {'parametros_id': 11, 'nombre': 'ESTADO_AGENTE', 'valor': 'BAÑO', 
             'descripcion': 'Agente en baño'},
            {'parametros_id': 12, 'nombre': 'ESTADO_AGENTE', 'valor': 'NO_DISPONIBLE', 
             'descripcion': 'Agente no disponible por motivos varios'},
            {'parametros_id': 13, 'nombre': 'ESTADO_AGENTE', 'valor': 'DESCONECTADO', 
             'descripcion': 'Agente desconectado del sistema'},

            # ============================================================
            # ESTADO_CAMPANA - Estados de campañas
            # ============================================================
            {'parametros_id': 14, 'nombre': 'ESTADO_CAMPANA', 'valor': 'ACTIVA', 
             'descripcion': 'Campaña activa y en ejecución'},
            {'parametros_id': 15, 'nombre': 'ESTADO_CAMPANA', 'valor': 'FINALIZADA', 
             'descripcion': 'Campaña completada'},
            {'parametros_id': 16, 'nombre': 'ESTADO_CAMPANA', 'valor': 'NO_ACTIVA', 
             'descripcion': 'Campaña no activa o pausada'},

            # ============================================================
            # ESTADO_LLAMADA - Estados de las llamadas
            # ============================================================
            {'parametros_id': 17, 'nombre': 'ESTADO_LLAMADA', 'valor': 'TIMBRADO', 
             'descripcion': 'Llamada sonando, esperando respuesta'},
            {'parametros_id': 18, 'nombre': 'ESTADO_LLAMADA', 'valor': 'EN_CURSO', 
             'descripcion': 'Llamada en progreso'},
            {'parametros_id': 19, 'nombre': 'ESTADO_LLAMADA', 'valor': 'COMPLETADA', 
             'descripcion': 'Llamada finalizada exitosamente'},
            {'parametros_id': 20, 'nombre': 'ESTADO_LLAMADA', 'valor': 'NO_CONTESTADA', 
             'descripcion': 'Llamada no contestada por el cliente'},
            {'parametros_id': 21, 'nombre': 'ESTADO_LLAMADA', 'valor': 'RECHAZADA', 
             'descripcion': 'Llamada rechazada por el agente'},
            {'parametros_id': 22, 'nombre': 'ESTADO_LLAMADA', 'valor': 'TRANSFERIDA', 
             'descripcion': 'Llamada transferida a otro agente'},
            {'parametros_id': 23, 'nombre': 'ESTADO_LLAMADA', 'valor': 'COLGADA', 
             'descripcion': 'Llamada colgada antes de completarse'},
            {'parametros_id': 24, 'nombre': 'ESTADO_LLAMADA', 'valor': 'OCUPADO', 
             'descripcion': 'Línea ocupada'},
            {'parametros_id': 25, 'nombre': 'ESTADO_LLAMADA', 'valor': 'ERROR', 
             'descripcion': 'Error en la llamada'},

            # ============================================================
            # ESTADO_INTERACION_LLAMADA - Estados de iteraciones con clientes
            # ============================================================
            {'parametros_id': 26, 'nombre': 'ESTADO_INTERACION_LLAMADA', 'valor': 'CONTACTADO', 
             'descripcion': 'Cliente contactado exitosamente'},
            {'parametros_id': 27, 'nombre': 'ESTADO_INTERACION_LLAMADA', 'valor': 'NO_CONTACTADO', 
             'descripcion': 'No se logró contactar al cliente'},

            # ============================================================
            # ESTADO_VENTA - Estados de ventas
            # ============================================================
            {'parametros_id': 28, 'nombre': 'ESTADO_VENTA', 'valor': 'VENTA', 
             'descripcion': 'Venta realizada exitosamente'},
            {'parametros_id': 29, 'nombre': 'ESTADO_VENTA', 'valor': 'NO_VENTA', 
             'descripcion': 'No se realizó venta'},

            # ============================================================
            # MOTIVO_RECHAZO - Motivos por los que se rechaza una llamada
            # ============================================================
            {'parametros_id': 30, 'nombre': 'MOTIVO_RECHAZO', 'valor': 'FUERA_DE_HORARIO', 
             'descripcion': 'Llamada fuera de horario laboral'},
            {'parametros_id': 31, 'nombre': 'MOTIVO_RECHAZO', 'valor': 'SIN_CAPACIDAD', 
             'descripcion': 'Agente sin capacidad para atender'},
            {'parametros_id': 32, 'nombre': 'MOTIVO_RECHAZO', 'valor': 'CLIENTE_INADECUADO', 
             'descripcion': 'Cliente inadecuado o agresivo'},
            {'parametros_id': 33, 'nombre': 'MOTIVO_RECHAZO', 'valor': 'PROBLEMA_TECNICO', 
             'descripcion': 'Problema técnico con el sistema'},
            {'parametros_id': 34, 'nombre': 'MOTIVO_RECHAZO', 'valor': 'OTRO', 
             'descripcion': 'Otro motivo'},

            # ============================================================
            # TIPO_LLAMADA - Tipos de llamadas
            # ============================================================
            {'parametros_id': 35, 'nombre': 'TIPO_LLAMADA', 'valor': 'ENTRANTE', 
             'descripcion': 'Llamada entrante (inbound)'},
            {'parametros_id': 36, 'nombre': 'TIPO_LLAMADA', 'valor': 'SALIENTE', 
             'descripcion': 'Llamada saliente (outbound)'},
            {'parametros_id': 37, 'nombre': 'TIPO_LLAMADA', 'valor': 'TRANSFERENCIA', 
             'descripcion': 'Llamada transferida'},

            # ============================================================
            # ESTADO_REPORTE - Estados de reportes de llamadas
            # ============================================================
            {'parametros_id': 38, 'nombre': 'ESTADO_REPORTE', 'valor': 'REPORTADA', 
             'descripcion': 'La llamada ha sido reportada'},
            {'parametros_id': 39, 'nombre': 'ESTADO_REPORTE', 'valor': 'NO_REPORTADA', 
             'descripcion': 'La llamada aún no ha sido reportada'},
            {'parametros_id': 41, 'nombre': 'ESTADO_REPORTE', 'valor': 'PENDIENTE_REVISION', 
             'descripcion': 'Reporte pendiente de revisión'},

            # ============================================================
            # ESTADO_AUDITORIA - Estados de auditoría de llamadas
            # ============================================================
            {'parametros_id': 45, 'nombre': 'ESTADO_AUDITORIA', 'valor': 'NO_AUDITADA', 
             'descripcion': 'Llamada no ha sido auditada'},
            {'parametros_id': 47, 'nombre': 'ESTADO_AUDITORIA', 'valor': 'AUDITADA', 
             'descripcion': 'Llamada ya fue auditada'},
        ]

        contador_creados = 0
        contador_existentes = 0
        contador_actualizados = 0

        for param in parametros:
            # Intentar obtener por ID primero (para mantener IDs específicos)
            try:
                obj = TiposParametros.objects.get(parametros_id=param['parametros_id'])
                # Ya existe con ese ID, verificar si necesita actualización
                if obj.nombre != param['nombre'] or obj.valor != param['valor']:
                    obj.nombre = param['nombre']
                    obj.valor = param['valor']
                    obj.descripcion = param['descripcion']
                    obj.save()
                    self.stdout.write(f"  🔄 Actualizado ID {param['parametros_id']}: {param['nombre']} - {param['valor']}")
                    contador_actualizados += 1
                else:
                    self.stdout.write(f"  ℹ️  Ya existe ID {param['parametros_id']}: {param['nombre']} - {param['valor']}")
                    contador_existentes += 1
            except TiposParametros.DoesNotExist:
                # No existe, intentar crear o buscar por nombre+valor
                obj, created = TiposParametros.objects.get_or_create(
                    nombre=param['nombre'],
                    valor=param['valor'],
                    defaults={
                        'parametros_id': param['parametros_id'],
                        'descripcion': param['descripcion']
                    }
                )
                if created:
                    self.stdout.write(self.style.SUCCESS(
                        f"  ✅ Creado ID {param['parametros_id']}: {param['nombre']} - {param['valor']}"
                    ))
                    contador_creados += 1
                else:
                    self.stdout.write(f"  ℹ️  Ya existe: {param['nombre']} - {param['valor']} (ID diferente)")
                    contador_existentes += 1

        # Resumen
        self.stdout.write('')
        self.stdout.write(self.style.MIGRATE_HEADING('=' * 70))
        self.stdout.write(self.style.MIGRATE_HEADING('RESUMEN'))
        self.stdout.write(self.style.MIGRATE_HEADING('=' * 70))
        self.stdout.write(self.style.SUCCESS(f'  ✅ Registros creados: {contador_creados}'))
        self.stdout.write(f'  🔄 Registros actualizados: {contador_actualizados}')
        self.stdout.write(f'  ℹ️  Registros existentes: {contador_existentes}')
        self.stdout.write(f'  📊 Total procesados: {len(parametros)}')

        # Resumen por categoría
        self.stdout.write('')
        self.stdout.write(self.style.MIGRATE_HEADING('RESUMEN POR CATEGORÍA'))
        self.stdout.write(self.style.MIGRATE_HEADING('-' * 40))
        
        categorias = TiposParametros.objects.values_list('nombre', flat=True).distinct().order_by('nombre')
        for categoria in categorias:
            count = TiposParametros.objects.filter(nombre=categoria).count()
            self.stdout.write(f'  📁 {categoria}: {count} valores')

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('✅ Tipos de parámetros poblados exitosamente'))
