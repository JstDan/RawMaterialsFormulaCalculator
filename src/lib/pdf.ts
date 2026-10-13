import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fmt, t } from '../i18n';
import type { CalcResult, OfferLine } from './calc';
import { formatDate, formatNumber, parseNum } from './numbers';
import { CAPSULE_SIZES, isCapsule, type OfferForm, type ProductType, type Settings } from './types';

// Client-facing offer, laid out after Nutrikal's offer template (Poppins, two brand marks, customer /
// supplier blocks, line table with discount, payment bar, bank details, payment terms, note, footer).
// It must NEVER contain raw material prices, cost per dose, fixed costs, markup, margin, profit or the
// raw material requirement list – only the data passed in OfferPdfModel.

export interface PdfImage {
  dataUrl: string;
  width: number;
  height: number;
}

export interface OfferPdfModel {
  offerNo: string;
  offerDate: string;
  dueDate: string;
  customer: {
    name: string;
    identificationNo: string;
    vatNumber: string;
    contactPerson: string;
    addressLines: string[];
  };
  supplier: { name: string; identificationNo: string; vatNumber: string; address: string };
  lines: OfferLine[];
  subtotal: number;
  vatAmount: number;
  total: number;
  bank: { iban: string; name: string; bic: string; address: string };
  /** Shown next to the bank details when no VAT is charged. */
  vatExemptionText: string | null;
  paymentTerms: string;
  noteLines: string[];
  footerText: string;
  websites: string[];
  /** Uploaded logo (Settings) – replaces the brand marks in the header. */
  customLogo: PdfImage | null;
  /** Built-in Nutrikal / MadeByNatureLabs marks. */
  brandLogos: [PdfImage, PdfImage] | null;
}

export interface PdfFonts {
  poppinsRegular: string; // base64 TTF
  poppinsSemiBold: string;
  poppinsBold: string;
  /** Fallback for Cyrillic (Poppins has no Cyrillic glyphs). */
  robotoRegular: string;
  robotoBold: string;
}

const NAVY: [number, number, number] = [27, 31, 59];
const TEXT: [number, number, number] = [31, 35, 40];
const LINE: [number, number, number] = [150, 155, 160];
const HEAD_BG: [number, number, number] = [229, 231, 233];
const BAR_BG: [number, number, number] = [222, 224, 226];
const CYRILLIC = /[Ѐ-ӿ]/;

type Weight = 'regular' | 'semibold' | 'bold';

const money = (n: number) => n.toFixed(2);
const packagingPlural: Record<ProductType, string> = {
  capsules_glass: 'glass bottles',
  capsules_plastic: 'plastic bottles',
  powder: 'doypack pouches',
};

/** Only client-safe values are copied from the form and the results. */
export function toPdfModel(
  form: OfferForm,
  result: CalcResult,
  settings: Settings,
  images: { customLogo: PdfImage | null; brandLogos: [PdfImage, PdfImage] | null },
): OfferPdfModel {
  if (!form.productType) throw new Error('Product type is required');
  const type = form.productType;
  const capsule = isCapsule(type);
  const units = parseNum(form.numberOfUnits) ?? 0;
  const perUnit = form.quantityPerUnit;
  const name = form.offer.productName.trim() || 'Custom formula';

  const productLine: OfferLine = {
    description: capsule
      ? `${name} - ${perUnit} capsules with ${packagingPlural[type]}`
      : `${name} - ${perUnit} doses in ${packagingPlural[type]}`,
    qty: units,
    unit: 'pcs',
    price: result.unitPrice,
    discountPct: parseNum(form.discount) ?? 0,
    amount: result.productAmount,
  };

  // NOTE: packaging, composition per dose (no prices), the account manager's notes, default terms.
  const noteLines: string[] = [];
  const doseG = result.doseWeightMg / 1000;
  if (capsule) {
    const size = (Object.keys(CAPSULE_SIZES) as (keyof typeof CAPSULE_SIZES)[]).includes(form.capsuleSize)
      ? `, capsule size ${form.capsuleSize.replace('size', '')}`
      : '';
    noteLines.push(`${t.productType[`packaging_${type}`]}s, ${perUnit} capsules each${size}.`);
  } else {
    const net = result.netWeightPerPouchG;
    noteLines.push(
      `Doypack pouches, ${perUnit} doses of ${formatNumber(doseG, 2)} g each${net ? ` (net ${formatNumber(net, 0)} g)` : ''}.`,
    );
  }
  if (form.includeComposition) {
    const parts = form.rows
      .filter((r) => (parseNum(r.amount) ?? 0) > 0)
      .map((r) => `${r.name} ${formatNumber(parseNum(r.amount) ?? 0, 4)} ${r.unit}`);
    const caps = parseNum(form.capsulesPerDose) ?? 1;
    const label = capsule
      ? caps === 1
        ? 'Per capsule'
        : `Per dose (${caps} capsules)`
      : `Per dose (${formatNumber(doseG, 2)} g)`;
    if (parts.length) noteLines.push(`${label}: ${parts.join(' | ')}`);
  }
  noteLines.push(...form.notes.split('\n').map((l) => l.trim()).filter(Boolean));
  if (settings.terms_text.trim()) noteLines.push(settings.terms_text.trim());

  const r = form.receiver;
  const inv = form.invoice;
  const cityLine = [r.zip, r.city].filter((s) => s.trim()).join(' ');
  const addressLines = inv.registrationAddress.trim()
    ? [inv.registrationAddress.trim(), r.country]
    : [r.address, cityLine, r.country];

  return {
    offerNo: form.offer.offerNo,
    offerDate: form.offer.offerDate,
    dueDate: form.offer.validUntil,
    customer: {
      name: inv.companyName.trim() || r.fullName.trim(),
      identificationNo: inv.identificationNo.trim(),
      vatNumber: inv.vatNumber.trim(),
      contactPerson: r.fullName.trim(),
      addressLines: addressLines.map((s) => s.trim()).filter(Boolean),
    },
    supplier: {
      name: settings.company_name,
      identificationNo: settings.company_id,
      vatNumber: settings.company_vat,
      address: settings.company_address,
    },
    lines: [productLine, ...result.extraLines],
    subtotal: result.totalPriceExclVat,
    vatAmount: result.vatAmount,
    total: result.totalInclVat,
    bank: { iban: settings.bank_iban, name: settings.bank_name, bic: settings.bank_bic, address: settings.bank_address },
    vatExemptionText: form.addVat ? null : settings.vat_exemption_text.trim() || null,
    paymentTerms: form.paymentTerms.trim(),
    noteLines,
    footerText: settings.footer_text,
    websites: settings.websites
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    customLogo: images.customLogo,
    brandLogos: images.brandLogos,
  };
}

export function offerFileName(form: Pick<OfferForm, 'offer' | 'invoice' | 'receiver'>): string {
  const who = (form.invoice.companyName.trim() || form.receiver.fullName.trim() || 'Client')
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, '_');
  const no = form.offer.offerNo.trim().replace(/[\\/:*?"<>|\s]+/g, '_') || 'draft';
  return `Offer_${no}_${who}.pdf`;
}

const imageFormat = (img: PdfImage) => (img.dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG');

export function createOfferPdf(m: OfferPdfModel, fonts: PdfFonts): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  const register = (file: string, data: string, family: string, style: string) => {
    doc.addFileToVFS(file, data);
    doc.addFont(file, family, style);
  };
  register('Poppins-Regular.ttf', fonts.poppinsRegular, 'Poppins', 'normal');
  register('Poppins-Bold.ttf', fonts.poppinsBold, 'Poppins', 'bold');
  register('Poppins-SemiBold.ttf', fonts.poppinsSemiBold, 'PoppinsSemiBold', 'normal');
  // Poppins has no Cyrillic glyphs: embed the Roboto fallback only when the offer contains Cyrillic text.
  const hasCyrillic = CYRILLIC.test(JSON.stringify({ ...m, customLogo: null, brandLogos: null }));
  if (hasCyrillic) {
    register('Roboto-Regular.ttf', fonts.robotoRegular, 'Roboto', 'normal');
    register('Roboto-Bold.ttf', fonts.robotoBold, 'Roboto', 'bold');
  }

  /** Poppins like the template; Roboto for text with Cyrillic (Poppins has no Cyrillic glyphs). */
  const fontFor = (weight: Weight, text = ''): [string, string] => {
    if (CYRILLIC.test(text)) return ['Roboto', weight === 'regular' ? 'normal' : 'bold'];
    if (weight === 'semibold') return ['PoppinsSemiBold', 'normal'];
    return ['Poppins', weight === 'bold' ? 'bold' : 'normal'];
  };
  const write = (
    text: string,
    x: number,
    y: number,
    opts: { weight?: Weight; size?: number; color?: [number, number, number]; align?: 'left' | 'right' } = {},
  ) => {
    doc.setFont(...fontFor(opts.weight ?? 'regular', text));
    doc.setFontSize(opts.size ?? 9);
    doc.setTextColor(...(opts.color ?? TEXT));
    doc.text(text, x, y, { align: opts.align ?? 'left' });
    return doc.getTextWidth(text);
  };
  /** "Label: value" with the value in bold, as in the template. */
  const labelValue = (label: string, value: string, x: number, y: number, boldValue = true) => {
    const w = write(`${label} `, x, y);
    if (value) write(value, x + w, y, { weight: boldValue ? 'bold' : 'regular' });
  };

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const L = 8.5;
  const R = 193.5;
  const COL2 = 103;
  const bottomLimit = pageH - 18;

  // 1. Header: brand marks (or uploaded logo) + OFFER meta
  if (m.customLogo) {
    const ratio = Math.min(60 / m.customLogo.width, 24 / m.customLogo.height);
    doc.addImage(m.customLogo.dataUrl, imageFormat(m.customLogo), 12, 12, m.customLogo.width * ratio, m.customLogo.height * ratio);
  } else if (m.brandLogos) {
    // The marks have built-in padding; 31 mm boxes give ~24 mm visible logos like the template.
    m.brandLogos.forEach((img, i) =>
      doc.addImage(img.dataUrl, imageFormat(img), L + i * 31.5, 8.5, 31, 31 * (img.height / img.width), `brand${i}`),
    );
  } else {
    write(m.supplier.name.toUpperCase(), 12, 24, { weight: 'bold', size: 20, color: NAVY });
  }
  write(t.pdf.offer, COL2, 17.5, { weight: 'bold', size: 24, color: NAVY });
  labelValue(`${t.pdf.number}:`, m.offerNo, COL2, 24, false);
  labelValue(`${t.pdf.date}:`, formatDate(m.offerDate), COL2, 30, false);
  labelValue(`${t.pdf.dueAt}:`, m.dueDate ? formatDate(m.dueDate) : '', COL2, 36, false);

  // 2. Customer / supplier
  const STEP = 6.2;
  let yc = 51;
  write(t.pdf.customer, L, yc, { weight: 'semibold', size: 11 });
  yc += 7;
  if (m.customer.name) {
    write(m.customer.name, L, yc);
    yc += STEP;
  }
  labelValue(`${t.pdf.identificationNo}:`, m.customer.identificationNo, L, yc);
  yc += STEP;
  labelValue(`${t.pdf.vatNo}:`, m.customer.vatNumber, L, yc);
  yc += STEP;
  if (m.customer.contactPerson) {
    labelValue(`${t.pdf.contactPerson}:`, m.customer.contactPerson, L, yc);
    yc += STEP;
  }
  doc.setFontSize(9);
  for (const line of m.customer.addressLines) {
    doc.setFont(...fontFor('regular', line));
    for (const part of doc.splitTextToSize(line, COL2 - L - 6) as string[]) {
      write(part, L, yc);
      yc += STEP;
    }
  }

  let ys = 51;
  write(t.pdf.supplier, COL2, ys, { weight: 'semibold', size: 11 });
  ys += 7;
  write(m.supplier.name, COL2, ys);
  ys += STEP;
  labelValue(`${t.pdf.identificationNo}:`, m.supplier.identificationNo, COL2, ys);
  ys += STEP;
  labelValue(`${t.pdf.vatNo}:`, m.supplier.vatNumber, COL2, ys);
  ys += STEP;
  doc.setFont(...fontFor('regular', m.supplier.address));
  const addrLabel = `${t.pdf.address}: `;
  const addrParts = doc.splitTextToSize(addrLabel + m.supplier.address, R - COL2) as string[];
  for (const part of addrParts) {
    write(part, COL2, ys);
    ys += STEP;
  }

  // 3. Lines table
  const cellFont = (text: string, weight: Weight) => {
    const [font, fontStyle] = fontFor(weight, text);
    return { font, fontStyle: fontStyle as 'normal' | 'bold' };
  };
  autoTable(doc, {
    startY: Math.max(yc, ys) + 4,
    margin: { left: L, right: pageW - R, bottom: 20 },
    theme: 'plain',
    head: [[t.pdf.description, t.pdf.qty, t.pdf.unit, t.pdf.price, t.pdf.discount, t.pdf.amount]],
    body: m.lines.map((l) => [l.description, formatNumber(l.qty, 2).replace(/,/g, ''), l.unit, money(l.price), money(l.discountPct), money(l.amount)]),
    styles: { font: 'Poppins', fontSize: 9, textColor: TEXT, cellPadding: { top: 2.4, bottom: 2.4, left: 1, right: 1 }, overflow: 'linebreak' },
    headStyles: { font: 'Poppins', fontStyle: 'bold', fontSize: 8, fillColor: HEAD_BG, textColor: NAVY },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 14, halign: 'right' },
      2: { cellWidth: 12, halign: 'center' },
      3: { cellWidth: 18, halign: 'right' },
      4: { cellWidth: 26, halign: 'center' },
      5: { cellWidth: 30, halign: 'right' },
    },
    didParseCell: (data) => {
      const text = data.cell.text.join(' ');
      if (data.section === 'head') {
        data.cell.text = data.cell.text.map((s) => s.toUpperCase());
        if ([1, 3, 5].includes(data.column.index)) data.cell.styles.halign = 'right';
        if ([2, 4].includes(data.column.index)) data.cell.styles.halign = 'center';
      } else if (CYRILLIC.test(text)) {
        Object.assign(data.cell.styles, cellFont(text, 'regular'));
      }
    },
    didDrawCell: (data) => {
      if (data.section !== 'body') return;
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.25);
      doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
    },
  });
  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  const ensureSpace = (needed: number) => {
    if (y + needed > bottomLimit) {
      doc.addPage();
      y = 15;
    }
  };

  // 4. Totals + payment bar
  ensureSpace(32);
  y += 6;
  write(`${t.pdf.subTotal}:`, 150, y, { size: 10.5, align: 'right' });
  write(`${money(m.subtotal)} EUR`, R, y, { size: 10.5, align: 'right' });
  y += 6.5;
  write(`${t.pdf.taxVat}:`, 150, y, { size: 10.5, align: 'right' });
  write(`${money(m.vatAmount)} EUR`, R, y, { size: 10.5, align: 'right' });
  y += 3;
  doc.setFillColor(...BAR_BG);
  doc.rect(L, y, R - L, 10.5, 'F');
  write(`${t.pdf.payment}:`, L + 3.5, y + 6.8, { weight: 'semibold', size: 11 });
  write(`${t.pdf.total}: ${money(m.total)} EUR`, R - 1, y + 6.8, { weight: 'bold', size: 11, align: 'right' });
  y += 10.5 + 10;

  // 5. Bank details + VAT exemption
  ensureSpace(28);
  write(`IBAN: ${m.bank.iban}`, L, y, { weight: 'bold', size: 8.5 });
  if (m.vatExemptionText) write(m.vatExemptionText, R, y, { weight: 'bold', size: 8.5, align: 'right' });
  y += 5.5;
  const bankLines = [
    m.bank.name && `${t.pdf.bank}: ${m.bank.name}`,
    m.bank.bic && `BIC: ${m.bank.bic}`,
    m.bank.address && `${t.pdf.bankAddress}: ${m.bank.address}`,
  ].filter(Boolean) as string[];
  doc.setFontSize(9);
  for (const line of bankLines) {
    doc.setFont(...fontFor('regular', line));
    for (const part of doc.splitTextToSize(line, 85) as string[]) {
      write(part, L, y);
      y += 5.5;
    }
  }
  y += 7;

  // 6. Payment terms + note
  const block = (title: string, lines: string[]) => {
    if (!lines.length) return;
    ensureSpace(14);
    write(title, L, y, { weight: 'bold', size: 8 });
    y += 6.5;
    doc.setFontSize(9);
    for (const line of lines) {
      doc.setFont(...fontFor('regular', line));
      for (const part of doc.splitTextToSize(line, R - L) as string[]) {
        ensureSpace(6);
        write(part, L, y);
        y += 5.2;
      }
    }
    y += 4;
  };
  block(t.pdf.paymentTerms, m.paymentTerms ? [m.paymentTerms] : []);
  block(t.pdf.note, m.noteLines);

  // 7. Footer on every page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...TEXT);
    doc.setLineWidth(0.4);
    doc.line(5, pageH - 10, pageW - 5, pageH - 10);
    write(m.footerText, 5, pageH - 4.5, { size: 8.5 });
    // Websites from the right, each with its brand mark when the built-in marks are used.
    let x = pageW - 5;
    [...m.websites].reverse().forEach((site, idx) => {
      const w = write(site, x, pageH - 4.5, { size: 8.5, align: 'right' });
      x -= w;
      const logo = !m.customLogo && m.brandLogos ? m.brandLogos[m.websites.length - 1 - idx] : undefined;
      if (logo) {
        x -= 6.8;
        const alias = `brand${m.websites.length - 1 - idx}`;
        doc.addImage(logo.dataUrl, imageFormat(logo), x, pageH - 9.1, 6, 6 * (logo.height / logo.width), alias);
      }
      x -= 4.5;
    });
    if (pages > 1) write(fmt(t.pdf.page, { n: i, m: pages }), pageW / 2, pageH - 4.5, { size: 8, align: 'left' });
  }

  return doc;
}

// ---------------------------------------------------------------------------
// Browser helpers: lazy font / image loading and download
// ---------------------------------------------------------------------------

let assetCache: Promise<{ fonts: PdfFonts; brandLogos: [PdfImage, PdfImage] }> | null = null;

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function loadImage(dataUrl: string | null): Promise<PdfImage | null> {
  if (!dataUrl) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

function loadAssets() {
  assetCache ??= (async () => {
    const urls = await Promise.all([
      import('../assets/fonts/Poppins-Regular.ttf?url'),
      import('../assets/fonts/Poppins-SemiBold.ttf?url'),
      import('../assets/fonts/Poppins-Bold.ttf?url'),
      import('../assets/fonts/Roboto-Regular.ttf?url'),
      import('../assets/fonts/Roboto-Bold.ttf?url'),
      import('../assets/brand/logo-nutrikal.png?url'),
      import('../assets/brand/logo-madebynature.png?url'),
    ]);
    const base64 = await Promise.all(
      urls.map(async ({ default: url }) => arrayBufferToBase64(await (await fetch(url)).arrayBuffer())),
    );
    const [poppinsRegular, poppinsSemiBold, poppinsBold, robotoRegular, robotoBold, nk, mbn] = base64;
    const logos = await Promise.all([nk, mbn].map((b) => loadImage(`data:image/png;base64,${b}`)));
    return {
      fonts: { poppinsRegular, poppinsSemiBold, poppinsBold, robotoRegular, robotoBold },
      brandLogos: logos as [PdfImage, PdfImage],
    };
  })().catch((e) => {
    assetCache = null;
    throw e;
  });
  return assetCache;
}

export async function downloadOfferPdf(form: OfferForm, result: CalcResult, settings: Settings): Promise<void> {
  const [{ fonts, brandLogos }, customLogo] = await Promise.all([loadAssets(), loadImage(settings.logo_data_url)]);
  const doc = createOfferPdf(toPdfModel(form, result, settings, { customLogo, brandLogos }), fonts);
  doc.save(offerFileName(form));
}
