import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { UserList } from "@/components/user-list";
export default async function UsersPage() {
  const user = await getCurrentUser();
  if (user?.role !== Role.ADMIN) redirect("/dashboard");
  return <UserList />;
}
