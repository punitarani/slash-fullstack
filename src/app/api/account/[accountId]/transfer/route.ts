import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/db";
import { accounts } from "@/db/accounts.db";
import { transactions } from "@/db/transactions.db";
import { scheduledTransfers } from "@/db/scheduled-transfers.db";
import { eq, and, sum } from "drizzle-orm";
import { scheduleTransferAtDatetimeJob } from "@/jobs/schedule-transfer.job";
import crypto from "node:crypto";

export const transferRequestBodySchema = z.object({
	type: z.enum(["user", "account"]),
	entityId: z.string(),
	amount: z.number().positive(),
	scheduledTransferId: z.string().uuid().optional(),
});

export async function POST(
	req: NextRequest,
	{ params }: { params: { accountId: string } },
) {
	try {
		const { accountId } = params;
		const body = await req.json();

		// Validate the request body
		const { type, entityId, amount, scheduledTransferId } = transferRequestBodySchema.parse(body);

		// Check if the source account exists
		const sourceAccount = await db
			.select()
			.from(accounts)
			.where(eq(accounts.id, accountId))
			.limit(1)
			.then((rows) => rows[0]);

		if (!sourceAccount) {
			return NextResponse.json(
				{ error: "Source account not found" },
				{ status: 404 },
			);
		}

		const destinationAccountId = await (async () => {
			if (type === "account") {
				// Check if the destination account exists and belongs to the same user
				const destinationAccount = await db
					.select()
					.from(accounts)
					.where(eq(accounts.id, entityId))
					.limit(1)
					.then((rows) => rows[0]);

				if (!destinationAccount) {
					return NextResponse.json(
						{ error: "Destination account not found" },
						{ status: 404 },
					);
				}

				// Assert that the destination account belongs to the same user
				if (destinationAccount.userId !== sourceAccount.userId) {
					return NextResponse.json(
						{
							error: "Cannot transfer to an account owned by a different user",
						},
						{ status: 403 },
					);
				}

				return {
					entityId,
					name: destinationAccount.name,
				};
			}

			// If type is "user", find the user's Primary account
			const userAccount = await db
				.select()
				.from(accounts)
				.where(
					and(
						eq(accounts.userId, entityId),
						eq(accounts.name, "Primary")
					)
				)
				.limit(1)
				.then((rows) => rows[0]);

			if (!userAccount) {
				return NextResponse.json(
					{ error: "Destination user has no default account" },
					{ status: 404 },
				);
			}
			return {
				entityId: userAccount.id,
				name: `Primary (${userAccount.userId})`,
			};
		})();

		if (destinationAccountId instanceof NextResponse) {
			return destinationAccountId;
		}

		// Start a transaction
		const res = await db.transaction(async (tx) => {
			// Calculate the source account balance by summing all transactions
			const balanceResult = await tx
				.select({ balance: sum(transactions.amountCents) })
				.from(transactions)
				.where(eq(transactions.accountId, accountId))
				.groupBy(transactions.accountId)
				.limit(1);

			const sourceBalance = Number(balanceResult[0]?.balance ?? 0);

			if (sourceBalance < amount) {
				return NextResponse.json(
					{ error: "Insufficient funds" },
					{ status: 400 },
				);
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
						description: `Transfer to ${type === "user" ? "user" : "account"} ${
							destinationAccountId.name
						}`,
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

			if (scheduledTransferId) {
				// This transfer was triggered by a scheduled job
				const scheduledTransfer = await tx
					.select()
					.from(scheduledTransfers)
					.where(eq(scheduledTransfers.id, scheduledTransferId))
					.limit(1)
					.then((rows) => rows[0]);

				if (scheduledTransfer) {
					// Update the scheduled transfer status to "successful"
					await tx
						.update(scheduledTransfers)
						.set({
							status: "successful",
							updatedAt: new Date(),
						})
						.where(eq(scheduledTransfers.id, scheduledTransfer.id));
				}
			} else {
				// This is a user-initiated transfer
				// Optionally, you can log or handle this case differently
			}

			// Trigger any On Deposit scheduled transfers for the destination account
			const isDeposit = amount > 0 && !scheduledTransferId;
			if (isDeposit) {
				// Fetch pending "On Deposit" scheduled transfers for this account
				const onDepositTransfers = await db
					.select()
					.from(scheduledTransfers)
					.where(
						and(
							eq(scheduledTransfers.sourceAccountId, destinationAccountId.entityId),
							eq(scheduledTransfers.transferType, "event"),
							eq(scheduledTransfers.eventType, "deposit"),
							eq(scheduledTransfers.status, "pending")
						)
					);

				for (const transfer of onDepositTransfers) {
					const jobId = await scheduleTransferAtDatetimeJob.trigger(
						{
							params: {
								scheduledTransferId: transfer.id,
							},
						},
					);

					// Update the scheduled transfer with the jobId and status
					await db
						.update(scheduledTransfers)
						.set({
							jobId,
							status: "processing",
							updatedAt: new Date(),
						})
						.where(eq(scheduledTransfers.id, transfer.id));
				}
			}
		});

		if (res instanceof NextResponse) {
			return res;
		}

		// Prepare response message
		const responseMessage: any = { success: true };

		if (scheduledTransferId) {
			responseMessage.message = "Transfer was executed as part of a scheduled transfer.";
			const scheduledTransfer = await db
				.select()
				.from(scheduledTransfers)
				.where(eq(scheduledTransfers.id, scheduledTransferId))
				.limit(1)
				.then((rows) => rows[0]);

			if (scheduledTransfer) {
				responseMessage.triggeredBy = "scheduled_job";
				responseMessage.rule = scheduledTransfer.transferType === "recurring"
					? `Recurring transfer every ${scheduledTransfer.recurringInterval} ${scheduledTransfer.recurringFrequency}`
					: `Scheduled at ${scheduledTransfer.scheduleDate}`;
			}
		} else {
			responseMessage.message = "Transfer was successfully submitted.";
		}

		return NextResponse.json(responseMessage, { status: 200 });
	} catch (error: any) {
		console.error("Transfer failed:", error);
		// If it's a scheduled transfer, update its status to "failed"
		if (error.scheduledTransferId) {
			await db
				.update(scheduledTransfers)
				.set({
					status: "failed",
					updatedAt: new Date(),
				})
				.where(eq(scheduledTransfers.id, error.scheduledTransferId));
		}
		return NextResponse.json({ error: "Transfer failed" }, { status: 500 });
	}
}
