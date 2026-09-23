FROM oven/bun:1.3.12
WORKDIR /app
COPY package.json bun.lock ./
COPY apps ./apps
COPY packages ./packages
RUN bun install --frozen-lockfile
ARG API_URL=http://localhost:3001
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV API_URL=$API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN bunx turbo run build --filter=app
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["bun", "apps/app/node_modules/next/dist/bin/next", "start", "-p", "3000"]
