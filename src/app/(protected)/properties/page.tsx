import { Suspense } from "react";
import { PropertiesAdmin } from "@/components/properties/properties-admin";
import { isCustomerUser } from "@/lib/navigation/nav";
import { getResourceGrantsFromDb } from "@/lib/permissions/grants";
import { userHasPermissionInDb } from "@/lib/permissions/db";
import { requirePropertyPage } from "@/lib/properties/page-auth";

export default async function PropertiesPage() {
  const { session, grants } = await requirePropertyPage("property");
  const showWelcome = await isCustomerUser(session);

  const [showBuildings, showFloors] = await Promise.all([
    userHasPermissionInDb(session.user.id, "building", "read"),
    userHasPermissionInDb(session.user.id, "floor", "read"),
  ]);

  const [buildingGrants, floorGrants] = await Promise.all([
    showBuildings ? getResourceGrantsFromDb(session.user.id, "building") : undefined,
    showFloors ? getResourceGrantsFromDb(session.user.id, "floor") : undefined,
  ]);

  return (
    <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-slate-900" />}>
      <PropertiesAdmin
        grants={grants}
        buildingGrants={buildingGrants}
        floorGrants={floorGrants}
        showBuildings={showBuildings}
        showFloors={showFloors}
        username={session.user.username}
        showWelcome={showWelcome}
      />
    </Suspense>
  );
}
