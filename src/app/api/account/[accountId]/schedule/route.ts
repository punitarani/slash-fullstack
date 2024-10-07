import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/db";
import { scheduledTransfers } from "@/db/scheduled-transfers.db";
import { scheduleTransferAtDatetimeJob } from "@/jobs/schedule-transfer.job";
import { eq } from "drizzle-orm";
import { parseISO } from "date-fns";

const datetimeTransferSchema = z.object({
  transferType: z.literal("datetime"),
  scheduleDate: z.string().datetime(),
  recurringInterval: z.null().optional(),
  recurringFrequency: z.null().optional(),
});

const recurringTransferSchema = z.object({
  transferType: z.literal("recurring"),
  scheduleDate: z.string().datetime(),
  recurringInterval: z.number().positive(),
  recurringFrequency: z.enum(["days", "weeks", "months"]),
});

const eventTransferSchema = z.object({
  transferType: z.literal("event"),
  eventType: z.string().default("deposit"),
});

const scheduleTransferRequestBodySchema = z
  .object({
    type: z.enum(["user", "account"]),
    destinationType: z.enum(["user", "account"]),
    destinationAccountId: z.string().nullable().optional(),
    destinationUserId: z.string().nullable().optional(),
    amountCents: z.number().positive(),
  })
  .and(
    z.discriminatedUnion("transferType", [
      datetimeTransferSchema,
      recurringTransferSchema,
      eventTransferSchema,
    ])
  );

export async function POST(
  req: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const { accountId } = params;
    const body = await req.json();

    // Validate the request body
    const validatedBody = scheduleTransferRequestBodySchema.parse(body);

    // If the destination is an account, the destinationAccountId is required
    if (
      validatedBody.destinationType === "account" &&
      !validatedBody.destinationAccountId
    ) {
      return NextResponse.json(
        { error: "Destination account ID is required" },
        { status: 400 }
      );
    }

    // If the destination is a user, the destinationUserId is required
    if (
      validatedBody.destinationType === "user" &&
      !validatedBody.destinationUserId
    ) {
      return NextResponse.json(
        { error: "Destination user ID is required" },
        { status: 400 }
      );
    }

    // Create a scheduled transfer record with status "submitted"
    const [scheduledTransfer] = await db
      .insert(scheduledTransfers)
      .values({
        sourceAccountId: accountId,
        destinationType: validatedBody.destinationType,
        destinationAccountId: validatedBody.destinationAccountId ?? null,
        destinationUserId: validatedBody.destinationUserId ?? null,
        amountCents: validatedBody.amountCents,
        transferType: validatedBody.transferType,
        ...(validatedBody.transferType === "datetime"
          ? {
              scheduleDate: new Date(validatedBody.scheduleDate),
              recurringInterval: null,
              recurringFrequency: null,
              eventType: null,
            }
          : validatedBody.transferType === "recurring"
          ? {
              scheduleDate: new Date(validatedBody.scheduleDate),
              recurringInterval: validatedBody.recurringInterval,
              recurringFrequency: validatedBody.recurringFrequency,
              eventType: null,
            }
          : validatedBody.transferType === "event"
          ? {
              scheduleDate: null,
              recurringInterval: null,
              recurringFrequency: null,
              eventType: validatedBody.eventType,
            }
          : {}),
        status: "submitted", // Initial status
      })
      .returning();

    // Schedule the transfer job if it's datetime or recurring
    let jobId: string | undefined = undefined;

    if (
      validatedBody.transferType === "datetime" ||
      validatedBody.transferType === "recurring"
    ) {
      const scheduleDate = parseISO(validatedBody.scheduleDate);

      jobId = await scheduleTransferAtDatetimeJob.trigger(
        {
          params: {
            scheduledTransferId: scheduledTransfer.id,
          },
        },
        // TODO: Fix this
        // {
        //   scheduleDate,
        // }
      );

      // Update the scheduled transfer with the jobId and status
      await db
        .update(scheduledTransfers)
        .set({
          jobId,
          status: "pending", // Update status to "pending" after job is scheduled
          updatedAt: new Date(),
        })
        .where(eq(scheduledTransfers.id, scheduledTransfer.id));
    } else if (validatedBody.transferType === "event") {
      await db
        .update(scheduledTransfers)
        .set({
          status: "pending",
          updatedAt: new Date(),
        })
        .where(eq(scheduledTransfers.id, scheduledTransfer.id));
    }

    return NextResponse.json(
      { success: true, scheduledTransferId: scheduledTransfer.id, jobId },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error scheduling transfer:", error);
    return NextResponse.json(
      { error: error.message || "Failed to schedule transfer" },
      { status: 500 }
    );
  }
}
