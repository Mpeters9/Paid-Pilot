import { NextRequest } from "next/server";
import { getConfig } from "@/server/config";

function firstHeaderValue(value: string | null): string | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first || null;
}

export function getRequestOrigin(request: NextRequest): string {
  const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host"));
  const forwardedProto = firstHeaderValue(request.headers.get("x-forwarded-proto"));

  if (forwardedHost) {
    const proto = forwardedProto ?? "https";
    return `${proto}://${forwardedHost}`;
  }

  const configAppUrl = getConfig().APP_URL;
  if (configAppUrl) {
    return configAppUrl;
  }

  return request.nextUrl.origin;
}
