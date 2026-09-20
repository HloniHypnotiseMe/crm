FROM oven/bun:1.3.12
WORKDIR /app
COPY package.json bun.lock ./
COPY apps ./apps
COPY packages ./packages
RUN bun install --frozen-lockfile
RUN bunx turbo run build --filter=api
ENV NODE_ENV=production PORT=3001
EXPOSE 3001
CMD ["bun", "apps/api/dist/main.js"]
