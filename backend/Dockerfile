FROM node:20-alpine AS base
WORKDIR /app

# Install deps
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install

# Generate Prisma client
FROM base AS prisma
COPY --from=deps /app/node_modules ./node_modules
COPY package.json prisma ./
RUN npx prisma generate

# Build
FROM base AS builder
COPY --from=prisma /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production
FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
EXPOSE 4000
CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
