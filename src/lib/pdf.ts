import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fmt, t } from '../i18n';
import type { CalcResult } from './calc';
import { formatDate, formatEur, formatNumber, formatPct, parseNum } from './numbers';
import { isCapsule, type OfferForm, type ProductType, type Settings } from './types';

// Client-facing offer. It must NEVER contain raw material prices, cost per dose, fixed costs,
// markup, margin, profit or the raw material requirement list – only the data passed in OfferPdfModel.

export interface OfferPdfModel {
  offerNo: string;
  offerDate: string;
  validUntil: string;
  receiver: OfferForm['receiver'];
  invoice: OfferForm['invoice'];
  productName: string;
  productType: ProductType;
  quantityPerUnit: string;
  capsulesPerDose: string | null;
  composition: { name: string; amount: string; unit: string }[] | null;
  numberOfUnits: number;
  unitPrice: number;
  totalExclVat: number;
  vatRatePct: number | null;
  vatAmount: number;
  totalInclVat: number;
  notes: string;
  terms: string;
  company: Pick<Settings, 'company_name' | 'company_address' | 'company_vat' | 'company_email' | 'company_phone'>;
  logo: { dataUrl: string; width: number; height: number } | null;
}

export interface PdfFonts {
  regular: string; // base64 TTF
  bold: string;
}

const ACCENT: [number, number, number] = [27, 122, 75];
const MUTED: [number, number, number] = [100, 110, 105];
const TEXT: [number, number, number] = [30, 35, 33];
const FONT = 'Roboto';

const typeLabel = (p: ProductType) => t.productType[p];
const packagingLabel = (p: ProductType) => t.productType[`packaging_${p}`];

/** Only client-safe values are copied from the form and the results. */
export function toPdfModel(
  form: OfferForm,
  result: CalcResult,
  settings: Settings,
  logo: OfferPdfModel['logo'],
): OfferPdfModel {
  if (!form.productType) throw new Error('Product type is required');
  const capsule = isCapsule(form.productType);
  return {
    offerNo: form.offer.offerNo,
    offerDate: form.offer.offerDate,
    validUntil: form.offer.validUntil,
    receiver: form.receiver,
    invoice: form.invoice,
    productName: form.offer.productName,
    productType: form.productType,
    quantityPerUnit: form.quantityPerUnit,
    capsulesPerDose: capsule ? form.capsulesPerDose : null,
    composition: form.includeComposition
      ? form.rows
          .filter((r) => (parseNum(r.amount) ?? 0) > 0)
          .map((r) => ({ name: r.name, amount: formatNumber(parseNum(r.amount) ?? 0, 4), unit: r.unit }))
      : null,
    numberOfUnits: parseNum(form.numberOfUnits) ?? 0,
    unitPrice: result.unitPrice,
    totalExclVat: result.totalPriceExclVat,
    vatRatePct: form.addVat ? (parseNum(form.vatRate) ?? 0) : null,
    vatAmount: result.vatAmount,
    totalInclVat: result.totalInclVat,
    notes: form.notes.trim(),
    terms: settings.terms_text.trim(),
    company: {
      company_name: settings.company_name,
      company_address: settings.company_address,
      company_vat: settings.company_vat,
      company_email: settings.company_email,
      company_phone: settings.company_phone,
    },
    logo,
  };
}

export function offerFileName(form: Pick<OfferForm, 'offer' | 'invoice' | 'receiver'>): string {
  const who = (form.invoice.companyName.trim() || form.receiver.fullName.trim() || 'Client')
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, '_');
  const no = form.offer.offerNo.trim().replace(/[\\/:*?"<>|\s]+/g, '_') || 'draft';
  return `Offer_${no}_${who}.pdf`;
}

export function createOfferPdf(m: OfferPdfModel, fonts: PdfFonts): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  doc.addFileToVFS('Roboto-Regular.ttf', fonts.regular);
  doc.addFont('Roboto-Regular.ttf', FONT, 'normal');
  doc.addFileToVFS('Roboto-Bold.ttf', fonts.bold);
  doc.addFont('Roboto-Bold.ttf', FONT, 'bold');
  doc.setFont(FONT, 'normal');
  doc.setTextColor(...TEXT);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  // 1. Header: logo + company details
  if (m.logo) {
    const maxW = 50;
    const maxH = 20;
    const ratio = Math.min(maxW / m.logo.width, maxH / m.logo.height);
    const format = m.logo.dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
    doc.addImage(m.logo.dataUrl, format, margin, y, m.logo.width * ratio, m.logo.height * ratio);
  } else {
    doc.setFont(FONT, 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...ACCENT);
    doc.text((m.company.company_name || 'Nutrikal').toUpperCase(), margin, y + 9);
    doc.setTextColor(...TEXT);
  }
  const companyLines = [
    m.company.company_name,
    m.company.company_address,
    m.company.company_vat && `${t.pdf.vatNumber} ${m.company.company_vat}`,
    m.company.company_email,
    m.company.company_phone,
  ].filter(Boolean) as string[];
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  let cy = y + 2;
  companyLines.forEach((line, i) => {
    doc.setFont(FONT, i === 0 ? 'bold' : 'normal');
    for (const part of doc.splitTextToSize(line, 75) as string[]) {
      doc.text(part, pageW - margin, cy + 2, { align: 'right' });
      cy += 4;
    }
  });
  doc.setTextColor(...TEXT);
  y = Math.max(y + 22, cy + 2);
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageW - margin, y);
  y += 10;

  // 2. Title + offer meta
  doc.setFont(FONT, 'bold');
  doc.setFontSize(20);
  doc.text(t.pdf.offer, margin, y + 2);
  doc.setFontSize(9);
  const meta: [string, string][] = [
    [t.pdf.offerNo, m.offerNo],
    [t.pdf.date, formatDate(m.offerDate)],
    [t.pdf.validUntil, formatDate(m.validUntil)],
  ];
  meta.forEach(([label, value], i) => {
    const ly = y - 4 + i * 5;
    doc.setFont(FONT, 'normal');
    doc.setTextColor(...MUTED);
    doc.text(`${label}:`, pageW - margin - 38, ly, { align: 'right' });
    doc.setFont(FONT, 'bold');
    doc.setTextColor(...TEXT);
    doc.text(value || '–', pageW - margin, ly, { align: 'right' });
  });
  y += 14;

  // 3. Receiver / invoice details (empty fields hidden)
  const r = m.receiver;
  const cityLine = [r.zip, r.city].filter((s) => s.trim()).join(' ');
  const receiverLines = [r.fullName, r.address, cityLine, r.country, r.phone, r.email].filter((s) => s?.trim());
  const inv = m.invoice;
  const invoiceLines = [
    inv.companyName,
    inv.registrationAddress,
    inv.vatNumber && `${t.pdf.vatNumber} ${inv.vatNumber}`,
  ].filter((s) => s?.trim()) as string[];

  const colW = contentW / 2 - 4;
  const drawBlock = (title: string, lines: string[], x: number): number => {
    let by = y;
    doc.setFont(FONT, 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...ACCENT);
    doc.text(title.toUpperCase(), x, by);
    by += 5;
    doc.setTextColor(...TEXT);
    doc.setFontSize(9.5);
    lines.forEach((line, i) => {
      doc.setFont(FONT, i === 0 ? 'bold' : 'normal');
      for (const part of doc.splitTextToSize(line, colW) as string[]) {
        doc.text(part, x, by);
        by += 4.6;
      }
    });
    return by;
  };
  const endA = drawBlock(t.pdf.receiver, receiverLines, margin);
  const endB = invoiceLines.length ? drawBlock(t.pdf.invoiceDetails, invoiceLines, margin + contentW / 2 + 4) : y;
  y = Math.max(endA, endB) + 6;

  const tableBase = {
    margin: { left: margin, right: margin },
    styles: { font: FONT, fontSize: 9, textColor: TEXT, cellPadding: 2, overflow: 'linebreak' as const },
    headStyles: { font: FONT, fontStyle: 'bold' as const, fillColor: ACCENT, textColor: [255, 255, 255] as [number, number, number] },
  };
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const sectionTitle = (title: string) => {
    if (y > pageH - 40) {
      doc.addPage();
      y = margin;
    }
    doc.setFont(FONT, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...TEXT);
    doc.text(title, margin, y);
    y += 2;
  };

  // 4. Product block
  const capsule = isCapsule(m.productType);
  const productRows: [string, string][] = [
    ...(m.productName ? [[t.pdf.productName, m.productName] as [string, string]] : []),
    [t.pdf.productType, typeLabel(m.productType)],
    [t.pdf.packaging, packagingLabel(m.productType)],
    [capsule ? t.pdf.capsulesPerBottle : t.pdf.dosesPerPouch, m.quantityPerUnit],
    ...(capsule && m.capsulesPerDose ? [[t.pdf.capsulesPerDose, m.capsulesPerDose] as [string, string]] : []),
  ];
  sectionTitle(t.pdf.product);
  autoTable(doc, {
    ...tableBase,
    startY: y,
    theme: 'plain',
    body: productRows,
    columnStyles: { 0: { cellWidth: 55, textColor: MUTED }, 1: { fontStyle: 'bold' } },
  });
  y = lastY() + 8;

  // 5. Composition per dose (no prices)
  if (m.composition && m.composition.length) {
    sectionTitle(t.pdf.composition);
    autoTable(doc, {
      ...tableBase,
      startY: y,
      theme: 'striped',
      head: [[t.pdf.ingredient, t.pdf.amount, t.pdf.unit]],
      body: m.composition.map((c) => [c.name, c.amount, c.unit]),
      columnStyles: { 1: { halign: 'right', cellWidth: 30 }, 2: { cellWidth: 20 } },
      didParseCell: (data) => {
        if (data.section === 'head' && data.column.index === 1) data.cell.styles.halign = 'right';
      },
    });
    y = lastY() + 8;
  }

  // 6. Pricing
  const unitWord = capsule ? t.pdf.bottles : t.pdf.pouches;
  const description = [
    m.productName || typeLabel(m.productType),
    `${typeLabel(m.productType)}, ${packagingLabel(m.productType)}`,
    `${capsule ? t.pdf.capsulesPerBottle : t.pdf.dosesPerPouch}: ${m.quantityPerUnit}`,
  ].join('\n');
  const foot: string[][] = [['', '', t.pdf.subtotal, formatEur(m.totalExclVat)]];
  if (m.vatRatePct !== null) {
    foot.push(['', '', `${t.pdf.vat} (${formatPct(m.vatRatePct, 0)})`, formatEur(m.vatAmount)]);
    foot.push(['', '', t.pdf.totalDue, formatEur(m.totalInclVat)]);
  } else {
    foot[0][2] = t.pdf.totalExclVat;
  }
  sectionTitle(t.pdf.pricing);
  autoTable(doc, {
    ...tableBase,
    startY: y,
    theme: 'striped',
    head: [[t.pdf.description, t.pdf.quantity, t.pdf.unitPrice, t.pdf.total]],
    body: [[description, `${formatNumber(m.numberOfUnits)}\n${unitWord}`, formatEur(m.unitPrice), formatEur(m.totalExclVat)]],
    foot,
    showFoot: 'lastPage',
    footStyles: { font: FONT, fontStyle: 'bold', fillColor: [240, 245, 242], textColor: TEXT },
    columnStyles: {
      1: { halign: 'right', cellWidth: 28 },
      2: { halign: 'right', cellWidth: 40 },
      3: { halign: 'right', cellWidth: 32 },
    },
    didParseCell: (data) => {
      if (data.section === 'head' && data.column.index > 0) data.cell.styles.halign = 'right';
      if (data.section === 'foot' && data.column.index >= 2) data.cell.styles.halign = 'right';
    },
  });
  y = lastY() + 10;

  // 7. Notes + terms
  const paragraph = (title: string, text: string) => {
    if (!text) return;
    const lines = doc.splitTextToSize(text, contentW) as string[];
    if (y + 8 + lines.length * 4.4 > pageH - 20) {
      doc.addPage();
      y = margin;
    }
    doc.setFont(FONT, 'bold');
    doc.setFontSize(10);
    doc.text(title, margin, y);
    y += 5;
    doc.setFont(FONT, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(lines, margin, y);
    doc.setTextColor(...TEXT);
    y += lines.length * 4.4 + 6;
  };
  paragraph(t.pdf.notes, m.notes);
  paragraph(t.pdf.terms, m.terms);

  // 8. Footer on every page
  const pages = doc.getNumberOfPages();
  const contact = [m.company.company_name, m.company.company_email, m.company.company_phone].filter(Boolean).join('  ·  ');
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(220, 225, 222);
    doc.setLineWidth(0.3);
    doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(contact, margin, pageH - 9);
    doc.text(fmt(t.pdf.page, { n: i, m: pages }), pageW - margin, pageH - 9, { align: 'right' });
  }

  return doc;
}

// ---------------------------------------------------------------------------
// Browser helpers: lazy font loading and download
// ---------------------------------------------------------------------------

let fontCache: Promise<PdfFonts> | null = null;

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function loadFonts(): Promise<PdfFonts> {
  fontCache ??= (async () => {
    const [{ default: regularUrl }, { default: boldUrl }] = await Promise.all([
      import('../assets/fonts/Roboto-Regular.ttf?url'),
      import('../assets/fonts/Roboto-Bold.ttf?url'),
    ]);
    const [regular, bold] = await Promise.all(
      [regularUrl, boldUrl].map(async (url) => arrayBufferToBase64(await (await fetch(url)).arrayBuffer())),
    );
    return { regular, bold };
  })().catch((e) => {
    fontCache = null;
    throw e;
  });
  return fontCache;
}

function loadLogo(dataUrl: string | null): Promise<OfferPdfModel['logo']> {
  if (!dataUrl) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export async function downloadOfferPdf(form: OfferForm, result: CalcResult, settings: Settings): Promise<void> {
  const [fonts, logo] = await Promise.all([loadFonts(), loadLogo(settings.logo_data_url)]);
  const doc = createOfferPdf(toPdfModel(form, result, settings, logo), fonts);
  doc.save(offerFileName(form));
}
