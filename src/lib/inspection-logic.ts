import { DefectStatus, InspectionStatus, ItemStatus } from "@prisma/client";

export function getDisplayedItemStatus(
  status: ItemStatus,
  defects: ReadonlyArray<{ status: DefectStatus }>,
): ItemStatus {
  if (status === ItemStatus.FAIL && defects.length > 0 && defects.every((defect) => defect.status === DefectStatus.RESOLVED)) {
    return ItemStatus.PASS;
  }
  return status;
}

export function getDisplayedInspectionStatus(inspection: {
  status: InspectionStatus;
  items: ReadonlyArray<{ id: string; status: ItemStatus }>;
  defects: ReadonlyArray<{ inspectionItemId: string | null; status: DefectStatus }>;
}): InspectionStatus {
  if (inspection.status !== InspectionStatus.FAIL) return inspection.status;
  const failedItems = inspection.items.filter((item) => item.status === ItemStatus.FAIL);
  const allFailuresResolved = failedItems.length > 0 && failedItems.every((item) =>
    getDisplayedItemStatus(item.status, inspection.defects.filter((defect) => defect.inspectionItemId === item.id)) === ItemStatus.PASS,
  );
  return allFailuresResolved ? InspectionStatus.PASS : InspectionStatus.FAIL;
}

export function summarizeInspection(items: ReadonlyArray<{ status: ItemStatus }>): InspectionStatus {
  return items.some((item) => item.status === "FAIL") ? InspectionStatus.FAIL : InspectionStatus.PASS;
}
