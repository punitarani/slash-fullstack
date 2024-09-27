import { pgTable, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { accounts } from "./accounts.db";

// Define the transaction type enum

export const transactions = pgTable("transactions", {
	id: varchar("id").primaryKey(),
	accountId: varchar("account_id").references(() => accounts.id),
	traceId: varchar("trace_id").notNull(),
	amountCents: integer("amount_cents").notNull(),
	description: varchar("description").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	type: varchar("type").notNull(), // 'wire' or 'book'
});
