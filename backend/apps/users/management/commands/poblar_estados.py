from django.core.management.base import BaseCommand
from apps.users.models import TiposParametros


class Command(BaseCommand):
    help = 'Pobla la tabla TiposParametros con los estados de agente'

    def handle(self, *args, **kwargs):
        estados = [
            {'nombre': 'ESTADO_AGENTE', 'valor': 'Disponible', 'descripcion': 'Agente disponible para recibir llamadas'},
            {'nombre': 'ESTADO_AGENTE', 'valor': 'En llamada', 'descripcion': 'Agente en llamada activa'},
            {'nombre': 'ESTADO_AGENTE', 'valor': 'Aftercall', 'descripcion': 'Agente en proceso de registro post-llamada'},
            {'nombre': 'ESTADO_AGENTE', 'valor': 'Break', 'descripcion': 'Agente en descanso corto'},
            {'nombre': 'ESTADO_AGENTE', 'valor': 'Almuerzo', 'descripcion': 'Agente en hora de almuerzo'},
            {'nombre': 'ESTADO_AGENTE', 'valor': 'Baño', 'descripcion': 'Agente en el baño'},
            {'nombre': 'ESTADO_AGENTE', 'valor': 'Entrenamiento', 'descripcion': 'Agente en capacitación'},
            {'nombre': 'ESTADO_AGENTE', 'valor': 'No disponible', 'descripcion': 'Agente no disponible temporalmente'},
            {'nombre': 'ESTADO_AGENTE', 'valor': 'Desconectado', 'descripcion': 'Agente desconectado del sistema'},
        ]
        
        creados = 0
        actualizados = 0
        
        self.stdout.write(self.style.WARNING('\n' + '='*60))
        self.stdout.write(self.style.WARNING('  POBLANDO ESTADOS DE AGENTE'))
        self.stdout.write(self.style.WARNING('='*60 + '\n'))
        
        for estado_data in estados:
            obj, created = TiposParametros.objects.get_or_create(
                nombre=estado_data['nombre'],
                valor=estado_data['valor'],
                defaults={'descripcion': estado_data['descripcion']}
            )
            if created:
                creados += 1
                self.stdout.write(self.style.SUCCESS(f'  ✓ Estado creado: {estado_data["valor"]}'))
            else:
                actualizados += 1
                self.stdout.write(self.style.WARNING(f'  - Estado ya existe: {estado_data["valor"]}'))
        
        self.stdout.write(self.style.WARNING('\n' + '='*60))
        self.stdout.write(self.style.SUCCESS(f'  RESUMEN:'))
        self.stdout.write(self.style.SUCCESS(f'    Estados creados: {creados}'))
        self.stdout.write(self.style.WARNING(f'    Estados existentes: {actualizados}'))
        self.stdout.write(self.style.SUCCESS(f'    Total: {creados + actualizados}'))
        self.stdout.write(self.style.WARNING('='*60 + '\n'))
