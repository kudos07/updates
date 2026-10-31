import { getSignals } from "../../../lib/ai-signals";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shouldRefresh = searchParams.get("refresh") === "1";
  const signals = await getSignals(shouldRefresh);

  return Response.json({
    signals,
    fetchedAt: new Date().toISOString(),
  });
}
