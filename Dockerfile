FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install --legacy-peer-deps
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install --omit=dev --legacy-peer-deps
COPY --from=builder /app/dist ./dist
# Logo do PDF dos documentos redigidos.
COPY assets ./assets
# Prompts do fundador (confidenciais) NÃO vão na imagem: montar /app/prompts como volume.
RUN mkdir -p /app/prompts
EXPOSE 3000
CMD ["node", "dist/server.js"]
