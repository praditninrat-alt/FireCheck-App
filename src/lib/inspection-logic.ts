import { InspectionStatus } from "@prisma/client";
import type { ItemStatus } from "@prisma/client";

export function summarizeInspection(items: ReadonlyArray<{ status: ItemStatus }>): InspectionStatus {
  return items.some((item) => item.status === "FAIL") ? InspectionStatus.FAIL : InspectionStatus.PASS;
}
