# Dockerfile para Frontend React (Multi-stage build)

# ========== ETAPA 1: Build ==========
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Argumento para la URL del API (se pasa en build-time)
ARG VITE_API_URL=http://localhost:8000/api
ENV VITE_API_URL=$VITE_API_URL

# Construir la aplicación
RUN npm run build

# ========== ETAPA 2: Servir con Nginx ==========
FROM nginx:alpine

# Copiar build al directorio de Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto 80
EXPOSE 80

# Comando por defecto
CMD ["nginx", "-g", "daemon off;"]
