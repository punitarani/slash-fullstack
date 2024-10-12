import { z } from "zod";

import {
  transferMoneyJob,
  transferMoneyJobName,
} from "@/jobs/transfer-money.job";

import { type NextRequest, NextResponse } from "next/server";

// Define the schema for the request body
export const transferRequestBodySchema = z.object({
  type: z.enum(["user", "account"]),
  entityId: z.string(),
  amount: z.number().positive(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const { accountId } = params;
    const body = await req.json();

    // Validate the request body
    const { type, entityId, amount } = transferRequestBodySchema.parse(body);

    // Enqueue the transfer job to process in the background
    await transferMoneyJob.trigger({
      params: {
        id: `transfer-${accountId}-${Date.now()}`,
        name: transferMoneyJobName,
        expireInSeconds: 300,
        data: {
          accountId,
          type,
          entityId,
          amount,
        },
        retryLimit: 3,
        retryDelay: 60,
        retryBackoff: true,
        deadLetter: 'failed-transfer',
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Transfer failed" }, { status: 500 });
  }
}
