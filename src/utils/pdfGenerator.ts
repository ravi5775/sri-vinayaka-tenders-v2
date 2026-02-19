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

export const generateTenderReceipt = (
  loan: Loan,
  t: (key: string) => string,
  lang: Language,
  logoBase64?: string
) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentW = pageW - margin * 2;

  // ── Background header band ──────────────────────────────────────────────
  doc.setFillColor(15, 52, 96);          // deep navy
  doc.rect(0, 0, pageW, 52, 'F');

  // ── Logo ────────────────────────────────────────────────────────────────
  if (logoBase64) {
    try {
      const imgType = logoBase64.includes('data:image/png') ? 'PNG' : 'JPEG';
      const base64Data = logoBase64.includes(',') ? logoBase64 : `data:image/png;base64,${logoBase64}`;
      doc.addImage(base64Data, imgType, margin, 8, 22, 22);
    } catch (e) {
      // skip logo if it fails
    }
  }

  // ── Company name & subtitle ─────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('Sri Vinayaka Tenders', pageW / 2, 20, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 210, 255);
  doc.text('Official Loan Receipt', pageW / 2, 28, { align: 'center' });

  // ── Receipt badge ───────────────────────────────────────────────────────
  doc.setFillColor(255, 193, 7);
  doc.roundedRect(pageW / 2 - 22, 33, 44, 9, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 52, 96);
  doc.text('LOAN RECEIPT', pageW / 2, 39, { align: 'center' });

  // ── Reset text colour ───────────────────────────────────────────────────
  let y = 62;
  doc.setTextColor(30, 30, 30);

  // ── Helper to draw a labelled row ───────────────────────────────────────
  const drawRow = (label: string, value: string, x: number, yPos: number, colW: number) => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(110, 110, 110);
    doc.text(label.toUpperCase(), x, yPos);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 20);
    doc.text(value, x, yPos + 5);
  };

  // ── Info section ────────────────────────────────────────────────────────
  doc.setFillColor(245, 248, 255);
  doc.roundedRect(margin, y - 4, contentW, 36, 3, 3, 'F');
  doc.setDrawColor(200, 215, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y - 4, contentW, 36, 3, 3, 'S');

  const col1 = margin + 4;
  const col2 = margin + contentW / 2 + 4;

  drawRow('Loan ID', loan.id.substring(0, 18) + '...', col1, y + 2, contentW / 2);
  drawRow('Issue Date', formatDate(loan.created_at), col2, y + 2, contentW / 2);
  drawRow('Customer Name', loan.customerName, col1, y + 16, contentW / 2);
  drawRow('Phone', loan.phone || '—', col2, y + 16, contentW / 2);

  y += 44;

  // ── Summary cards ───────────────────────────────────────────────────────
  const totalAmount = calculateTotalAmount(loan);
  const amountPaid = calculateAmountPaid(loan.transactions);
  const balance = calculateBalance(loan);

  const cardW = (contentW - 8) / 3;
  const cards = [
    { label: 'Total Amount', value: formatCurrency(totalAmount), color: [15, 52, 96] as [number, number, number], bg: [230, 240, 255] as [number, number, number] },
    { label: 'Amount Paid', value: formatCurrency(amountPaid), color: [21, 128, 61] as [number, number, number], bg: [220, 252, 231] as [number, number, number] },
    { label: 'Balance Due', value: formatCurrency(balance), color: [185, 28, 28] as [number, number, number], bg: [254, 226, 226] as [number, number, number] },
  ];

  cards.forEach((card, i) => {
    const cx = margin + i * (cardW + 4);
    doc.setFillColor(...card.bg);
    doc.roundedRect(cx, y, cardW, 22, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(card.label.toUpperCase(), cx + cardW / 2, y + 7, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...card.color);
    doc.text(card.value, cx + cardW / 2, y + 16, { align: 'center' });
  });

  y += 30;

  // ── Loan details row ────────────────────────────────────────────────────
  const loanDetails = [
    { label: 'Loan Type', value: loan.loanType },
    { label: 'Start Date', value: formatDate(loan.startDate) },
    { label: 'Status', value: loan.status },
  ];

  doc.setFillColor(250, 250, 252);
  doc.roundedRect(margin, y, contentW, 18, 2, 2, 'F');
  doc.setDrawColor(220, 220, 230);
  doc.roundedRect(margin, y, contentW, 18, 2, 2, 'S');

  const detailColW = contentW / loanDetails.length;
  loanDetails.forEach((d, i) => {
    const dx = margin + 4 + i * detailColW;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 130, 130);
    doc.text(d.label.toUpperCase(), dx, y + 6);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(d.value, dx, y + 14);
  });

  y += 26;

  // ── Transaction History table ───────────────────────────────────────────
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 52, 96);
  doc.text('Transaction History', margin, y);

  // divider
  doc.setDrawColor(15, 52, 96);
  doc.setLineWidth(0.5);
  doc.line(margin, y + 2, margin + contentW, y + 2);

  y += 8;

  if (loan.transactions && loan.transactions.length > 0) {
    // Sort transactions oldest → newest
    const sorted = [...loan.transactions].sort(
      (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
    );

    // Table header
    const rowH = 8;
    doc.setFillColor(15, 52, 96);
    doc.rect(margin, y, contentW, rowH, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('#', margin + 4, y + 5.5);
    doc.text('Date', margin + 14, y + 5.5);
    doc.text('Type', margin + 68, y + 5.5);
    doc.text('Amount', margin + contentW - 4, y + 5.5, { align: 'right' });

    y += rowH;

    // Table rows
    sorted.forEach((txn, idx) => {
      // New page if needed
      if (y + rowH > pageH - 28) {
        doc.addPage();
        y = 20;
        // Re-draw header on new page
        doc.setFillColor(15, 52, 96);
        doc.rect(margin, y, contentW, rowH, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('#', margin + 4, y + 5.5);
        doc.text('Date', margin + 14, y + 5.5);
        doc.text('Type', margin + 68, y + 5.5);
        doc.text('Amount', margin + contentW - 4, y + 5.5, { align: 'right' });
        y += rowH;
      }

      const isEven = idx % 2 === 0;
      if (isEven) {
        doc.setFillColor(248, 250, 255);
        doc.rect(margin, y, contentW, rowH, 'F');
      }

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      doc.text(String(idx + 1), margin + 4, y + 5.5);
      doc.text(formatDate(txn.payment_date), margin + 14, y + 5.5);

      // Payment type badge text
      const typeText = txn.payment_type === 'interest' ? 'Interest' : txn.payment_type === 'principal' ? 'Principal' : '—';
      const typeColor: [number, number, number] = txn.payment_type === 'interest' ? [21, 128, 61] : txn.payment_type === 'principal' ? [29, 78, 216] : [100, 100, 100];
      doc.setTextColor(...typeColor);
      doc.setFont('helvetica', 'bold');
      doc.text(typeText, margin + 68, y + 5.5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 20, 20);
      doc.text(formatCurrency(txn.amount), margin + contentW - 4, y + 5.5, { align: 'right' });

      // Row bottom border
      doc.setDrawColor(230, 235, 245);
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
    doc.text(`Total Paid: ${formatCurrency(amountPaid)}`, margin + contentW - 4, y + 6, { align: 'right' });
    doc.text(`${sorted.length} Payment(s)`, margin + 4, y + 6);
    y += 9;
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('No transactions recorded yet.', margin, y + 6);
    y += 14;
  }

  // ── Footer ──────────────────────────────────────────────────────────────
  const footerY = pageH - 16;
  doc.setFillColor(15, 52, 96);
  doc.rect(0, footerY - 4, pageW, 20, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 210, 255);
  doc.text('Sri Vinayaka Tenders  |  Thank you for your business', pageW / 2, footerY + 4, { align: 'center' });

  // Page number
  doc.setTextColor(140, 170, 210);
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-IN')}`,
    margin,
    footerY + 4
  );

  // ── Save ─────────────────────────────────────────────────────────────────
  const safeFilename = sanitizeForFilename(loan.customerName);
  doc.save(`Loan-Receipt-${safeFilename}.pdf`);
};
