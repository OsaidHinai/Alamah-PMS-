FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY shared/ ./shared/
COPY backend/ ./backend/

# Install backend dependencies
WORKDIR /app/backend
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/server.js"]
