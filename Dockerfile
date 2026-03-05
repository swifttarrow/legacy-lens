FROM node:22-slim

WORKDIR /app

# Install pnpm and git (for cloning DOOM repo)
RUN apt-get update -qq && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/* && npm install -g pnpm

# Clone DOOM source (baked in for /api/file serving in production)
RUN git clone --depth 1 https://github.com/id-Software/DOOM.git /app/doom

# Install dependencies (tree-sitter ships prebuilt binaries — no native build needed)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Compile TypeScript → dist/
COPY tsconfig.json ./
COPY src/ ./src/
RUN pnpm exec tsc

ENV NODE_ENV=production
ENV DOOM_REPO_DIR=/app/doom
EXPOSE 3000

CMD ["node", "dist/server/index.js"]
