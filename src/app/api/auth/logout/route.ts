import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/server/auth";
import { ok } from "@/server/http";

export async function POST() {
  const response: NextResponse = ok({ loggedOut: true });
  clearSessionCookie(response);
  return response;
}

