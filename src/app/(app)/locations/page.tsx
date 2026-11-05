import { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { LocationList } from "@/components/location-list";
export default async function LocationsPage() {
  const user = await getCurrentUser();
  return <LocationList canManage={user?.role === Role.ADMIN} />;
}
