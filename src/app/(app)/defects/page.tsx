import { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { DefectList } from "@/components/defect-list";
export default async function DefectsPage() {
  const user = await getCurrentUser();
  return <DefectList canManage={user?.role === Role.ADMIN || user?.role === Role.MAINTENANCE} />;
}
