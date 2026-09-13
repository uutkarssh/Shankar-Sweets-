import { db } from "@/lib/db";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  // Ensure restaurant config exists
  await db.restaurantConfig.upsert({ where: { id: "singleton" }, update: {}, create: { id: "singleton" } });
  return <>{children}</>;
}
