import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { InspectionForm } from "@/components/inspection-form";
export default async function NewInspectionPage({ searchParams }: { searchParams: Promise<{ extinguisherId?: string }> }) {
  const user = await getCurrentUser();
  if (user?.role === Role.MAINTENANCE) redirect("/dashboard");
  const params = await searchParams;
  return <InspectionForm initialExtinguisherId={params.extinguisherId} />;
}
