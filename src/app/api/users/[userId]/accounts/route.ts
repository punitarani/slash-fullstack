import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { accounts } from "@/db/accounts.db";
import { eq } from "drizzle-orm";

export async function GET(
	request: NextRequest,
	{ params }: { params: { userId: string } },
) {
	const userId = params.userId;

	try {
		const userAccounts = await db
			.select()
			.from(accounts)
			.where(eq(accounts.userId, userId));

		return NextResponse.json(userAccounts);
	} catch (error) {
		console.error("Error fetching user accounts:", error);
		return NextResponse.json(
			{ error: "Failed to fetch user accounts" },
			{ status: 500 },
		);
	}
}
