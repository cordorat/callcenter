"""
Script para verificar la conexión entre frontend y backend de KPIs.
Simula la llamada que haría el frontend.
"""
import os
import sys
import django
import requests
from datetime import date

# Configurar Django
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'callcenter.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

def main():
    print("=" * 70)
    print("VERIFICACIÓN DE ENDPOINT /api/kpis/overview/")
    print("=" * 70)
    
    # 1. Obtener un agente de prueba
    try:
        agente = User.objects.filter(is_active=True).first()
        if not agente:
            print("❌ No hay usuarios en la base de datos")
            print("   Ejecuta: python create_admin.py")
            return
        
        print(f"\n✅ Usuario encontrado: {agente.email} (ID: {agente.id})")
    except Exception as e:
        print(f"❌ Error al buscar usuario: {e}")
        return
    
    # 2. Generar token JWT para el agente
    refresh = RefreshToken.for_user(agente)
    access_token = str(refresh.access_token)
    print(f"✅ Token JWT generado")
    
    # 3. Hacer request al endpoint
    today = date.today().isoformat()
    url = f"http://localhost:8000/api/kpis/overview/"
    params = {
        'from': today,
        'to': today
    }
    headers = {
        'Authorization': f'Bearer {access_token}'
    }
    
    print(f"\n📡 Haciendo request a: {url}")
    print(f"   Parámetros: from={today}, to={today}")
    
    try:
        response = requests.get(url, params=params, headers=headers)
        
        print(f"\n📊 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("\n✅ RESPUESTA EXITOSA:")
            print("-" * 70)
            
            # Verificar estructura
            print(f"\n🕐 Timestamp: {data.get('now', 'N/A')}")
            
            print("\n📈 VALUES:")
            values = data.get('values', {})
            print(f"  - Llamadas atendidas: {values.get('llamadas_atendidas', 0)}")
            print(f"  - Ventas realizadas: {values.get('ventas_realizadas', 0)}")
            print(f"  - Tiempo promedio: {values.get('tiempo_promedio_llamada', 0)} seg")
            print(f"  - Llamadas por hora: {values.get('llamadas_por_hora', 0)}")
            print(f"  - Cumplimiento: {values.get('cumplimiento', 0):.2%}")
            
            print("\n🎯 META:")
            meta = data.get('meta', {})
            print(f"  - Llamadas meta: {meta.get('llamadas_atendidas', 0)}")
            print(f"  - Ventas meta: {meta.get('ventas_realizadas', 0)}")
            print(f"  - Tiempo meta: {meta.get('tiempo_promedio_llamada', 0)} seg")
            print(f"  - Llamadas/hora meta: {meta.get('llamadas_por_hora', 0)}")
            print(f"  - Cumplimiento meta: {meta.get('cumplimiento', 1):.0%}")
            
            print("\n📊 SERIES:")
            series = data.get('series', {})
            llamadas_hora = series.get('llamadas_por_hora', [])
            print(f"  - Datos por hora: {len(llamadas_hora)} registros")
            if llamadas_hora:
                print(f"  - Ejemplo: {llamadas_hora[0]}")
            
            print("\n" + "=" * 70)
            print("✅ ESTRUCTURA COMPATIBLE CON FRONTEND")
            print("=" * 70)
            
            # Verificar compatibilidad con frontend
            errores = []
            if 'now' not in data:
                errores.append("❌ Falta campo 'now'")
            if 'values' not in data:
                errores.append("❌ Falta campo 'values'")
            if 'meta' not in data:
                errores.append("❌ Falta campo 'meta'")
            if 'series' not in data:
                errores.append("❌ Falta campo 'series'")
            
            if values.get('cumplimiento', 0) > 1:
                errores.append("⚠️  Cumplimiento debe ser 0-1, no porcentaje")
            
            if llamadas_hora and 'valor' not in llamadas_hora[0]:
                errores.append("❌ Series debe usar key 'valor', no 'total'")
            
            if errores:
                print("\n⚠️  ADVERTENCIAS:")
                for error in errores:
                    print(f"   {error}")
            else:
                print("\n✅ Todos los campos son correctos")
            
        else:
            print(f"\n❌ ERROR {response.status_code}")
            print(f"   {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("\n❌ No se pudo conectar al servidor")
        print("   Asegúrate de que Django esté corriendo en http://localhost:8000")
        print("   Ejecuta: python manage.py runserver")
    except Exception as e:
        print(f"\n❌ Error inesperado: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
