"use client";

import { useState } from "react";
import { DealDetailSheet } from "@/components/crm/DealDetailSheet";
import { PipelineKanban } from "@/components/crm/PipelineKanban";

export function PipelineClient() {
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDealClick = (dealId: string) => {
    setSelectedDealId(dealId);
    setSheetOpen(true);
  };

  const handleDealUpdated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleDealDeleted = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <>
      <PipelineKanban key={refreshKey} onDealClick={handleDealClick} />

      <DealDetailSheet
        dealId={selectedDealId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onDealUpdated={handleDealUpdated}
        onDealDeleted={handleDealDeleted}
      />
    </>
  );
}
