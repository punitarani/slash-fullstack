import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { accounts, transactions } from "@/db/schema";
import { and, desc, eq, ilike, inArray } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const { userId } = params;

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    // Fetch all accounts associated with the user
    const userAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .execute();

    // Extract account IDs for fetching transactions
    const accountIds = userAccounts.map((account) => account.id);

    if (accountIds.length === 0) {
      return NextResponse.json({ accounts: [] });
    }

    // Fetch all transactions for the user's accounts
    // Description starts with "Scheduled"
    const accountTransactions = await db
      .select()
      .from(transactions)
      .where(
        and(
          inArray(transactions.accountId, accountIds),
          ilike(transactions.description, "%[Scheduled]%")
        )
      )
      .orderBy(desc(transactions.createdAt))
      .execute();

    // Ensure accountTransactions is an array
    const transactionsArray = accountTransactions || [];

    return NextResponse.json({ transactions: transactionsArray });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch accounts and transactions" },
      { status: 500 }
    );
  }
}
