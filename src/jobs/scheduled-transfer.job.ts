import crypto from "node:crypto";

import { and, eq, sum } from "drizzle-orm";

import { db } from "@/db/db";
import { accounts } from "@/db/accounts.db";
import { scheduledTransfers } from "@/db/scheduled-transfers.db";
import { transactions } from "@/db/transactions.db";
import boss from "./boss";
import { createJob } from "./task";

import type { JobInsert } from "pg-boss";

export interface ScheduledTransferJobData {
  transferId: string;
  accountId: string;
  type: "user" | "account";
  entityId: string;
  amount: number;
  transferType: "datetime" | "recurring" | "event";
  scheduleDate?: string;
  recurringInterval?: number;
  recurringFrequency?: "days" | "weeks" | "months";
}

export const scheduledTransferJobName = "scheduled-transfer";

export const scheduledTransferJob = createJob({
  name: scheduledTransferJobName,
  handler: async (job: JobInsert<ScheduledTransferJobData>) => {
    if (!job.data) {
      throw new Error("Job data is required");
    }

    const {
      transferId,
      accountId,
      type,
      entityId,
      amount,
      transferType,
      recurringInterval,
      recurringFrequency,
      scheduleDate,
    } = job.data;

    try {
      // Check if the source account exists
      const sourceAccount = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .limit(1);

      if (sourceAccount.length === 0) {
        throw new Error("Source account not found");
      }

      const destinationAccountId = await (async () => {
        if (type === "account") {
          // Check if the destination account exists and belongs to the same user
          const destinationAccount = await db
            .select()
            .from(accounts)
            .where(eq(accounts.id, entityId))
            .limit(1);

          if (destinationAccount.length === 0) {
            throw new Error("Destination account not found");
          }

          // Assert that the destination account belongs to the same user
          if (destinationAccount[0].userId !== sourceAccount[0].userId) {
            throw new Error(
              "Cannot transfer to an account owned by a different user"
            );
          }

          return {
            entityId,
            name: destinationAccount[0].name,
          };
        }

        // If type is "user", find the user's Primary account
        const userAccount = await db
          .select()
          .from(accounts)
          .where(
            and(eq(accounts.userId, entityId), eq(accounts.name, "Primary"))
          )
          .limit(1);

        if (userAccount.length === 0) {
          throw new Error("Destination user has no default account");
        }
        return {
          entityId: userAccount[0].id,
          name: `Primary (${userAccount[0].userId})`,
        };
      })();
      // Start a transaction
      const res = await db.transaction(async (tx) => {
        // Calculate the source account balance by summing all transactions
        const balanceResult = await tx
          .select({ balance: sum(transactions.amountCents) })
          .from(transactions)
          .where(and(eq(transactions.accountId, accountId)));

        const sourceBalance = Number(balanceResult[0]?.balance ?? 0);

        if (sourceBalance < amount) {
          throw new Error("Insufficient funds");
        }

        const timestamp = new Date();
        const bookTraceId = crypto.randomUUID();
        // Create transaction records
        await tx
          .insert(transactions)
          .values([
            {
              id: crypto.randomUUID(),
              traceId: bookTraceId,
              amountCents: -amount, // Convert dollars to cents
              description: `[Scheduled] Transfer to ${
                type === "user" ? "user" : "account"
              } ${destinationAccountId.name}`,
              type: "book",
              accountId: accountId,
              createdAt: timestamp,
            },
            {
              id: crypto.randomUUID(),
              traceId: bookTraceId,
              amountCents: amount, // Convert dollars to cents
              description: `Transfer from account ${accountId}`,
              type: "book",
              accountId: destinationAccountId.entityId,
              createdAt: timestamp,
            },
          ])
          .returning();
      });

      // If the transfer is recurring, schedule the next transfer
      // Schedule the job to run at the given date/time
      if (transferType === "recurring") {
        // Calculate the next schedule date
        const nextScheduleDate = calculateNextScheduleDate(
          scheduleDate!,
          recurringInterval!,
          recurringFrequency!
        );

        const jobId = await boss.sendAfter(
          scheduledTransferJobName,
          {
            params: {
              id: `transfer-${crypto.randomUUID()}-${Date.now()}`,
              data: {
                transferId,
                type,
                amount: Number(amount),
                entityId,
                accountId,
                transferType,
                recurringInterval,
                recurringFrequency,
              },
              name: scheduledTransferJobName,
              deadLetter: "failed-transfers",
              retryDelay: 60,
              retryLimit: 3,
              retryBackoff: true,
              expireInSeconds: 300,
            },
          },
          {},
          nextScheduleDate
        );

        // Update the scheduled transfer entry with the jobId
        await db
          .update(scheduledTransfers)
          .set({ jobId })
          .where(eq(scheduledTransfers.id, transferId));

        // Update the status to "processing"
        await db
          .update(scheduledTransfers)
          .set({ status: "processing" })
          .where(eq(scheduledTransfers.id, transferId));
      } else if (transferType === "datetime") {
        // Update the status to "completed"
        await db
          .update(scheduledTransfers)
          .set({ status: "completed" })
          .where(eq(scheduledTransfers.id, transferId));
      }

      return { success: true };
    } catch (error) {
      console.error("Transfer failed:", error);

      // Failed
      await db
        .update(scheduledTransfers)
        .set({ status: "failed" })
        .where(eq(scheduledTransfers.id, transferId));

      throw error;
    }
  },
});

function calculateNextScheduleDate(
  scheduleDate: string,
  recurringInterval: number,
  recurringFrequency: "days" | "weeks" | "months"
): Date {
  const date = new Date(scheduleDate);

  if (recurringFrequency === "days") {
    date.setDate(date.getDate() + recurringInterval);
  } else if (recurringFrequency === "weeks") {
    date.setDate(date.getDate() + recurringInterval * 7);
  } else if (recurringFrequency === "months") {
    date.setMonth(date.getMonth() + recurringInterval);
  }

  return date;
}
