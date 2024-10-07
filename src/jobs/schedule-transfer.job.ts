// src/jobs/schedule-transfer.job.ts

import crypto from "node:crypto";

import { db } from "@/db/db";
import { scheduledTransfers } from "@/db/scheduled-transfers.db";
import { eq } from "drizzle-orm";

import { createJob } from "./task";

export const scheduleTransferAtDatetimeJob = createJob({
  name: "schedule-transfer-at-datetime",
  handler: async ({ scheduledTransferId }: { scheduledTransferId: string }) => {
    try {
      const scheduledTransfer = await db.query.scheduledTransfers.findFirst({
        where: eq(scheduledTransfers.id, scheduledTransferId),
      });

      if (!scheduledTransfer) {
        throw new Error("Scheduled transfer not found");
      }

      // Update status to "processing"
      await db
        .update(scheduledTransfers)
        .set({
          status: "processing",
          updatedAt: new Date(),
        })
        .where(eq(scheduledTransfers.id, scheduledTransferId));

      // Prepare the payload for the transfer API
      const payload = {
        type: scheduledTransfer.destinationType,
        entityId:
          scheduledTransfer.destinationType === "user"
            ? scheduledTransfer.destinationUserId
            : scheduledTransfer.destinationAccountId,
        amount: scheduledTransfer.amountCents,
        scheduledTransferId: scheduledTransfer.id,
      };

      // Make an internal POST request to the transfer API
      const transferResponse = await fetch(
        `http://localhost:3000/api/account/${scheduledTransfer.sourceAccountId}/transfer`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!transferResponse.ok) {
        const errorData = await transferResponse.json();
        // Update status to "failed"
        await db
          .update(scheduledTransfers)
          .set({
            status: "failed",
            updatedAt: new Date(),
          })
          .where(eq(scheduledTransfers.id, scheduledTransferId));

        throw new Error(
          `Transfer API responded with status ${transferResponse.status}: ${errorData.error}`
        );
      }

      // Handle recurring transfers
      if (
        scheduledTransfer.transferType === "recurring" &&
        scheduledTransfer.recurringInterval &&
        scheduledTransfer.recurringFrequency
      ) {
        if (!scheduledTransfer.scheduleDate) {
          throw new Error("scheduleDate is required for recurring transfers");
        }
        const nextScheduleDate = new Date(scheduledTransfer.scheduleDate);
        switch (scheduledTransfer.recurringFrequency) {
          case "days":
            nextScheduleDate.setDate(
              nextScheduleDate.getDate() + scheduledTransfer.recurringInterval
            );
            break;
          case "weeks":
            nextScheduleDate.setDate(
              nextScheduleDate.getDate() +
                scheduledTransfer.recurringInterval * 7
            );
            break;
          case "months":
            nextScheduleDate.setMonth(
              nextScheduleDate.getMonth() + scheduledTransfer.recurringInterval
            );
            break;
          default:
            throw new Error("Invalid recurring frequency");
        }

        const [newScheduledTransfer] = await db
          .insert(scheduledTransfers)
          .values({
            ...scheduledTransfer,
            id: crypto.randomUUID(),
            scheduleDate: nextScheduleDate,
            status: "pending",
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        // Trigger the next scheduled transfer at the nextScheduleDate
        const newJobId = await scheduleTransferAtDatetimeJob.trigger({
          params: {
            scheduledTransferId: newScheduledTransfer.id,
          },
          // TODO: fix this
          options: {
            startAfter: nextScheduleDate,
          },
        });

        // Update the new scheduled transfer with the jobId
        await db
          .update(scheduledTransfers)
          .set({
            jobId: newJobId,
            updatedAt: new Date(),
          })
          .where(eq(scheduledTransfers.id, newScheduledTransfer.id));
      }

      return { success: true, transferId: scheduledTransferId };
    } catch (error) {
      console.error("Error in scheduleTransferAtDatetimeJob:", error);
      throw error;
    }
  },
});
