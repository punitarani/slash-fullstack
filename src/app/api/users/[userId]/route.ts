import { NextResponse } from "next/server";
import { users, accounts, transactions } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db/db";

export async function GET(
	request: Request,
	{ params }: { params: { userId: string } },
) {
	const userId = params.userId;

	// Fetch user
	const user = await db.query.users.findFirst({
		where: eq(users.id, userId),
	});

	if (!user) {
		return NextResponse.json({ error: "User not found" }, { status: 404 });
	}

	// Fetch accounts with balance
	const accountsWithBalance = await db
		.select({
			id: accounts.id,
			name: accounts.name,
			accountNumber: accounts.accountNumber,
			routingNumber: accounts.routingNumber,
			balance: sql<string>`COALESCE(SUM(${transactions.amountCents}), 0)`.as(
				"balance",
			),
			createdAt: accounts.createdAt,
		})
		.from(accounts)
		.leftJoin(transactions, eq(accounts.id, transactions.accountId))
		.where(eq(accounts.userId, userId))
		.groupBy(accounts.id);

	return NextResponse.json({
		user,
		accounts: accountsWithBalance.sort(
			(a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
		),
	});
}
