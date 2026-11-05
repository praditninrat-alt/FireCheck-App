import { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { ExtinguisherList } from "@/components/extinguisher-list";
export default async function ExtinguishersPage() {
  const user = await getCurrentUser();
  return <ExtinguisherList canManage={user?.role === Role.ADMIN} />;
}
