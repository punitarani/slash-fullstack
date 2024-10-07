import { db } from "@/db/db";
import { scheduledTransfers } from "@/db/scheduled-transfers.db";
import { accounts } from "@/db/accounts.db";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { users } from "@/db/users.db";
import boss from "@/jobs/boss";

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { userId } = params;

  if (!userId || typeof userId !== "string") {
    return NextResponse.json(
      { error: "User ID is required and must be a string" },
      { status: 400 }
    );
  }

  try {
    const scheduledTransfersList = await db
      .select({
        transferId: scheduledTransfers.id,
        sourceAccountId: scheduledTransfers.sourceAccountId,
        sourceAccountName: accounts.name,
        destinationType: scheduledTransfers.destinationType,
        destinationAccountId: scheduledTransfers.destinationAccountId,
        destinationAccountName: accounts.name,
        destinationUserId: scheduledTransfers.destinationUserId,
        destinationUserName: users.fullName,
        amountCents: scheduledTransfers.amountCents,
        transferType: scheduledTransfers.transferType,
        scheduleDate: scheduledTransfers.scheduleDate,
        recurringInterval: scheduledTransfers.recurringInterval,
        recurringFrequency: scheduledTransfers.recurringFrequency,
        eventType: scheduledTransfers.eventType,
        status: scheduledTransfers.status,
        createdAt: scheduledTransfers.createdAt,
        updatedAt: scheduledTransfers.updatedAt,
      })
      .from(scheduledTransfers)
      .leftJoin(accounts, eq(scheduledTransfers.sourceAccountId, accounts.id))
      .leftJoin(users, eq(scheduledTransfers.destinationUserId, users.id))
      .where(eq(accounts.userId, userId))
      .execute();

    return NextResponse.json(scheduledTransfersList, { status: 200 });
  } catch (error) {
    console.error("Error fetching scheduled transfers for user:", error);
    return NextResponse.json(
      { error: "Failed to fetch scheduled transfers" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { userId } = params;
  const transferId = req.nextUrl.searchParams.get("transferId");

  if (
    !userId ||
    typeof userId !== "string" ||
    !transferId ||
    typeof transferId !== "string"
  ) {
    return NextResponse.json(
      { error: "User ID and Transfer ID are required and must be strings" },
      { status: 400 }
    );
  }

  try {
    // Fetch the scheduled transfer
    const scheduledTransfer = await db
      .select()
      .from(scheduledTransfers)
      .where(eq(scheduledTransfers.id, transferId))
      .execute()
      .then((res) => res[0]);

    if (!scheduledTransfer) {
      return NextResponse.json(
        { error: "Scheduled transfer not found" },
        { status: 404 }
      );
    }

    // Verify the transfer belongs to the user
    const account = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, scheduledTransfer.sourceAccountId))
      .execute()
      .then((res) => res[0]);

    // Update the status to 'deleted'
    await db
      .update(scheduledTransfers)
      .set({
        status: "deleted",
        updatedAt: new Date(),
      })
      .where(eq(scheduledTransfers.id, transferId))
      .execute();

    // Remove the job from pg-boss if jobId exists
    if (scheduledTransfer.jobId) {
      await boss.cancel(scheduledTransfer.id, scheduledTransfer.jobId);
    }

    return NextResponse.json(
      { message: "Scheduled transfer deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting scheduled transfer:", error);
    return NextResponse.json(
      { error: "Failed to delete scheduled transfer" },
      { status: 500 }
    );
  }
}
