"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import ScheduledTransfersTable, {
  ScheduledTransfer,
} from "./ScheduledTransfersTable";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PastTransfersTableProps {
  userId: string | null;
  refresh: boolean;
}

export default function PastTransfersTable({
  userId,
  refresh,
}: PastTransfersTableProps) {
  const [transfers, setTransfers] = useState<ScheduledTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    async function fetchPastScheduledTransfers() {
      try {
        const response = await fetch(
          `/api/users/${userId}/past-scheduled-transfers`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch past scheduled transfers");
        }
        const data = await response.json();
        console.log(data);
        setTransfers(data.transactions);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchPastScheduledTransfers();
  }, [userId, refresh]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return !transfers || transfers.length === 0 ? (
    <div className="flex justify-center items-center h-full">
      <p>No past scheduled transfers</p>
    </div>
  ) : (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Past Scheduled Transfers</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transfers.map((transfer) => (
            <TableRow key={transfer.id}>
              <TableCell>
                {new Date(transfer.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="overflow-hidden text-ellipsis whitespace-nowrap">
                {transfer.description}
              </TableCell>
              <TableCell className="text-right">
                {Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(transfer.amountCents / 100)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
