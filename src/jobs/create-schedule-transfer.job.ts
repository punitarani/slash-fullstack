import { eq } from "drizzle-orm";

import { db } from "@/db/db";
import { scheduledTransfers } from "@/db/scheduled-transfers.db";
import boss from "@/jobs/boss";

import { createJob } from "./task";
import { scheduledTransferJobName } from "./scheduled-transfer.job";

import type { JobInsert } from "pg-boss";

export const createScheduleTransferJobName = "create-schedule-transfer";

export const createScheduleTransferJob = createJob({
  name: createScheduleTransferJobName,
  handler: createScheduleTransferJobHandler,
});

export async function createScheduleTransferJobHandler(
  job: JobInsert<{
    accountId: string;
    type: "user" | "account";
    entityId: string;
    amount: number;
    transferType: "datetime" | "recurring" | "event";
    scheduleDate?: string;
    recurringInterval?: number;
    recurringFrequency?: "days" | "weeks" | "months";
  }>
) {
  if (!job.data) {
    throw new Error("Job data is required");
  }

  const {
    accountId,
    type,
    entityId,
    amount,
    scheduleDate,
    transferType,
    recurringInterval,
    recurringFrequency,
  } = job.data;

  try {
    // Insert the scheduled transfer into the database
    const scheduledTransfer = await db
      .insert(scheduledTransfers)
      .values({
        accountId,
        type,
        entityId,
        amountCents: Number(amount),
        transferType,
        scheduleDate: scheduleDate ? new Date(scheduleDate) : undefined,
        recurringInterval,
        recurringFrequency,
      })
      .returning({ id: scheduledTransfers.id });

    const transferId = scheduledTransfer[0].id;

    // Schedule the job to run at the given date/time
    if (transferType === "datetime" || transferType === "recurring") {
      const jobId = await boss.sendAfter(
        scheduledTransferJobName,
        {
          params: {
            id: `transfer-${crypto.randomUUID()}-${Date.now()}`,
            data: {
              transferId,
              type,
              amount: Number(amount),
              entityId,
              accountId,
              transferType,
              scheduleDate,
              recurringInterval,
              recurringFrequency,
            },
            name: scheduledTransferJobName,
            deadLetter: "failed-transfers",
            retryDelay: 60,
            retryLimit: 3,
            retryBackoff: true,
            expireInSeconds: 300,
          },
        },
        {},
        new Date(scheduleDate!)
      );

      // Update the scheduled transfer entry with the jobId
      await db
        .update(scheduledTransfers)
        .set({ jobId })
        .where(eq(scheduledTransfers.id, transferId));
    } else if (transferType === "event") {
      // Do nothing
    }

    // Return success
    return { success: true, transferId };
  } catch (error) {
    console.error("Error creating scheduled transfer: ", error);
    throw error;
  }
}
