import * as Sentry from "@sentry/node";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    // Set by CI (e.g. the git sha). Optional — undefined is fine locally.
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend(event) {
      // Strip anything that can carry secrets: request body (passwords on
      // /auth/*), the Authorization bearer, and cookies (refresh token).
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
      }
      return event;
    },
  });
}

export { Sentry };
