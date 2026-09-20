FROM oven/bun:1.3.12
WORKDIR /app
COPY package.json bun.lock ./
COPY apps ./apps
COPY packages ./packages
RUN bun install --frozen-lockfile
RUN bunx turbo run build --filter=app
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["bun", "apps/app/node_modules/next/dist/bin/next", "start", "-p", "3000"]
