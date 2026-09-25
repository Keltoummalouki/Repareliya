import { getAdmin } from "@/lib/auth";
import { getAllSettings } from "@/lib/data/admin";
import { pdfFileName, renderDocumentPdf } from "@/lib/pdf/document-pdf";

export async function GET(request: Request, { params }: RouteContext<"/admin/documents/[id]/pdf">) {
  const admin = await getAdmin();
  if (!admin) return new Response("Non autorisé", { status: 401 });
  const { id } = await params;
  const { data: doc } = await admin.supabase.from("documents").select("*").eq("id", id).maybeSingle();
  if (!doc) return new Response("Introuvable", { status: 404 });
  const { site, invoice } = await getAllSettings(admin.supabase);
  const pdf = await renderDocumentPdf(doc, site, invoice);
  const download = new URL(request.url).searchParams.has("download");
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${pdfFileName(doc)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
