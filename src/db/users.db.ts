import { pgTable, varchar, timestamp, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
	id: varchar("id").primaryKey(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
	firstName: varchar("first_name").notNull(),
	lastName: varchar("last_name").notNull(),
	email: varchar("email").notNull().unique(),
	fullName: text("full_name")
		.notNull()
		.generatedAlwaysAs(
			sql`CASE WHEN first_name IS NULL THEN last_name
				 WHEN last_name IS NULL THEN first_name
				 ELSE first_name || ' ' || last_name END`,
		),
});

export type User = typeof users.$inferSelect;
