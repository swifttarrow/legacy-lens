FROM node:22-slim

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Install dependencies (tree-sitter ships prebuilt binaries — no native build needed)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Compile TypeScript → dist/
COPY tsconfig.json ./
COPY src/ ./src/
RUN pnpm exec tsc

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/server/index.js"]
