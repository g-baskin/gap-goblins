import { leadSources } from "@/lib/lead-finder/sources/index";
import { requireLeadFinderTenant } from "../_lib";

export async function GET(request: Request) {
  const authResult = await requireLeadFinderTenant(request);
  if (authResult instanceof Response) return authResult;
  const sources = await Promise.all(
    Object.values(leadSources).map(async (source) => ({
      id: source.id,
      label: source.label,
      ...(await source.health()),
    })),
  );
  return Response.json({ sources });
}
