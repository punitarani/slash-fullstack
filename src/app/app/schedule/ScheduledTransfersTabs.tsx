"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import ScheduledTable from "./ScheduledTable";
import PastTransfersTable from "./PastTransfersTable";

interface ScheduledTransfersTabsProps {
  userId: string | null;
  refresh: boolean;
}

export default function ScheduledTransfersTabs({
  userId,
  refresh,
}: ScheduledTransfersTabsProps) {
  return (
    <Tabs defaultValue="scheduled" className="w-full pt-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Scheduled Transfers</h2>
        <TabsList>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="scheduled">
        <ScheduledTable userId={userId} refresh={refresh} />
      </TabsContent>
      <TabsContent value="past">
        <PastTransfersTable userId={userId} refresh={refresh} />
      </TabsContent>
    </Tabs>
  );
}
