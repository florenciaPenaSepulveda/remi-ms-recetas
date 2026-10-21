# ---------------------------------------
# 🏗️ ETAPA 1: Construcción (builder)
# ---------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# ---------------------------------------
# 🪶 ETAPA 2: Imagen final (runtime)
# ---------------------------------------
FROM node:20-alpine AS production

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./

EXPOSE 3002

CMD ["node", "dist/main.js"]
