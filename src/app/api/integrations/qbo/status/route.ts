import { ok } from "@/server/http";

export async function GET() {
  return ok({
    available: false,
    message: "Planned next milestone",
  });
}

