# Dockerfile para Backend Django + Celery
FROM python:3.11-slim

# Variables de entorno para Python
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema necesarias para psycopg2 y otras librerías
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir gunicorn

# Copiar código fuente
COPY . .

# Crear directorio para archivos estáticos y media
RUN mkdir -p /app/staticfiles /app/media

# Dar permisos de ejecución al entrypoint
RUN chmod +x /app/entrypoint.sh

# Exponer puerto
EXPOSE 8000

# Usar entrypoint para inicialización
ENTRYPOINT ["/app/entrypoint.sh"]

# Comando por defecto (puede ser sobrescrito en docker-compose)
CMD ["gunicorn", "callcenter.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
