import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/db";
import { accounts } from "@/db/accounts.db";
import { transactions } from "@/db/transactions.db";
import { eq, and, sum } from "drizzle-orm";

// Define the schema for the request body
export const transferRequestBodySchema = z.object({
	type: z.enum(["user", "account"]),
	entityId: z.string(),
	amount: z.number().positive(),
});

export async function POST(
	req: NextRequest,
	{ params }: { params: { accountId: string } },
) {
	try {
		const { accountId } = params;
		const body = await req.json();

		// Validate the request body
		const { type, entityId, amount } = transferRequestBodySchema.parse(body);

		// Check if the source account exists
		const sourceAccount = await db
			.select()
			.from(accounts)
			.where(eq(accounts.id, accountId))
			.limit(1);

		if (sourceAccount.length === 0) {
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
					.limit(1);

				if (destinationAccount.length === 0) {
					return NextResponse.json(
						{ error: "Destination account not found" },
						{ status: 404 },
					);
				}

				// Assert that the destination account belongs to the same user
				if (destinationAccount[0].userId !== sourceAccount[0].userId) {
					return NextResponse.json(
						{
							error: "Cannot transfer to an account owned by a different user",
						},
						{ status: 403 },
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
				return NextResponse.json(
					{ error: "Destination user has no default account" },
					{ status: 404 },
				);
			}
			return {
				entityId: userAccount[0].id,
				name: `Primary (${userAccount[0].userId})`,
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
				.where(and(eq(transactions.accountId, accountId)));

			const sourceBalance = Number(balanceResult[0]?.balance ?? 0);

			console.log({ sourceBalance, amount });
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
		});

		if (res instanceof NextResponse) {
			return res;
		}

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (error) {
		return NextResponse.json({ error: "Transfer failed" }, { status: 500 });
	}
}
