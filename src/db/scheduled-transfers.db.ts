import { pgTable, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { accounts } from "./accounts.db";
import { users } from "./users.db";

export const scheduledTransfers = pgTable("scheduled_transfers", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sourceAccountId: varchar("source_account_id")
    .notNull()
    .references(() => accounts.id),
  destinationType: varchar("destination_type").notNull(),
  destinationAccountId: varchar("destination_account_id")
    .references(() => accounts.id),
  destinationUserId: varchar("destination_user_id").references(() => users.id),
  amountCents: integer("amount_cents").notNull(),
  transferType: varchar("transfer_type").notNull(),
  scheduleDate: timestamp("schedule_date"),
  recurringInterval: integer("recurring_interval"),
  recurringFrequency: varchar("recurring_frequency"),
  eventType: varchar("event_type"),
  status: varchar("status").notNull().default("submitted"),
  jobId: varchar("job_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ScheduledTransfer = typeof scheduledTransfers.$inferSelect;
