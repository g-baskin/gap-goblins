import { TerritoriesManager } from "@/components/lead-finder/TerritoriesManager";
import { auth } from "@/lib/auth";
import { mapTileConfig } from "@/lib/lead-finder/territories/map-tiles";
import { listAvailableTenants } from "@/lib/tenancy/resolve-active-tenant";

export default async function LeadFinderTerritoriesPage() {
  const session = await auth();
  const tenants = session?.user?.id ? await listAvailableTenants(session.user.id) : [];
  return <TerritoriesManager tenants={tenants} tiles={mapTileConfig()} />;
}
