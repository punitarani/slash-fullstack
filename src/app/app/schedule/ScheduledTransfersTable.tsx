"use client";

import {
  ArrowRightIcon,
  Calendar,
  Repeat2,
  PiggyBank,
  X,
  Loader2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ScheduledTransfer = {
  transferId: string;
  sourceAccountId: string;
  sourceAccountName: string;
  destinationType: "user" | "account";
  destinationAccountId: string | null;
  destinationUserId: string | null;
  destinationUserName: string | null;
  amountCents: number;
  transferType: "datetime" | "recurring" | "event";
  scheduleDate?: Date;
  recurringInterval?: number | null;
  recurringFrequency?: "days" | "weeks" | "months" | null;
  eventType?: string | null;
  status:
    | "scheduled"
    | "pending"
    | "processing"
    | "completed"
    | "failed"
    | "deleted";
  jobId?: string | null;
};

interface ScheduledTransfersTableProps {
  transfers: ScheduledTransfer[];
  userId: string | null;
  setTransfers: React.Dispatch<React.SetStateAction<ScheduledTransfer[]>>;
}

export default function ScheduledTransfersTable({
  transfers,
  userId,
  setTransfers,
}: ScheduledTransfersTableProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const formatAmount = (amountCents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amountCents / 100);
  };

  const formatSchedule = (transfer: ScheduledTransfer) => {
    switch (transfer.transferType) {
      case "datetime":
        return transfer.scheduleDate
          ? format(new Date(transfer.scheduleDate), "dd MMM yyyy hh:mm a")
          : "N/A";
      case "recurring":
        return `${
          transfer.scheduleDate
            ? format(new Date(transfer.scheduleDate), "dd MMM yyyy hh:mm a")
            : "N/A"
        }\nEvery ${transfer.recurringInterval} ${transfer.recurringFrequency}`;
      case "event":
        return "On next deposit";
      default:
        return "N/A";
    }
  };

  const getTransferTypeIcon = (
    transferType: ScheduledTransfer["transferType"]
  ) => {
    switch (transferType) {
      case "datetime":
        return <Calendar className="h-4 w-4" />;
      case "recurring":
        return <Repeat2 className="h-4 w-4" />;
      case "event":
        return <PiggyBank className="h-4 w-4" />;
    }
  };

  const handleCancelTransfer = async () => {
    if (!selectedTransferId) return;

    if (typeof setTransfers !== "function") {
      console.error("setTransfers is not a function");
      return;
    }

    setIsDeleting(true);
    try {
      if (!userId) {
        console.error("userId is not set");
        return;
      }

      const response = await fetch(
        `/api/users/${userId}/scheduled-transfers?transferId=${selectedTransferId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error deleting transfer:", errorData.error);
        return;
      }

      // Update the transfers state by marking the transfer as deleted
      setTransfers((prevTransfers) =>
        prevTransfers.map((transfer) =>
          transfer.transferId === selectedTransferId
            ? { ...transfer, status: "deleted" }
            : transfer
        )
      );
    } catch (error) {
      console.error("Error deleting transfer:", error);
    } finally {
      setIsDeleting(false);
      setIsDialogOpen(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h2 className="text-2xl font-bold mb-4">Scheduled Transfers</h2>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfers.map((transfer) => (
              <TableRow key={transfer.transferId}>
                <TableCell>
                  <div className="flex items-center justify-center gap-2">
                    {getTransferTypeIcon(transfer.transferType)}
                  </div>
                </TableCell>
                <TableCell>{formatAmount(transfer.amountCents)}</TableCell>
                <TableCell>{transfer.sourceAccountName}</TableCell>
                <TableCell className="truncate max-w-[16ch]">
                  {transfer.destinationType === "account"
                    ? transfer.destinationAccountId
                    : transfer.destinationUserName}
                </TableCell>
                <TableCell className="whitespace-pre-line">
                  {formatSchedule(transfer)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      transfer.status === "scheduled"
                        ? "outline"
                        : transfer.status === "pending"
                        ? "outline"
                        : transfer.status === "processing"
                        ? "outline"
                        : transfer.status === "completed"
                        ? "default"
                        : transfer.status === "failed"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {transfer.status}
                  </Badge>
                </TableCell>
                <TableCell className="px-0">
                  {transfer.status !== "deleted" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedTransferId(transfer.transferId);
                        setIsDialogOpen(true);
                      }}
                      disabled={transfer.status === "processing"}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this scheduled transfer?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelTransfer}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <div className="flex flex-row items-center gap-2">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </div>
              ) : (
                "Delete"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="w-full flex items-center justify-end mt-4">
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => console.log("Show all transactions")}
        >
          Show All Transactions
          <ArrowRightIcon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
