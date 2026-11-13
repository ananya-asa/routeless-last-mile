FROM node:20-alpine

WORKDIR /app

# Install build dependencies for better-sqlite3 compilation
RUN apk add --no-cache python3 make g++

COPY package.json tsconfig.json ./

RUN npm install

COPY src/ ./src/

# Ensure data directory exists
RUN mkdir -p /data

ENV PORT=3000
ENV DB_PATH=/data/routeless.db

EXPOSE 3000

CMD ["npm", "run", "dev"]

