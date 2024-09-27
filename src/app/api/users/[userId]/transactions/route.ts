import { NextResponse } from "next/server";
import { transactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { db } from "@/db/db";

export async function GET(
	request: Request,
	{ params }: { params: { userId: string } },
) {
	const userId = params.userId;
	const { searchParams } = new URL(request.url);
	const accountId = searchParams.get("accountId");

	if (!accountId) {
		return NextResponse.json(
			{ error: "Account ID is required" },
			{ status: 400 },
		);
	}

	const transactionList = await db.query.transactions.findMany({
		where: and(eq(transactions.accountId, accountId)),
		orderBy: (transactions, { desc }) => [desc(transactions.createdAt)],
	});

	return NextResponse.json({ transactions: transactionList });
}
