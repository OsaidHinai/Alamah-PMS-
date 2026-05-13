FROM node:20-alpine

WORKDIR /app

# Copy only the self-contained backend package
COPY backend/package*.json ./
COPY backend/prisma/ ./prisma/
COPY backend/src/ ./src/
COPY backend/tsconfig.json ./tsconfig.json

# Install dependencies (postinstall runs prisma generate automatically)
RUN npm install

# Compile TypeScript → dist/
RUN npm run build

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/server.js"]
