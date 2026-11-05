export const CHECKLIST = [
  "เข้าถึงถังได้สะดวกและไม่มีสิ่งกีดขวาง",
  "ป้ายและคำแนะนำอ่านได้ชัดเจน",
  "สลักและซีลอยู่ครบและไม่ถูกแกะ",
  "เกจวัดแรงดันอยู่ในช่วงที่เหมาะสม (หากมีเกจ)",
  "สายและหัวฉีดอยู่ในสภาพดี",
  "ตัวถังไม่มีรอยรั่ว สนิม รอยบุบ หรือความเสียหายผิดปกติ",
  "ตำแหน่งติดตั้งและอุปกรณ์ยึดอยู่ในสภาพเหมาะสม",
  "วันหมดอายุหรือกำหนดบำรุงรักษาไม่เลยกำหนด",
] as const;

export const OPEN_DEFECT_STATUSES = ["OPEN", "IN_PROGRESS"] as const;
export const ROLES = ["ADMIN", "INSPECTOR", "MAINTENANCE"] as const;
export const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const DEFECT_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CANCELLED"] as const;
