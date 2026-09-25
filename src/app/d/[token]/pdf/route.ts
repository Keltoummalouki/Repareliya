import { getInvoiceSettings } from "@/lib/data/admin";
import { getSiteSettings } from "@/lib/data/public";
import { pdfFileName, renderDocumentPdf } from "@/lib/pdf/document-pdf";
import { createServiceClient } from "@/lib/supabase/server";

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: RouteContext<"/d/[token]/pdf">) {
  const { token } = await params;
  if (!uuidRe.test(token)) return new Response("Introuvable", { status: 404 });
  const supabase = createServiceClient();
  const { data: doc } = await supabase.from("documents").select("*").eq("public_token", token).maybeSingle();
  if (!doc || (doc.type === "facture" && doc.status === "brouillon")) return new Response("Introuvable", { status: 404 });
  const [site, invoice] = await Promise.all([getSiteSettings(), getInvoiceSettings(supabase)]);
  const pdf = await renderDocumentPdf(doc, site, invoice);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdfFileName(doc)}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
