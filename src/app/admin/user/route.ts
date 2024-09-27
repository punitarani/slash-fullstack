import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { users } from "@/db/users.db";
import { createUserJob } from "@/jobs/create-user.job";
import { desc } from "drizzle-orm";

export async function GET() {
	try {
		const allUsers = await db
			.select()
			.from(users)
			.orderBy(desc(users.createdAt));
		return NextResponse.json(allUsers);
	} catch (error) {
		console.error("Failed to fetch users:", error);
		return NextResponse.json(
			{ error: "Failed to fetch users" },
			{ status: 500 },
		);
	}
}

export async function POST() {
	try {
		const result = await createUserJob.triggerAndWait({ params: {} });
		return NextResponse.json(result, { status: 201 });
	} catch (error) {
		console.error("Failed to create user:", error);
		return NextResponse.json(
			{ error: "Failed to create user" },
			{ status: 500 },
		);
	}
}
