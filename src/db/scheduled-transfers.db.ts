import { pgTable, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { accounts } from "./accounts.db";
import { users } from "./users.db";

export const scheduledTransfers = pgTable("scheduled_transfers", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  accountId: varchar("account_id")
    .notNull()
    .references(() => accounts.id),
  type: varchar("type").notNull(), // user or account
  entityId: varchar("entity_id").notNull(),
  amountCents: integer("amount_cents").notNull(),
  transferType: varchar("transfer_type").notNull(), // datetime, recurring, event
  scheduleDate: timestamp("schedule_date"),
  recurringInterval: integer("recurring_interval"),
  recurringFrequency: varchar("recurring_frequency"),
  eventType: varchar("event_type"),
  status: varchar("status").notNull().default("scheduled"),
  jobId: varchar("job_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ScheduledTransfer = typeof scheduledTransfers.$inferSelect;
