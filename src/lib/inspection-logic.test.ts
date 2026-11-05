import { describe, expect, it, vi } from "vitest";
import { InspectionStatus } from "@prisma/client";
import { summarizeInspection } from "@/lib/inspection-logic";
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
