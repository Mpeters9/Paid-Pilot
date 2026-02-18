import { redirect } from "next/navigation";
import { getSessionFromServerCookies } from "@/server/auth";

export async function requirePageSession() {
  const session = await getSessionFromServerCookies();
  if (!session) {
    redirect("/login");
  }
  return session;
}

