import jsPDF from 'jspdf';
import { Loan, Language } from '../types';
import { sanitizeForFilename } from './sanitizer';
import { calculateTotalAmount, calculateAmountPaid, calculateBalance } from './planCalculations';

// jsPDF doesn't support ₹ with standard fonts — use "Rs." instead
const formatCurrency = (amount: number) =>
  `Rs. ${amount.toLocaleString('en-IN')}`;

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

/** Convert any image URL or existing data-URI to a PNG base64 data URI via canvas */
const loadImageAsBase64 = (src: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 128;
      canvas.height = img.naturalHeight || 128;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('canvas ctx unavailable'));
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = src;
  });

const buildPdf = (doc: jsPDF, loan: Loan, logoDataUri: string | null) => {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentW = pageW - margin * 2;

  // ── Header band ────────────────────────────────────────────────────────
  doc.setFillColor(15, 52, 96);
  doc.rect(0, 0, pageW, 36, 'F');

  // accent stripe
  doc.setFillColor(255, 193, 7);
  doc.rect(0, 33, pageW, 3, 'F');

  // ── Logo ───────────────────────────────────────────────────────────────
  if (logoDataUri) {
    try {
      doc.addImage(logoDataUri, 'PNG', margin, 3, 26, 26);
    } catch (_) { /* ignore */ }
  }

  // ── Company name & receipt label (always centered) ──────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('Sri Vinayaka Tenders', pageW / 2, 14, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 210, 255);
  doc.text('Official Loan Receipt', pageW / 2, 21, { align: 'center' });

  // Receipt badge (right side of header)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageW - margin - 30, 8, 30, 9, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 52, 96);
  doc.text('LOAN RECEIPT', pageW - margin - 15, 14, { align: 'center' });

  let y = 42;

  // ── Info grid ──────────────────────────────────────────────────────────
  doc.setFillColor(245, 248, 255);
  doc.roundedRect(margin, y, contentW, 26, 2, 2, 'F');
  doc.setDrawColor(200, 215, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentW, 26, 2, 2, 'S');

  const drawField = (label: string, value: string, x: number, yy: number) => {
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 130);
    doc.text(label.toUpperCase(), x, yy);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 40);
    doc.text(value, x, yy + 4.5);
  };

  const half = contentW / 2;
  const c1 = margin + 3;
  const c2 = margin + half + 3;

  const shortId = loan.id.length > 22 ? loan.id.substring(0, 22) + '…' : loan.id;
  drawField('Loan ID', shortId, c1, y + 5);
  drawField('Issue Date', formatDate(loan.created_at), c2, y + 5);
  drawField('Customer Name', loan.customerName, c1, y + 16);
  drawField('Phone', loan.phone || '—', c2, y + 16);

  y += 31;

  // ── Summary cards ──────────────────────────────────────────────────────
  const totalAmount = calculateTotalAmount(loan);
  const amountPaid  = calculateAmountPaid(loan.transactions);
  const balance     = calculateBalance(loan);

  const cardW = (contentW - 6) / 3;
  const cards: { label: string; value: string; bg: [number,number,number]; fg: [number,number,number] }[] = [
    { label: 'Total Amount', value: formatCurrency(totalAmount), bg: [224, 236, 255], fg: [15, 52, 96] },
    { label: 'Amount Paid',  value: formatCurrency(amountPaid),  bg: [220, 252, 231], fg: [21, 128, 61] },
    { label: 'Balance Due',  value: formatCurrency(balance),     bg: [254, 226, 226], fg: [185, 28, 28] },
  ];

  cards.forEach((card, i) => {
    const cx = margin + i * (cardW + 3);
    doc.setFillColor(...card.bg);
    doc.roundedRect(cx, y, cardW, 16, 2, 2, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 110);
    doc.text(card.label.toUpperCase(), cx + cardW / 2, y + 5, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...card.fg);
    doc.text(card.value, cx + cardW / 2, y + 12, { align: 'center' });
  });

  y += 21;

  // ── Loan details row ───────────────────────────────────────────────────
  doc.setFillColor(250, 250, 253);
  doc.roundedRect(margin, y, contentW, 14, 2, 2, 'F');
  doc.setDrawColor(220, 220, 232);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentW, 14, 2, 2, 'S');

  const detailItems = [
    { label: 'Loan Type', value: loan.loanType },
    { label: 'Start Date', value: formatDate(loan.startDate) },
    { label: 'Status',     value: loan.status },
  ];
  const dColW = contentW / detailItems.length;
  detailItems.forEach((d, i) => {
    const dx = margin + 3 + i * dColW;
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 130, 140);
    doc.text(d.label.toUpperCase(), dx, y + 5);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 40);
    doc.text(d.value, dx, y + 11);
  });

  y += 19;

  // ── Transaction History ────────────────────────────────────────────────
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 52, 96);
  doc.text('Transaction History', margin, y);
  doc.setDrawColor(255, 193, 7);
  doc.setLineWidth(0.8);
  doc.line(margin, y + 2.5, margin + 52, y + 2.5);

  y += 9;

  const txns = loan.transactions && loan.transactions.length > 0
    ? [...loan.transactions].sort(
        (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
      )
    : [];

  if (txns.length === 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 160, 170);
    doc.text('No transactions recorded yet.', margin, y + 6);
  } else {
    const rowH = 8;

    const drawTableHeader = (yy: number) => {
      doc.setFillColor(15, 52, 96);
      doc.rect(margin, yy, contentW, rowH, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('#',    margin + 3, yy + 5.5);
      doc.text('Date', margin + 12, yy + 5.5);
      doc.text('Type', margin + 65, yy + 5.5);
      doc.text('Amount', margin + contentW - 3, yy + 5.5, { align: 'right' });
    };

    drawTableHeader(y);
    y += rowH;

    txns.forEach((txn, idx) => {
      // New page if needed (leave room for footer)
      if (y + rowH > pageH - 24) {
        doc.addPage();
        y = 20;
        drawTableHeader(y);
        y += rowH;
      }

      if (idx % 2 === 0) {
        doc.setFillColor(246, 249, 255);
        doc.rect(margin, y, contentW, rowH, 'F');
      }

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 50);
      doc.text(String(idx + 1), margin + 3, y + 5.5);
      doc.text(formatDate(txn.payment_date), margin + 12, y + 5.5);

      const typeLabel = txn.payment_type === 'interest' ? 'Interest'
        : txn.payment_type === 'principal' ? 'Principal' : '—';
      const typeColor: [number,number,number] =
        txn.payment_type === 'interest'  ? [21, 128, 61]  :
        txn.payment_type === 'principal' ? [29, 78, 216]  :
        [130, 130, 130];
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...typeColor);
      doc.text(typeLabel, margin + 65, y + 5.5);

      doc.setTextColor(20, 20, 30);
      doc.text(formatCurrency(txn.amount), margin + contentW - 3, y + 5.5, { align: 'right' });

      doc.setDrawColor(225, 232, 245);
      doc.setLineWidth(0.2);
      doc.line(margin, y + rowH, margin + contentW, y + rowH);

      y += rowH;
    });

    // Total row
    y += 2;
    doc.setFillColor(15, 52, 96);
    doc.rect(margin, y, contentW, 9, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`${txns.length} Payment(s)`, margin + 4, y + 6);
    doc.text(`Total Paid: ${formatCurrency(amountPaid)}`, margin + contentW - 3, y + 6, { align: 'right' });
  }

  // ── Footer (last page) ─────────────────────────────────────────────────
  const footerY = pageH - 14;
  doc.setFillColor(15, 52, 96);
  doc.rect(0, footerY - 3, pageW, 20, 'F');
  doc.setFillColor(255, 193, 7);
  doc.rect(0, footerY - 3, pageW, 1.5, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 210, 255);
  doc.text(
    'Sri Vinayaka Tenders  |  Thank you for your business',
    pageW / 2, footerY + 4, { align: 'center' }
  );
  doc.setTextColor(140, 170, 210);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, margin, footerY + 4);
};

export const generateTenderReceipt = async (
  loan: Loan,
  t: (key: string) => string,
  lang: Language,
  logoSrc?: string
) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let logoDataUri: string | null = null;
  if (logoSrc) {
    try {
      logoDataUri = await loadImageAsBase64(logoSrc);
    } catch (_) {
      logoDataUri = null;
    }
  }

  buildPdf(doc, loan, logoDataUri);

  const safeFilename = sanitizeForFilename(loan.customerName);
  doc.save(`Loan-Receipt-${safeFilename}.pdf`);
};
