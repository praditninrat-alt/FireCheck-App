import { describe, expect, it, vi } from "vitest";
import { DefectStatus, InspectionStatus, ItemStatus } from "@prisma/client";
import { getDisplayedInspectionStatus, getDisplayedItemStatus, summarizeInspection } from "@/lib/inspection-logic";
import { inspectionSchema } from "@/lib/validation";
import { CHECKLIST } from "@/lib/constants";

vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn().mockResolvedValue(null) }));
import { requireUser } from "@/lib/api";

describe("inspection behavior", () => {
  it("summarizes all passing checklist items as PASS", () => {
    expect(summarizeInspection(CHECKLIST.map(() => ({ status: "PASS" as const })))).toBe(InspectionStatus.PASS);
  });

  it("summarizes an inspection with any failed item as FAIL", () => {
    expect(summarizeInspection(CHECKLIST.map((_, index) => ({ status: index === 2 ? "FAIL" as const : "NA" as const })))).toBe(InspectionStatus.FAIL);
  });

  it("shows a failed item as PASS when all linked defects are resolved", () => {
    expect(getDisplayedItemStatus(ItemStatus.FAIL, [{ status: DefectStatus.RESOLVED }])).toBe(ItemStatus.PASS);
  });

  it("keeps a failed item as FAIL when a linked defect is unresolved", () => {
    expect(getDisplayedItemStatus(ItemStatus.FAIL, [
      { status: DefectStatus.RESOLVED },
      { status: DefectStatus.IN_PROGRESS },
    ])).toBe(ItemStatus.FAIL);
  });

  it("keeps a failed item as FAIL when no defect is linked", () => {
    expect(getDisplayedItemStatus(ItemStatus.FAIL, [])).toBe(ItemStatus.FAIL);
  });

  it("shows a failed inspection as PASS when every failed item has resolved defects", () => {
    expect(getDisplayedInspectionStatus({
      status: InspectionStatus.FAIL,
      items: [{ id: "item-1", status: ItemStatus.FAIL }, { id: "item-2", status: ItemStatus.PASS }],
      defects: [{ inspectionItemId: "item-1", status: DefectStatus.RESOLVED }],
    })).toBe(InspectionStatus.PASS);
  });

  it("keeps a failed inspection as FAIL when any failed item is unresolved", () => {
    expect(getDisplayedInspectionStatus({
      status: InspectionStatus.FAIL,
      items: [{ id: "item-1", status: ItemStatus.FAIL }, { id: "item-2", status: ItemStatus.FAIL }],
      defects: [{ inspectionItemId: "item-1", status: DefectStatus.RESOLVED }],
    })).toBe(InspectionStatus.FAIL);
  });

  it("rejects incomplete inspection forms", () => {
    expect(inspectionSchema.safeParse({ extinguisherId: "ext-1", items: [] }).success).toBe(false);
  });

  it("rejects a failed item without a note or defect", () => {
    const result = inspectionSchema.safeParse({
      extinguisherId: "ext-1",
      items: CHECKLIST.map((criterion, index) => ({ criterion, status: index === 0 ? "FAIL" : "PASS" })),
    });
    expect(result.success).toBe(false);
  });

  it("denies API access when there is no session", async () => {
    const result = await requireUser();
    expect(result.user).toBeNull();
    if (!result.user) expect(result.response.status).toBe(401);
  });
});
