import { z } from "zod";
import { CHECKLIST, DEFECT_STATUSES, ROLES, SEVERITIES } from "@/lib/constants";

const optionalText = z.string().trim().max(1000).optional().nullable().transform((v) => v || null);
const optionalDate = z.union([z.string().datetime(), z.literal(""), z.null()]).optional().transform((v) => typeof v === "string" && v ? new Date(v) : null);
const optionalUpdateDate = z.union([z.string().datetime(), z.literal(""), z.null()]).optional().transform((v) => v === undefined ? undefined : typeof v === "string" && v ? new Date(v) : null);

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

export const extinguisherSchema = z.object({
  code: z.string().trim().min(1).max(50),
  agentType: z.string().trim().min(1).max(100),
  capacity: z.string().trim().min(1).max(50),
  brand: optionalText,
  serialNumber: z.string().trim().max(100).optional().nullable().transform((v) => v || null),
  installedAt: optionalDate,
  nextMaintenanceAt: optionalDate,
  locationId: z.string().min(1),
  notes: optionalText,
  active: z.boolean().optional(),
});

export const locationSchema = z.object({
  name: z.string().trim().min(1).max(100),
  building: z.string().trim().min(1).max(100),
  floor: z.string().trim().max(50).optional().nullable().transform((v) => v || null),
  department: z.string().trim().max(100).optional().nullable().transform((v) => v || null),
  details: optionalText,
  active: z.boolean().optional(),
});

export const inspectionSchema = z.object({
  extinguisherId: z.string().min(1),
  inspectedAt: z.string().datetime().optional(),
  notes: optionalText,
  items: z.array(z.object({
    criterion: z.enum(CHECKLIST),
    status: z.enum(["PASS", "FAIL", "NA"]),
    note: optionalText,
    defect: z.object({
      description: z.string().trim().min(1).max(1000),
      severity: z.enum(SEVERITIES),
      assigneeId: z.string().optional().nullable(),
      dueAt: optionalDate,
      imageDataUrl: z.string().max(7_000_100).optional(),
    }).optional(),
  })).length(CHECKLIST.length),
}).superRefine((data, context) => {
  const criteria = data.items.map((item) => item.criterion);
  if (new Set(criteria).size !== CHECKLIST.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["items"], message: "รายการตรวจต้องไม่ซ้ำกันและต้องครบทุกข้อ" });
  }
  data.items.forEach((item, index) => {
    if (item.status === "FAIL" && !item.note?.trim() && !item.defect?.description?.trim()) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["items", index], message: "รายการไม่ผ่านต้องระบุหมายเหตุหรือรายละเอียดข้อบกพร่อง" });
    }
  });
});

export const defectUpdateSchema = z.object({
  status: z.enum(DEFECT_STATUSES).optional(),
  severity: z.enum(SEVERITIES).optional(),
  assigneeId: z.string().optional().nullable().transform((v) => v === undefined ? undefined : v || null),
  dueAt: optionalUpdateDate,
  note: z.string().trim().min(1).max(1000).optional(),
}).refine((value) => Object.keys(value).length > 0, "กรุณาระบุข้อมูลที่ต้องการแก้ไข");

export const userSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().email().max(254),
  password: z.string().min(12).max(128),
  role: z.enum(ROLES),
});

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
});
const recordId = z.string().trim().min(1).max(100);

export const extinguisherQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  active: z.literal("all").optional(),
});

export const inspectionQuerySchema = z.object({
  from: dateKey.optional(),
  to: dateKey.optional(),
  status: z.enum(["PASS", "FAIL"]).optional(),
  extinguisherId: recordId.optional(),
  inspectorId: recordId.optional(),
  locationId: recordId.optional(),
});

export const defectQuerySchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CANCELLED"]).optional(),
  search: z.string().trim().max(250).optional(),
});

export const reportQuerySchema = z.object({
  from: dateKey.optional(),
  to: dateKey.optional(),
  status: z.enum(["PASS", "FAIL"]).optional(),
  inspectorId: recordId.optional(),
  locationId: recordId.optional(),
});
