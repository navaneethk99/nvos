import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth/minimal";

import { db } from "@/db";
import * as schema from "@/db/schema";

const secret =
  process.env.BETTER_AUTH_SECRET ??
  (process.env.NEXT_PHASE === "phase-production-build"
    ? "nvos-build-only-secret-not-for-runtime"
    : undefined);
const googleClientId =
  process.env.GOOGLE_CLIENT_ID ??
  (process.env.NEXT_PHASE === "phase-production-build"
    ? "nvos-build-only-google-client-id"
    : undefined);
const googleClientSecret =
  process.env.GOOGLE_CLIENT_SECRET ??
  (process.env.NEXT_PHASE === "phase-production-build"
    ? "nvos-build-only-google-client-secret"
    : undefined);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  secret,
  socialProviders: {
    google: {
      clientId: googleClientId as string,
      clientSecret: googleClientSecret as string,
    },
  },
});
