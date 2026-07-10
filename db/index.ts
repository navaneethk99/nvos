import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

// The placeholder lets Next statically evaluate route modules; Neon is only
// contacted when an auth request is made, at which point missing setup fails.
const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://nvos:nvos@localhost:5432/nvos?sslmode=require";

export const db = drizzle({ client: neon(connectionString), schema });
