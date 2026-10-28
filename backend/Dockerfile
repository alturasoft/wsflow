FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copiar dependencias y schema de Prisma
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependencias de producción y prisma CLI para migraciones
RUN npm install --omit=dev && npm install prisma@^6.4.1

# Generar cliente de Prisma para Linux Alpine
RUN npx prisma generate

# Copiar el build compilado
COPY dist ./dist

EXPOSE 3000

# Ejecutar migraciones pendientes de Prisma y arrancar el servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
