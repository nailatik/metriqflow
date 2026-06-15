# syntax=docker/dockerfile:1

# Single stage: Next 16 `next start` needs the full app tree at runtime
# (next.config.ts imports ./i18n/request.ts, next-intl loads ./messages, etc).
# NEXT_PUBLIC_* are baked at build time, so they arrive as build args.
FROM node:24-slim
WORKDIR /app

# NOTE: NODE_ENV stays unset here so `npm ci` installs devDeps
# (tailwind/postcss/autoprefixer/typescript) that `next build` needs.
# It's flipped to production after the build, for `next start` runtime.
COPY package*.json ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_BOT_USERNAME
ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_BOT_USERNAME=$NEXT_PUBLIC_BOT_USERNAME \
    NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN

RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
