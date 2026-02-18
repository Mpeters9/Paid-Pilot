import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/server/auth";

export function requireSession(request: NextRequest) {
  return getSessionFromRequest(request);
}

