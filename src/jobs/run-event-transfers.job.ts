import { and, eq, sum } from "drizzle-orm";
import type { JobInsert } from "pg-boss";

import { db } from "@/db/db";
import {
  accounts,
  transactions,
  scheduledTransfers,
  ScheduledTransfer,
} from "@/db/schema";
import { createJob } from "./task";

export interface RunEventTransfersJobData {
  accountId: string;
}

export const runEventTransfersJobName = "run-event-transfers";

export const runEventTransfersJob = createJob({
  name: runEventTransfersJobName,
  handler: async (job: JobInsert<RunEventTransfersJobData>) => {
    if (!job.data) {
      throw new Error("Job data is required");
    }

    const { accountId } = job.data;

    try {
      // Query the scheduled transfers table for pending event transfers for the given accountId
      const pendingTransfers = await db
        .select()
        .from(scheduledTransfers)
        .where(
          and(
            eq(scheduledTransfers.accountId, accountId),
            eq(scheduledTransfers.transferType, "event"),
            eq(scheduledTransfers.status, "scheduled")
          )
        );

      console.log("Pending transfers:", pendingTransfers);

      // Process each pending transfer sequentially
      for (const transfer of pendingTransfers) {
        if (transfer.id) {
          // Directly execute the transfer logic
          await executeTransfer(transfer);

          console.log("Completed transfer:", transfer.id);

          await db
            .update(scheduledTransfers)
            .set({ status: "completed" })
            .where(eq(scheduledTransfers.id, transfer.id));
        }
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to run event transfers:", error);
      throw error;
    }
  },
});

/**
 * Executes the transfer based on the transfer details.
 * @param transfer The scheduled transfer to execute.
 */
async function executeTransfer(transfer: ScheduledTransfer): Promise<void> {
  const { id, accountId, type, entityId, amountCents, transferType } = transfer;

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
        .where(and(eq(accounts.userId, entityId), eq(accounts.name, "Primary")))
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
    await db.transaction(async (tx) => {
      // Calculate the source account balance by summing all transactions
      const balanceResult = await tx
        .select({ balance: sum(transactions.amountCents) })
        .from(transactions)
        .where(and(eq(transactions.accountId, accountId)));

      const sourceBalance = Number(balanceResult[0]?.balance ?? 0);

      if (sourceBalance < amountCents) {
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
            amountCents: -amountCents,
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
            amountCents: amountCents,
            description: `[Scheduled] Transfer from account ${accountId}`,
            type: "book",
            accountId: destinationAccountId.entityId,
            createdAt: timestamp,
          },
        ])
        .returning();
    });

    // Update the status to "completed"
    await db
      .update(scheduledTransfers)
      .set({ status: "completed" })
      .where(eq(scheduledTransfers.id, id));
  } catch (error) {
    console.error("Transfer failed:", error);

    // Update the status to "failed"
    await db
      .update(scheduledTransfers)
      .set({ status: "failed" })
      .where(eq(scheduledTransfers.id, id));

    throw error;
  }
}
