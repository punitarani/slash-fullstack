import { z } from "zod";

import {
  createScheduleTransferJob,
  createScheduleTransferJobName,
} from "@/jobs/create-schedule-transfer.job";

import { type NextRequest, NextResponse } from "next/server";

export const scheduleTransferRequestBodySchema = z.object({
  accountId: z.string(),
  type: z.enum(["user", "account"]),
  entityId: z.string(),
  amount: z.number().positive(),
  transferType: z.enum(["datetime", "recurring", "event"]),
  scheduleDate: z.string().datetime().nullable().optional(),
  recurringInterval: z.number().int().positive().nullable().optional(),
  recurringFrequency: z.enum(["days", "weeks", "months"]).nullable().optional(),
  eventType: z.string().nullable().optional().default("deposit"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate the request body
    const {
      accountId,
      type,
      entityId,
      amount,
      scheduleDate,
      transferType,
      recurringInterval,
      recurringFrequency,
    } = scheduleTransferRequestBodySchema.parse(body);

    // Trigger the first job and wait for the result
    await createScheduleTransferJob.trigger({
      params: {
        id: `schedule-${accountId}-${Date.now()}`,
        name: createScheduleTransferJobName,
        expireInSeconds: 300,
        data: {
          accountId,
          type,
          entityId,
          amount,
          transferType,
          scheduleDate,
          recurringInterval,
          recurringFrequency,
        },
        retryLimit: 3,
        retryDelay: 60,
        retryBackoff: true,
        deadLetter: "failed-schedule",
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to schedule transfer" },
      { status: 500 }
    );
  }
}
