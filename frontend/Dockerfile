# ==========================================
# ETAPA 1: Construcción (Builder)
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar código fuente y compilar bundle
COPY . .
RUN npm run build

# ==========================================
# ETAPA 2: Servidor Web Estático (Nginx Alpine)
# ==========================================
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
