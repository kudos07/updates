import { getSignals } from "../../../lib/ai-signals";

export async function GET() {
  const signals = await getSignals(true);

  return Response.json({
    refreshed: true,
    count: signals.length,
    refreshedAt: new Date().toISOString(),
  });
}
