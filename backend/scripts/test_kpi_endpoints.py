"""
Script de prueba para los endpoints de KPI de Coordinador.
Ejecutar con: python test_kpi_endpoints.py
"""
import os
import django
import requests
import json
from datetime import date, timedelta

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'callcenter.settings')
django.setup()

BASE_URL = "http://localhost:8000/api"
COORDINADOR_EMAIL = "coordinador@callcenter.com"
COORDINADOR_PASSWORD = "coordinador123!"

# Colores para output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'


def print_header(text):
    print(f"\n{BLUE}{'='*70}")
    print(f"{text}")
    print(f"{'='*70}{RESET}\n")


def print_success(text):
    print(f"{GREEN}✅ {text}{RESET}")


def print_error(text):
    print(f"{RED}❌ {text}{RESET}")


def print_info(text):
    print(f"{YELLOW}ℹ️  {text}{RESET}")


def test_coordinador_endpoints():
    """Prueba los endpoints de KPI."""
    
    print_header("PRUEBAS - KPI Coordinador")
    
    # 1. Login
    print_info("Paso 1: Login del coordinador...")
    response = requests.post(
        f"{BASE_URL}/auth/login/",
        json={"email": COORDINADOR_EMAIL, "password": COORDINADOR_PASSWORD}
    )
    
    if response.status_code != 200:
        print_error(f"Login fallido: {response.status_code}")
        print(f"Response: {response.json()}")
        return
    
    token = response.json()['tokens']['access']
    print_success(f"Login exitoso. Token obtenido.")
    print(f"Token: {token[:50]}...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # 2. Listar agentes
    print_info("Paso 2: Listar agentes...")
    response = requests.get(
        f"{BASE_URL}/kpis/agentes/",
        headers=headers
    )
    
    if response.status_code != 200:
        print_error(f"Error al listar agentes: {response.status_code}")
        print(f"Response: {response.json()}")
        return
    
    agentes = response.json()
    print_success(f"Agentes obtenidos: {len(agentes)} agentes encontrados")
    
    if agentes:
        for agente in agentes[:3]:  # Mostrar primeros 3
            print(f"  - {agente['nombre_completo']} ({agente['id']}) - Estado: {agente['estado_actual']}")
    
    if not agentes:
        print_error("No hay agentes para probar. Crea al menos un agente.")
        return
    
    # Obtener documento_id del primer agente
    agente_documento_id = agentes[0]['id']
    
    # 3. KPI detallado (hoy)
    print_info("Paso 3: KPI detallado de agente (hoy)...")
    hoy = date.today().isoformat()
    response = requests.get(
        f"{BASE_URL}/kpis/agentes/{agente_documento_id}/detalle/",
        headers=headers,
        params={"fecha_desde": hoy, "fecha_hasta": hoy}
    )
    
    if response.status_code != 200:
        print_error(f"Error al obtener KPI: {response.status_code}")
        print(f"Response: {response.json()}")
        return
    
    kpi = response.json()
    print_success(f"KPI obtenido para {kpi['agente_nombre']}")
    print(f"  - Total de llamadas: {kpi['total_llamadas']}")
    print(f"  - Ventas realizadas: {kpi['ventas_realizadas']}")
    print(f"  - Tasa de conversión: {kpi['tasa_conversion']}%")
    print(f"  - Tiempo trabajado: {kpi['tiempo_trabajado_formateado']}")
    print(f"  - Duración promedio: {kpi['duracion_promedio_formateado']}")
    print(f"  - Estado actual: {kpi['estado_actual']}")
    
    # 4. KPI detallado (rango personalizado)
    print_info("Paso 4: KPI detallado de agente (últimos 7 días)...")
    hace_7_dias = (date.today() - timedelta(days=7)).isoformat()
    response = requests.get(
        f"{BASE_URL}/kpis/agentes/{agente_documento_id}/detalle/",
        headers=headers,
        params={"fecha_desde": hace_7_dias, "fecha_hasta": hoy}
    )
    
    if response.status_code != 200:
        print_error(f"Error al obtener KPI: {response.status_code}")
        print(f"Response: {response.json()}")
        return
    
    kpi = response.json()
    print_success(f"KPI obtenido para {kpi['agente_nombre']} (últimos 7 días)")
    print(f"  - Período: {kpi['fecha_desde']} a {kpi['fecha_hasta']}")
    print(f"  - Total de llamadas: {kpi['total_llamadas']}")
    print(f"  - Ventas realizadas: {kpi['ventas_realizadas']}")
    print(f"  - Tasa de conversión: {kpi['tasa_conversion']}%")
    
    # 5. Validación: Fecha futura (debe fallar)
    print_info("Paso 5: Validación - Intentar con fecha futura (debe fallar)...")
    fecha_futura = (date.today() + timedelta(days=1)).isoformat()
    response = requests.get(
        f"{BASE_URL}/kpis/agentes/{agente_documento_id}/detalle/",
        headers=headers,
        params={"fecha_desde": hoy, "fecha_hasta": fecha_futura}
    )
    
    if response.status_code != 200:
        print_success(f"Validación correcta - Error esperado: {response.json()['detail']}")
    else:
        print_error("Validación fallida - Se permitió fecha futura")
    
    # 6. Validación: Fechas invertidas (debe fallar)
    print_info("Paso 6: Validación - Intentar con fechas invertidas (debe fallar)...")
    hace_7_dias = (date.today() - timedelta(days=7)).isoformat()
    response = requests.get(
        f"{BASE_URL}/kpis/agentes/{agente_documento_id}/detalle/",
        headers=headers,
        params={"fecha_desde": hoy, "fecha_hasta": hace_7_dias}
    )
    
    if response.status_code != 200:
        print_success(f"Validación correcta - Error esperado: {response.json()['detail']}")
    else:
        print_error("Validación fallida - Se permitieron fechas invertidas")
    
    # 7. Validación: Falta fecha_desde (debe fallar)
    print_info("Paso 7: Validación - Intentar sin fecha_desde (debe fallar)...")
    response = requests.get(
        f"{BASE_URL}/kpis/agentes/{agente_documento_id}/detalle/",
        headers=headers,
        params={"fecha_hasta": hoy}
    )
    
    if response.status_code != 200:
        print_success(f"Validación correcta - Error esperado: {response.json()['detail']}")
    else:
        print_error("Validación fallida - Se permitió falta de parámetro")
    
    print_header("PRUEBAS COMPLETADAS ✅")
    print(f"{GREEN}Todos los endpoints están funcionando correctamente.{RESET}\n")


if __name__ == '__main__':
    test_coordinador_endpoints()
