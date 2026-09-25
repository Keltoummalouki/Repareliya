import "server-only";
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { parseItems } from "@/lib/documents";
import { formatAmount, formatDate, formatPhone } from "@/lib/format";
import type { InvoiceSettings, SiteSettings } from "@/lib/settings";

// Police Helvetica intégrée (jeu WinAnsi) : on remplace les espaces fines
// insécables produites par Intl (U+202F) qui n'y figurent pas.
const t = (value: string | null | undefined) => (value ?? "").replace(/ /g, " ");

export type PdfDocument = {
  type: string;
  number: string | null;
  status: string;
  customer_name: string;
  customer_phone: string | null;
  customer_whatsapp: string | null;
  customer_email: string | null;
  customer_address: string | null;
  device_label: string | null;
  items: unknown;
  prices_include_tax: boolean;
  tax_rate: number | string;
  subtotal: number | string;
  tax_amount: number | string;
  total: number | string;
  currency: string;
  notes: string | null;
  terms: string | null;
  issue_date: string;
  valid_until: string | null;
  due_date: string | null;
  paid_at: string | null;
  payment_method: string | null;
};

// Pas de césure automatique (les motifs par défaut sont anglais)
Font.registerHyphenationCallback((word) => [word]);

const ORANGE = "#cc4119";
const INK = "#202320";
const MUTED = "#6b6e67";
const LINE = "#e4e5df";

const styles = StyleSheet.create({
  page: { paddingTop: 42, paddingBottom: 64, paddingHorizontal: 44, fontSize: 9.5, fontFamily: "Helvetica", color: INK },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  brand: { fontSize: 20, fontFamily: "Helvetica-Bold", letterSpacing: -0.6 },
  dot: { color: ORANGE },
  // Pas de lineHeight sur <Page> : il fausse les éléments en position absolue (pied de page)
  small: { fontSize: 8.5, color: MUTED, marginBottom: 1.5 },
  docTitle: { fontSize: 22, fontFamily: "Helvetica-Bold", textAlign: "right", letterSpacing: 1, lineHeight: 1.2, marginBottom: 6 },
  metaRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 2 },
  metaLabel: { color: MUTED, width: 84, textAlign: "right", marginRight: 8 },
  metaValue: { fontFamily: "Helvetica-Bold", minWidth: 90, textAlign: "right" },
  boxes: { flexDirection: "row", gap: 14, marginBottom: 22 },
  box: { flex: 1, borderWidth: 1, borderColor: LINE, borderRadius: 6, padding: 12, gap: 2 },
  boxTitle: { fontSize: 7.5, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5, fontFamily: "Helvetica-Bold" },
  bold: { fontFamily: "Helvetica-Bold" },
  tableHead: { flexDirection: "row", backgroundColor: INK, color: "#ffffff", paddingVertical: 7, paddingHorizontal: 8, borderRadius: 4, fontFamily: "Helvetica-Bold", fontSize: 8.5 },
  row: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: LINE },
  cDesc: { flex: 1, paddingRight: 8 },
  cQty: { width: 44, textAlign: "right" },
  cUnit: { width: 86, textAlign: "right" },
  cTotal: { width: 90, textAlign: "right" },
  totals: { marginTop: 14, alignSelf: "flex-end", width: 230 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grandTotal: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: "#fdebe4", borderRadius: 4 },
  grandLabel: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  grandValue: { fontFamily: "Helvetica-Bold", fontSize: 13, color: ORANGE },
  section: { marginTop: 22 },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 9.5, marginBottom: 4 },
  para: { color: "#3d423b" },
  footer: { position: "absolute", bottom: 26, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: MUTED, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8 },
  watermark: { position: "absolute", top: 330, left: 80, fontSize: 86, color: "#f0e0da", transform: "rotate(-30deg)", fontFamily: "Helvetica-Bold", opacity: 0.6 },
  stamp: { marginTop: 10, alignSelf: "flex-end", borderWidth: 2, borderColor: "#1d7a50", color: "#1d7a50", paddingVertical: 4, paddingHorizontal: 10, fontFamily: "Helvetica-Bold", borderRadius: 4, fontSize: 11 },
});

function DocumentPdf({ doc, site, invoice }: { doc: PdfDocument; site: SiteSettings; invoice: InvoiceSettings }) {
  const items = parseItems(doc.items);
  const money = (v: number | string) => t(formatAmount(v, doc.currency));
  const title = doc.type === "devis" ? "DEVIS" : "FACTURE";
  const draft = doc.status === "brouillon" && doc.type === "facture";
  const rate = Number(doc.tax_rate);
  const logo = invoice.logo_url && /\.(png|jpe?g)(\?|$)/i.test(invoice.logo_url) ? invoice.logo_url : null;
  const sellerLines = [
    invoice.legal_name && invoice.legal_name !== site.business_name ? invoice.legal_name : "",
    invoice.address || [site.address, site.city].filter(Boolean).join(", "),
    site.phone ? `Tél. ${formatPhone(site.phone, site.default_country)}` : "",
    site.email,
  ].filter(Boolean);

  return (
    <Document title={`${title} ${doc.number ?? ""}`.trim()} author={site.business_name} language="fr">
      <Page size="A4" style={styles.page}>
        {draft ? <Text style={styles.watermark} fixed>BROUILLON</Text> : null}
        <View style={styles.header}>
          <View style={{ maxWidth: 260 }}>
            {logo ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={logo} style={{ height: 40, objectFit: "contain", marginBottom: 8, alignSelf: "flex-start" }} />
            ) : (
              <Text style={styles.brand}>
                {t(site.business_name.toLowerCase())}
                <Text style={styles.dot}>.</Text>
              </Text>
            )}
            {sellerLines.map((line) => (
              <Text key={line} style={styles.small}>
                {t(line)}
              </Text>
            ))}
            {invoice.legal_ids
              ? invoice.legal_ids.split("\n").map((line) => (
                  <Text key={line} style={styles.small}>
                    {t(line)}
                  </Text>
                ))
              : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.docTitle}>{title}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Numéro</Text>
              <Text style={styles.metaValue}>{doc.number ?? "Brouillon"}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>{t(formatDate(doc.issue_date, { day: "2-digit", month: "2-digit", year: "numeric" }))}</Text>
            </View>
            {doc.type === "devis" && doc.valid_until ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Valable jusqu’au</Text>
                <Text style={styles.metaValue}>{t(formatDate(doc.valid_until, { day: "2-digit", month: "2-digit", year: "numeric" }))}</Text>
              </View>
            ) : null}
            {doc.type === "facture" && doc.due_date ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Échéance</Text>
                <Text style={styles.metaValue}>{t(formatDate(doc.due_date, { day: "2-digit", month: "2-digit", year: "numeric" }))}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.boxes}>
          <View style={styles.box}>
            <Text style={styles.boxTitle}>Client</Text>
            <Text style={styles.bold}>{t(doc.customer_name)}</Text>
            {doc.customer_address ? <Text>{t(doc.customer_address)}</Text> : null}
            {doc.customer_phone ? <Text>{t(formatPhone(doc.customer_phone, site.default_country))}</Text> : null}
            {doc.customer_whatsapp && doc.customer_whatsapp !== doc.customer_phone ? (
              <Text>WhatsApp : {t(formatPhone(doc.customer_whatsapp, site.default_country))}</Text>
            ) : null}
            {doc.customer_email ? <Text>{t(doc.customer_email)}</Text> : null}
          </View>
          {doc.device_label ? (
            <View style={styles.box}>
              <Text style={styles.boxTitle}>Appareil</Text>
              <Text style={styles.bold}>{t(doc.device_label)}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.tableHead}>
          <Text style={styles.cDesc}>Désignation</Text>
          <Text style={styles.cQty}>Qté</Text>
          <Text style={styles.cUnit}>Prix unit.{rate > 0 ? (doc.prices_include_tax ? " TTC" : " HT") : ""}</Text>
          <Text style={styles.cTotal}>Total</Text>
        </View>
        {items.map((item, index) => (
          <View key={index} style={styles.row} wrap={false}>
            <Text style={styles.cDesc}>{t(item.description)}</Text>
            <Text style={styles.cQty}>{String(item.quantity).replace(".", ",")}</Text>
            <Text style={styles.cUnit}>{money(item.unit_price)}</Text>
            <Text style={styles.cTotal}>{money(Math.round(item.quantity * item.unit_price * 100) / 100)}</Text>
          </View>
        ))}

        <View style={styles.totals} wrap={false}>
          {rate > 0 ? (
            <>
              <View style={styles.totalRow}>
                <Text style={{ color: MUTED }}>Total HT</Text>
                <Text>{money(doc.subtotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={{ color: MUTED }}>TVA {String(rate).replace(".", ",")} %</Text>
                <Text>{money(doc.tax_amount)}</Text>
              </View>
            </>
          ) : null}
          <View style={styles.grandTotal}>
            <Text style={styles.grandLabel}>{rate > 0 ? "Total TTC" : "Total"}</Text>
            <Text style={styles.grandValue}>{money(doc.total)}</Text>
          </View>
          {rate === 0 && invoice.tax_note ? <Text style={[styles.small, { marginTop: 4, textAlign: "right" }]}>{t(invoice.tax_note)}</Text> : null}
          {doc.type === "facture" && doc.status === "paye" ? (
            <Text style={styles.stamp}>
              PAYÉE{doc.paid_at ? ` LE ${t(formatDate(doc.paid_at, { day: "2-digit", month: "2-digit", year: "numeric" }))}` : ""}
              {doc.payment_method ? ` · ${t(doc.payment_method).toUpperCase()}` : ""}
            </Text>
          ) : null}
        </View>

        {doc.notes ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Remarques</Text>
            <Text style={styles.para}>{t(doc.notes)}</Text>
          </View>
        ) : null}
        {doc.terms ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>{doc.type === "devis" ? "Conditions" : "Conditions de paiement"}</Text>
            <Text style={styles.para}>{t(doc.terms)}</Text>
          </View>
        ) : null}
        {doc.type === "facture" && invoice.bank_details ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Coordonnées bancaires</Text>
            <Text style={styles.para}>{t(invoice.bank_details)}</Text>
          </View>
        ) : null}
        {doc.type === "devis" ? (
          <View style={[styles.section, { flexDirection: "row", gap: 14 }]} wrap={false}>
            <View style={[styles.box, { minHeight: 64 }]}>
              <Text style={styles.boxTitle}>Bon pour accord (date et signature)</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text>{t(invoice.footer_note || site.business_name)}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function renderDocumentPdf(doc: PdfDocument, site: SiteSettings, invoice: InvoiceSettings) {
  return renderToBuffer(<DocumentPdf doc={doc} site={site} invoice={invoice} />);
}

export function pdfFileName(doc: Pick<PdfDocument, "type" | "number">) {
  return `${doc.type === "devis" ? "Devis" : "Facture"}-${doc.number ?? "brouillon"}.pdf`;
}
