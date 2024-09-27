import { pgTable, varchar, jsonb } from "drizzle-orm/pg-core";

export const jobResults = pgTable("job_results", {
	id: varchar("id").primaryKey(),
	response: jsonb("response").notNull(),
});
