"""
Script de prueba para verificar los nuevos campos documento_id y foto_perfil
"""
import requests
import json

BASE_URL = "http://localhost:8000/api"

def print_json(data, title=""):
    """Imprime JSON formateado"""
    if title:
        print(f"\n{'='*60}")
        print(f"  {title}")
        print('='*60)
    print(json.dumps(data, indent=2, ensure_ascii=False))

def test_login():
    """1. Login como admin"""
    print("\n🔐 TEST 1: Login como Administrador")
    response = requests.post(
        f"{BASE_URL}/auth/login/",
        json={
            "email": "admin@callcenter.com",
            "password": "admin123"
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Login exitoso")
        print(f"   Email: {data['user']['email']}")
        print(f"   Role: {data['user']['role']}")
        print(f"   Documento ID: {data['user'].get('documento_id', 'No configurado')}")
        print(f"   Foto Perfil: {data['user'].get('foto_perfil', 'No configurada')}")
        return data['tokens']['access']
    else:
        print(f"❌ Error en login: {response.status_code}")
        print(response.text)
        return None

def test_get_profile(token):
    """2. Ver perfil actual"""
    print("\n👤 TEST 2: Ver Mi Perfil")
    response = requests.get(
        f"{BASE_URL}/users/me/",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Perfil obtenido")
        print_json(data)
        return data
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)
        return None

def test_update_profile(token, user_id):
    """3. Actualizar perfil con documento_id y foto_perfil"""
    print("\n✏️ TEST 3: Actualizar documento_id y foto_perfil del admin")
    response = requests.patch(
        f"{BASE_URL}/users/{user_id}/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "documento_id": "DNI-12345678",
            "foto_perfil": "https://ejemplo.com/fotos/admin.jpg"
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Perfil actualizado exitosamente")
        print(f"   Documento ID: {data['documento_id']}")
        print(f"   Foto Perfil: {data['foto_perfil']}")
        return data
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)
        return None

def test_create_agent_full(token):
    """4. Crear agente con todos los campos"""
    print("\n➕ TEST 4: Crear agente CON documento_id y foto_perfil")
    response = requests.post(
        f"{BASE_URL}/users/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "email": "carlos.ramirez@callcenter.com",
            "first_name": "Carlos",
            "last_name": "Ramírez",
            "phone": "+57 301 234 5678",
            "documento_id": "CC-987654321",
            "foto_perfil": "https://ejemplo.com/fotos/carlos.jpg",
            "role": "AGENT",
            "password": "AgentPassword123!",
            "password_confirm": "AgentPassword123!",
            "is_active": True
        }
    )
    
    if response.status_code == 201:
        data = response.json()
        print("✅ Agente creado exitosamente")
        print(f"   ID: {data['id']}")
        print(f"   Email: {data['email']}")
        print(f"   Nombre completo: {data['full_name']}")
        print(f"   Documento ID: {data['documento_id']}")
        print(f"   Foto Perfil: {data['foto_perfil']}")
        return data
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)
        return None

def test_create_agent_minimal(token):
    """5. Crear agente SIN documento_id ni foto_perfil"""
    print("\n➕ TEST 5: Crear agente SIN documento_id y foto_perfil (opcionales)")
    response = requests.post(
        f"{BASE_URL}/users/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "email": "maria.gonzalez@callcenter.com",
            "first_name": "María",
            "last_name": "González",
            "phone": "+57 301 999 8888",
            "role": "AGENT",
            "password": "BasicAgent123!",
            "password_confirm": "BasicAgent123!"
        }
    )
    
    if response.status_code == 201:
        data = response.json()
        print("✅ Agente creado exitosamente")
        print(f"   ID: {data['id']}")
        print(f"   Email: {data['email']}")
        print(f"   Documento ID: {data.get('documento_id', 'null (OK)')}")
        print(f"   Foto Perfil: {data.get('foto_perfil', 'null (OK)')}")
        return data
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)
        return None

def test_list_users(token):
    """6. Listar todos los usuarios"""
    print("\n📋 TEST 6: Listar todos los usuarios")
    response = requests.get(
        f"{BASE_URL}/users/",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code == 200:
        data = response.json()
        # Si es una lista directa o está paginada
        users = data if isinstance(data, list) else data.get('results', [])
        print(f"✅ Usuarios listados: {len(users)} usuarios")
        for user in users:
            print(f"\n   - {user['email']} ({user['role']})")
            doc_id = user.get('documento_id')
            foto = user.get('foto_perfil')
            print(f"     Documento: {doc_id if doc_id else 'No configurado'}")
            print(f"     Foto: {foto if foto else 'No configurada'}")
        return data
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)
        return None

def test_duplicate_documento(token):
    """7. Intentar crear usuario con documento_id duplicado"""
    print("\n🚫 TEST 7: Intentar crear usuario con documento_id DUPLICADO")
    response = requests.post(
        f"{BASE_URL}/users/",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "email": "pedro.lopez@callcenter.com",
            "first_name": "Pedro",
            "last_name": "López",
            "documento_id": "CC-987654321",  # Documento duplicado
            "role": "AGENT",
            "password": "DuplicateDoc123!",
            "password_confirm": "DuplicateDoc123!"
        }
    )
    
    if response.status_code == 400:
        print("✅ Validación funcionando correctamente")
        print(f"   Error esperado: {response.json()}")
    else:
        print(f"⚠️ Respuesta inesperada: {response.status_code}")
        print(response.text)

def main():
    """Ejecutar todas las pruebas"""
    print("\n" + "="*60)
    print("  PRUEBAS DE documento_id y foto_perfil")
    print("="*60)
    
    # 1. Login
    token = test_login()
    if not token:
        print("\n❌ No se pudo obtener token. Abortando pruebas.")
        return
    
    # 2. Ver perfil actual
    profile = test_get_profile(token)
    if not profile:
        return
    
    user_id = profile['id']
    
    # 3. Actualizar perfil del admin
    test_update_profile(token, user_id)
    
    # 4. Crear agente completo
    test_create_agent_full(token)
    
    # 5. Crear agente mínimo
    test_create_agent_minimal(token)
    
    # 6. Listar usuarios
    test_list_users(token)
    
    # 7. Intentar duplicar documento_id
    test_duplicate_documento(token)
    
    print("\n" + "="*60)
    print("  ✅ TODAS LAS PRUEBAS COMPLETADAS")
    print("="*60 + "\n")

if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: No se pudo conectar al servidor.")
        print("   Asegúrate de que el servidor esté corriendo: python manage.py runserver")
    except Exception as e:
        print(f"\n❌ ERROR INESPERADO: {e}")
