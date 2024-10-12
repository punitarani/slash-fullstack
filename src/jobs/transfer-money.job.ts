import crypto from "node:crypto";

import { eq, and, sum } from "drizzle-orm";

import { db } from "@/db/db";
import { accounts } from "@/db/accounts.db";
import { transactions } from "@/db/transactions.db";
import { createJob } from "./task";

import type { JobInsert } from "pg-boss";

export interface TransferMoneyJobData {
  accountId: string;
  type: "user" | "account";
  entityId: string;
  amount: number;
}

export const transferMoneyJobName = "transfer-money";

export const transferMoneyJob = createJob({
  name: transferMoneyJobName,
  handler: async (job: JobInsert<TransferMoneyJobData>) => {
    const { accountId, type, entityId, amount } = job.data!;

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
              description: `Transfer to ${
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

      return { success: true };
    } catch (error) {
      console.error("Transfer failed:", error);
      throw error;
    }
  },
});
