# Exportar KPIs de Campaña a PDF - Backend

## Historia de Usuario

**Yo como** [Jefe de Centro/Jefe de Campaña]  
**Requiero** [exportar todos los KPI relacionados a la campaña]  
**Para** [disponer de las métricas cuando requiera]

## Endpoint Implementado

### `GET /api/kpis/jefe-campana/exportar-pdf/`

**Descripción**: Genera y descarga un archivo PDF con todos los KPIs de la campaña asignada al Jefe de Campaña.

**Autenticación**: Requerida (JWT Token)

**Permisos**: `IsJefeCampana` o `IsAdmin`

---

## Query Parameters

| Parámetro | Tipo | Requerido | Descripción | Ejemplo |
|-----------|------|-----------|-------------|---------|
| `campana_id` | integer | No* | ID de la campaña a exportar | `1` |
| `fecha_desde` | string (YYYY-MM-DD) | No | Fecha inicio del período | `2025-10-01` |
| `fecha_hasta` | string (YYYY-MM-DD) | No | Fecha fin del período | `2025-11-19` |

**\* Nota sobre `campana_id`:**
- Si el usuario es **Admin**, debe especificar `campana_id`
- Si el usuario es **Jefe de Campaña** y no envía `campana_id`, el sistema automáticamente usa su campaña activa más reciente

**\* Nota sobre fechas:**
- Si no se envían fechas, el sistema usa el día actual por defecto
- Las fechas no pueden ser futuras
- `fecha_desde` debe ser menor o igual a `fecha_hasta`

---

## Respuesta Exitosa

**Código**: `200 OK`

**Tipo de contenido**: `application/pdf`

**Headers**:
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="KPIs_Campana_NombreCampaña_20251001_20251119.pdf"
```

**Contenido del PDF**:

1. **Encabezado con logo** (si está disponible)
2. **Título**: "Reporte de KPIs de Campaña"
3. **Información General**:
   - Nombre de la campaña
   - Jefe de Campaña
   - Total de Equipos
   - Total de Agentes
   - Período del reporte
   - Fecha y hora de generación
4. **Indicadores Principales**:
   - Llamadas Activas
   - Agentes Disponibles
   - Llamadas del Período
   - Tiempo Promedio de Llamada
   - Ventas Realizadas
   - Tasa de Conversión
5. **Ranking de Equipos por Ventas** (Top 10):
   - Posición
   - Nombre del Equipo
   - Coordinador
   - Ventas

---

## Respuestas de Error

### 400 Bad Request

**Caso 1: Admin sin campana_id**
```json
{
  "detail": "Los administradores deben especificar campana_id"
}
```

**Caso 2: Fechas inválidas**
```json
{
  "detail": "Fechas inválidas. Usa formato YYYY-MM-DD"
}
```

**Caso 3: Fecha inicio mayor que fecha fin**
```json
{
  "detail": "fecha_desde no puede ser posterior a fecha_hasta"
}
```

**Caso 4: Fechas futuras**
```json
{
  "detail": "No se pueden elegir fechas futuras"
}
```

### 403 Forbidden

**Caso: Usuario sin permiso para la campaña**
```json
{
  "detail": "No tienes permiso para exportar KPIs de esta campaña"
}
```

### 404 Not Found

**Caso 1: Campaña no existe**
```json
{
  "detail": "Not found."
}
```

**Caso 2: Jefe sin campaña asignada**
```json
{
  "detail": "No hay una campaña asignada en el momento"
}
```

---

## Ejemplos de Uso

### Ejemplo 1: Exportar con todos los parámetros

```http
GET /api/kpis/jefe-campana/exportar-pdf/?campana_id=1&fecha_desde=2025-10-01&fecha_hasta=2025-11-19
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

### Ejemplo 2: Exportar campaña activa del mes actual

```http
GET /api/kpis/jefe-campana/exportar-pdf/?fecha_desde=2025-11-01&fecha_hasta=2025-11-19
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

### Ejemplo 3: Exportar solo del día actual

```http
GET /api/kpis/jefe-campana/exportar-pdf/?campana_id=1
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

### Ejemplo 4: Con cURL

```bash
curl -X GET \
  "http://localhost:8000/api/kpis/jefe-campana/exportar-pdf/?campana_id=1&fecha_desde=2025-10-01&fecha_hasta=2025-11-19" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  --output reporte_kpis.pdf
```

---

## Validaciones Implementadas

✅ **Autenticación JWT**: El usuario debe estar autenticado  
✅ **Permisos**: Solo Jefes de Campaña o Admins pueden acceder  
✅ **Validación de campaña**: El Jefe solo puede exportar KPIs de su propia campaña  
✅ **Formato de fechas**: Debe ser YYYY-MM-DD  
✅ **Rango de fechas**: fecha_desde ≤ fecha_hasta  
✅ **Fechas no futuras**: No se permiten fechas posteriores al día actual  
✅ **Campaña activa automática**: Si no se especifica campaña, busca la más reciente activa del jefe  

---

## Detalles Técnicos

### Cálculo de KPIs

1. **Llamadas Activas**: Llamadas con estado `EN_CURSO` en tiempo real
2. **Agentes Disponibles**: Agentes con estado actual `DISPONIBLE`
3. **Llamadas del Período**: Total de llamadas iniciadas en el rango de fechas
4. **Tiempo Promedio**: Promedio de duración de llamadas contestadas
5. **Ventas Realizadas**: Llamadas contestadas que NO tienen estado `NO_VENTA`
6. **Tasa de Conversión**: `(Ventas / Llamadas Contestadas) * 100`
7. **Ranking de Equipos**: Ordenados por cantidad de ventas (descendente)

### Estructura del PDF

- **Tamaño**: A4
- **Márgenes**: 30pt (superior, izquierdo, derecho), 18pt (inferior)
- **Fuentes**: Helvetica y Helvetica-Bold
- **Colores**: 
  - Encabezados: #2d3748 (gris oscuro)
  - Títulos: #1a365d (azul oscuro)
  - Fondo info: #e2e8f0 (gris claro)
- **Logo**: Se busca en múltiples rutas (static, media, frontend)
- **Tablas**: Bordes grises de 0.5pt, padding de 8-10pt

---

## Dependencias Requeridas

```
reportlab==4.2.5
```

Asegúrate de que esté en `requirements.txt` y ejecuta:

```bash
pip install reportlab
```

---

## Notas Importantes

1. **Logo**: El sistema busca el archivo `call-center-service-blue.png` en varias rutas. Si no lo encuentra, continúa sin logo
2. **Filename**: El nombre del archivo PDF incluye el nombre de la campaña, fecha desde y fecha hasta
3. **Ranking limitado**: Solo muestra el Top 10 de equipos
4. **Agentes de múltiples equipos**: Si un agente pertenece a varios equipos, se cuenta solo una vez
5. **Timezone**: Todas las consultas usan el timezone configurado en Django

---

## Testing

Usa el archivo `test_exportar_kpis_campana_pdf.http` para probar el endpoint con diferentes casos:

1. ✅ Login como Jefe de Campaña
2. ✅ Exportar con campaña y fechas específicas
3. ✅ Exportar sin especificar campaña
4. ✅ Exportar solo del día actual
5. ✅ Exportar sin parámetros

---

## Integración con Frontend

El frontend deberá:

1. Mostrar un botón "Exportar" en el módulo de KPIs
2. Al hacer clic, hacer una petición GET al endpoint con el token JWT
3. Manejar la descarga del archivo PDF
4. Mostrar mensaje de confirmación "Exportación exitosa"
5. Manejar errores (sin permisos, fechas inválidas, etc.)

Ejemplo en JavaScript:

```javascript
async function exportarKPIs(campanaId, fechaDesde, fechaHasta) {
  try {
    const response = await fetch(
      `/api/kpis/jefe-campana/exportar-pdf/?campana_id=${campanaId}&fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Error al exportar');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KPIs_Campana_${campanaId}.pdf`;
    a.click();
    
    alert('Exportación exitosa');
  } catch (error) {
    alert('Error al exportar: ' + error.message);
  }
}
```

---

## Changelog

- **2025-11-19**: Implementación inicial del endpoint de exportación de KPIs a PDF para Jefe de Campaña
