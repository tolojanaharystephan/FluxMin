FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Étape finale de production
FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle.config.ts ./
COPY --from=build /app/src/infrastructure/database/migrations ./src/infrastructure/database/migrations

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
