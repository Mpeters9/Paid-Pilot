import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/server/errors";
import { getConfig } from "@/server/config";

const SESSION_COOKIE = "uia_session";

export type SessionPayload = {
  userId: string;
  workspaceId: string;
  email: string;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signSession(payload: SessionPayload): string {
  const config = getConfig();
  return jwt.sign(payload, config.AUTH_SECRET, { expiresIn: "7d" });
}

export function verifySession(token: string): SessionPayload {
  const config = getConfig();
  try {
    return jwt.verify(token, config.AUTH_SECRET) as SessionPayload;
  } catch {
    throw new AppError("UNAUTHORIZED", "Invalid session", 401);
  }
}

export function setSessionCookie(response: NextResponse, payload: SessionPayload): void {
  const token = signSession(payload);
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function getSessionFromRequest(request: NextRequest): SessionPayload {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    throw new AppError("UNAUTHORIZED", "Please log in", 401);
  }
  return verifySession(token);
}

export async function getSessionFromServerCookies(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return verifySession(token);
  } catch {
    return null;
  }
}

