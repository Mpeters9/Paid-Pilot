import { NextRequest } from "next/server";
import { getDashboardMetrics } from "@/server/dashboard";
import { ok, withErrorHandling } from "@/server/http";
import { requireSession } from "@/server/route-auth";

export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = requireSession(request);
    const metrics = await getDashboardMetrics(session.workspaceId);
    return ok(metrics);
  });
}

