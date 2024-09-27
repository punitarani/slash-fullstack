import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users.db";

export const accounts = pgTable("accounts", {
	id: varchar("id").primaryKey(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
	name: varchar("name").notNull(),
	accountNumber: varchar("account_number").notNull(),
	routingNumber: varchar("routing_number").notNull(),
	userId: varchar("user_id")
		.notNull()
		.references(() => users.id),
});

export type Account = typeof accounts.$inferSelect;
