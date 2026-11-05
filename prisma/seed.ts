import { hash } from "bcryptjs";
import { PrismaClient, Role, InspectionStatus, ItemStatus, Severity } from "@prisma/client";
import type { Extinguisher } from "@prisma/client";
import { CHECKLIST } from "../src/lib/constants";

const db = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Seed data is for development only; refusing to run in production.");
  const passwordHash = await hash("ChangeMe123!", 12);
  const admin = await db.user.upsert({
    where: { email: "admin@firecheck.local" },
    update: {},
    create: { name: "ผู้ดูแลระบบตัวอย่าง", email: "admin@firecheck.local", passwordHash, role: Role.ADMIN },
  });
  const inspector = await db.user.upsert({
    where: { email: "inspector@firecheck.local" },
    update: {},
    create: { name: "ผู้ตรวจตัวอย่าง", email: "inspector@firecheck.local", passwordHash, role: Role.INSPECTOR },
  });
  const maintenance = await db.user.upsert({
    where: { email: "maintenance@firecheck.local" },
    update: {},
    create: { name: "ช่างตัวอย่าง", email: "maintenance@firecheck.local", passwordHash, role: Role.MAINTENANCE },
  });
  const locationRecords = [
    { name: "ทางเข้าฝ่ายผลิต", building: "อาคาร A", floor: "1", department: "ฝ่ายผลิต" },
    { name: "ห้องควบคุม", building: "อาคาร A", floor: "2", department: "วิศวกรรม" },
    { name: "คลังสินค้า", building: "อาคาร B", floor: "1", department: "คลังสินค้า" },
  ];
  const locations = [];
  for (const data of locationRecords) {
    const existing = await db.location.findFirst({ where: { name: data.name, building: data.building } });
    locations.push(existing ?? await db.location.create({ data: { ...data, createdById: admin.id } }));
  }
  const extinguisherRecords = [
    { code: "FC-A-001", agentType: "ผงเคมีแห้ง", capacity: "10 ปอนด์", locationId: locations[0].id },
    { code: "FC-A-002", agentType: "คาร์บอนไดออกไซด์", capacity: "10 ปอนด์", locationId: locations[0].id },
    { code: "FC-A-003", agentType: "ผงเคมีแห้ง", capacity: "15 ปอนด์", locationId: locations[1].id },
    { code: "FC-B-001", agentType: "โฟม", capacity: "10 ลิตร", locationId: locations[2].id },
    { code: "FC-B-002", agentType: "ผงเคมีแห้ง", capacity: "10 ปอนด์", locationId: locations[2].id },
  ];
  const extinguishers: Extinguisher[] = [];
  for (const data of extinguisherRecords) {
    extinguishers.push(await db.extinguisher.upsert({
      where: { code: data.code },
      update: {},
      create: { ...data, brand: "ตัวอย่าง", createdById: admin.id, nextMaintenanceAt: new Date(Date.now() + 180 * 86400000) },
    }));
  }
  const existingInspection = await db.inspection.findFirst({ where: { extinguisherId: extinguishers[0].id } });
  if (!existingInspection) {
    await db.inspection.create({
      data: {
        extinguisherId: extinguishers[0].id,
        inspectorId: inspector.id,
        inspectedAt: new Date(Date.now() - 3 * 86400000),
        status: InspectionStatus.FAIL,
        notes: "ข้อมูลตัวอย่างสำหรับทดสอบการติดตามงาน",
        items: { create: CHECKLIST.map((criterion, index) => ({ criterion, status: index === 4 ? ItemStatus.FAIL : ItemStatus.PASS, note: index === 4 ? "สายฉีดมีรอยแตกร้าว" : null })) },
      },
    }).then(async (inspection) => {
      const failedItem = await db.inspectionItem.findFirst({ where: { inspectionId: inspection.id, status: ItemStatus.FAIL } });
      if (failedItem) await db.defect.create({
        data: {
          inspectionId: inspection.id, inspectionItemId: failedItem.id, extinguisherId: extinguishers[0].id,
          description: "สายฉีดมีรอยแตกร้าว ควรตรวจสอบและเปลี่ยนตามขั้นตอนขององค์กร",
          severity: Severity.HIGH, status: "OPEN", assigneeId: maintenance.id,
          dueAt: new Date(Date.now() + 5 * 86400000), createdById: inspector.id,
        },
      });
    });
  }
  const passedInspection = await db.inspection.findFirst({ where: { extinguisherId: extinguishers[1].id } });
  if (!passedInspection) {
    await db.inspection.create({
      data: {
        extinguisherId: extinguishers[1].id, inspectorId: inspector.id,
        inspectedAt: new Date(Date.now() - 86400000), status: InspectionStatus.PASS,
        items: { create: CHECKLIST.map((criterion) => ({ criterion, status: ItemStatus.PASS })) },
      },
    });
  }
  console.info("Development seed ready: admin, inspector, maintenance, 3 locations, 5 extinguishers.");
}

main().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
}).finally(async () => {
  await db.$disconnect();
});
