import { NewInvoiceForm } from "@/components/new-invoice-form";
import { prisma } from "@/server/db";
import { requirePageSession } from "@/server/page-auth";

export default async function NewInvoicePage() {
  const session = await requirePageSession();
  const workspace = await prisma.workspace.findUnique({
    where: { id: session.workspaceId },
    select: { baseCurrency: true },
  });

  return (
    <div className="fade-up">
      <NewInvoiceForm baseCurrency={workspace?.baseCurrency ?? "USD"} />
    </div>
  );
}
