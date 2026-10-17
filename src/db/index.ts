import path from "node:path";

import { createDb } from "./client";

const databasePath =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "personal-os.db");

export const db = createDb(databasePath);
