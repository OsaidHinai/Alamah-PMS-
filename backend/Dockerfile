FROM node:20-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies (postinstall runs prisma generate automatically)
RUN npm install

# Copy the rest of the source
COPY prisma/ ./prisma/
COPY src/ ./src/
COPY tsconfig.json ./tsconfig.json

# Compile TypeScript
RUN npm run build

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/server.js"]
