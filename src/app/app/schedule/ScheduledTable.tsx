"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import ScheduledTransfersTable, { type ScheduledTransfer } from "./ScheduledTransfersTable";

interface ScheduledTableProps {
  userId: string | null;
}

export default function ScheduledTable({
  userId,
  refresh,
}: ScheduledTableProps & { refresh: boolean }) {
  const [transfers, setTransfers] = useState<ScheduledTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    async function fetchScheduledTransfers() {
      try {
        const response = await fetch(
          `/api/users/${userId}/scheduled-transfers`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch scheduled transfers");
        }
        const data = await response.json();
        setTransfers(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchScheduledTransfers();
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
      <p>No scheduled transfers</p>
    </div>
  ) : (
    <ScheduledTransfersTable transfers={transfers} userId={userId} setTransfers={setTransfers} />
  );
}
