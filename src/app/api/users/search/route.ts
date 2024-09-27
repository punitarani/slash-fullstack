import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { sql } from "drizzle-orm";
import { users } from "@/db/users.db";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const query = searchParams.get("q");

	if (!query) {
		const searchedUsers = await db.query.users.findMany({
			limit: 4,
			columns: {
				id: true,
				fullName: true,
				email: true,
			},
		});

		return NextResponse.json(searchedUsers);
	}

	try {
		const searchedUsers = await db.query.users.findMany({
			where: sql`${users.fullName} ILIKE ${`%${query}%`} OR ${
				users.email
			} ILIKE ${`%${query}%`}`,
			columns: {
				id: true,
				fullName: true,
				email: true,
			},
			limit: 4,
		});

		return NextResponse.json(searchedUsers);
	} catch (error) {
		console.error("Error searching users:", error);
		return NextResponse.json(
			{ error: "An error occurred while searching users" },
			{ status: 500 },
		);
	}
}
