# syntax=docker/dockerfile:1

# ---- build stage: compile TS, build native deps (bcrypt) with toolchain ----
FROM node:24-slim AS build
WORKDIR /app
# bcrypt/pg may need a compiler if no prebuilt binary matches the platform.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
# Drop devDeps from node_modules so only prod (incl. compiled native) is copied.
RUN npm prune --omit=dev

# ---- runtime stage: slim, no toolchain ----
FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# assets/ (PDF Cyrillic font) and migrations/ live at backend root, NOT in dist/.
COPY assets ./assets
COPY migrations ./migrations
# Writable dir for generated reports (controller mkdirs subpaths on demand).
# Backed by a named volume in compose so reports survive container rebuilds.
RUN mkdir -p storage/reports
EXPOSE 8000
CMD ["node", "dist/server.js"]
