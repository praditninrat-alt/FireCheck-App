import { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { InspectionHistory } from "@/components/inspection-history";
export default async function InspectionsPage() {
  const user = await getCurrentUser();
  return <InspectionHistory canDelete={user?.role === Role.ADMIN} />;
}
