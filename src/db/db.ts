import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = "postgres://postgres@localhost:5432/slash";

const client = postgres(connectionString);

declare global {
	var database: PostgresJsDatabase<typeof schema>;
}

if (!global.database) {
	global.database = drizzle(client, { schema });
}
export const db = global.database;
