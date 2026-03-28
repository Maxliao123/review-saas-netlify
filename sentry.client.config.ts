import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Performance monitoring: sample 10% of transactions
  tracesSampleRate: 0.1,

  // Session Replay
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.5,

  // Integrations for client-side replay
  integrations: [
    Sentry.replayIntegration(),
  ],
});
