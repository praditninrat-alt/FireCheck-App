import { describe, expect, it } from "vitest";
import { defectUpdateSchema } from "@/lib/validation";

describe("defect update validation", () => {
  it("preserves the assignee when only the due date is updated", () => {
    const result = defectUpdateSchema.parse({ dueAt: "2026-11-05T00:00:00.000Z" });

    expect(result.assigneeId).toBeUndefined();
    expect(result.dueAt).toEqual(new Date("2026-11-05T00:00:00.000Z"));
  });

  it("preserves the due date when only the assignee is updated", () => {
    const result = defectUpdateSchema.parse({ assigneeId: "user-1" });

    expect(result.assigneeId).toBe("user-1");
    expect(result.dueAt).toBeUndefined();
  });

  it("allows explicitly clearing the assignee and due date", () => {
    const result = defectUpdateSchema.parse({ assigneeId: "", dueAt: "" });

    expect(result.assigneeId).toBeNull();
    expect(result.dueAt).toBeNull();
  });
});
