import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { hashValue } from "@/server/utils";

type Params = { params: Promise<{ token: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { token } = await params;
  const link = await prisma.paymentLink.findUnique({
    where: { token },
  });

  if (!link) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "";
  const userAgent = request.headers.get("user-agent") ?? "";

  await prisma.$transaction([
    prisma.paymentLink.update({
      where: { id: link.id },
      data: {
        clickCount: { increment: 1 },
        lastClickedAt: new Date(),
      },
    }),
    prisma.paymentLinkClick.create({
      data: {
        paymentLinkId: link.id,
        ipHash: ip ? hashValue(ip) : null,
        userAgent: userAgent || null,
      },
    }),
  ]);

  return NextResponse.redirect(link.destinationUrl);
}

