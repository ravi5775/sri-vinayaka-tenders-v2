const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const buildLoanReceiptHtml = ({
  customerName,
  loanId = '',
  issueDate,
  phone,
  totalAmount,
  amountPaid,
  balance,
  loanType = '',
  startDate,
  status = '',
  transactions = [],
  generatedAt,
  logoUrl = '',
}) => {
  const formatAmount = (value) => Number(value || 0).toLocaleString('en-IN');
  const formatDate = (value) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return escapeHtml(value);
    return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const totalPaid = transactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const generatedLabel = new Date(generatedAt || Date.now()).toLocaleDateString('en-IN');
  const truncatedLoanId = loanId && loanId.length > 26 ? `${loanId.slice(0, 26)}…` : loanId;
  const logoHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" class="logo" />`
    : '<div class="logo-ph">🏛</div>';
  const rowsHtml = transactions.map((transaction, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${formatDate(transaction.payment_date)}</td>
      <td class="type-link">${escapeHtml(transaction.payment_type === 'interest' ? 'Interest' : 'Principal')}</td>
      <td class="amt">Rs. ${formatAmount(transaction.amount)}</td>
    </tr>
  `).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Loan Receipt — ${escapeHtml(customerName)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
@page{size:A4 portrait;margin:0}
html,body{
  width:210mm;height:297mm;overflow:hidden;
  background:#fff;
  font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#1a202c;
  -webkit-print-color-adjust:exact;print-color-adjust:exact;
}
@media screen{
  body{
    background:#e2e8f0;display:flex;justify-content:center;
    align-items:flex-start;padding:24px 0 40px;
    height:auto;overflow:auto;
  }
}
.page{width:210mm;height:297mm;background:#fff;display:flex;flex-direction:column;overflow:hidden}

.hdr{background:#1a2e4a;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:10pt 18pt;flex-shrink:0}
.hdr-left{display:flex;align-items:center;gap:10pt}
.logo{width:48pt;height:48pt;object-fit:contain;border-radius:50%;background:#fff;padding:2pt}
.logo-ph{width:48pt;height:48pt;display:flex;align-items:center;justify-content:center;font-size:26pt;background:rgba(255,255,255,.15);border-radius:50%}
.brand-name{font-size:19pt;font-weight:700;letter-spacing:.02em}
.brand-sub{font-size:8pt;color:#a0aec0;margin-top:2pt}
.badge{border:1.5pt solid #fff;color:#fff;font-size:7.5pt;font-weight:700;letter-spacing:.1em;padding:4pt 13pt;border-radius:3pt;text-transform:uppercase}

.gold{height:3.5pt;background:linear-gradient(90deg,#b8860b,#f0c040,#b8860b);flex-shrink:0}

.info-grid{display:grid;grid-template-columns:1fr 1fr;border-left:1pt solid #e2e8f0;border-right:1pt solid #e2e8f0;flex-shrink:0}
.ic{padding:7pt 16pt;border-bottom:1pt solid #e2e8f0}
.ic:nth-child(odd){border-right:1pt solid #e2e8f0}
.il{font-size:7pt;text-transform:uppercase;letter-spacing:.07em;color:#718096;margin-bottom:2pt}
.iv{font-size:10pt;font-weight:700;color:#1a202c}

.summary{display:grid;grid-template-columns:repeat(3,1fr);border-left:1pt solid #e2e8f0;border-right:1pt solid #e2e8f0;flex-shrink:0}
.card{padding:9pt 16pt;text-align:center;border-bottom:1pt solid #e2e8f0}
.card:not(:last-child){border-right:1pt solid #e2e8f0}
.card-blue{background:#ebf4ff}.card-green{background:#f0fff4}.card-red{background:#fff5f5}
.cl{font-size:7pt;text-transform:uppercase;letter-spacing:.07em;color:#718096;margin-bottom:3pt}
.cv{font-size:16pt;font-weight:700}
.card-blue .cv{color:#2b6cb0}.card-green .cv{color:#276749}.card-red .cv{color:#c53030}

.meta{display:grid;grid-template-columns:repeat(3,1fr);border-left:1pt solid #e2e8f0;border-right:1pt solid #e2e8f0;border-bottom:1pt solid #e2e8f0;flex-shrink:0}
.mc{padding:7pt 16pt}.mc:not(:last-child){border-right:1pt solid #e2e8f0}

.txn{padding:10pt 18pt 0;flex:1;display:flex;flex-direction:column;min-height:0}
.txn-header{flex-shrink:0;margin-bottom:8pt}
.txn-yellow-bar{height:3.5pt;background:linear-gradient(90deg,#b8860b,#f0c040,#b8860b);width:100%;margin-bottom:6pt}
.txn-title{font-size:12pt;font-weight:700;color:#1a2e4a}
table{width:100%;border-collapse:collapse;font-size:9pt;flex-shrink:0}
thead tr{background:#1a2e4a;color:#fff}
thead th{padding:7pt 10pt;text-align:left;font-weight:600;letter-spacing:.03em}
thead th:last-child{text-align:right}
tbody tr:nth-child(even){background:#f7fafc}
tbody td{padding:6pt 10pt;border-bottom:1pt solid #e2e8f0;color:#2d3748}
.type-link{color:#2b6cb0;font-weight:600}
.amt{text-align:right;font-weight:700}
.empty-cell{padding:14pt 10pt;color:#718096;text-align:center}
.txn-foot{background:#1a2e4a;color:#fff;display:flex;justify-content:space-between;padding:6pt 10pt;font-size:9pt;font-weight:700;flex-shrink:0}

.spacer{flex:1}

.foot{background:#1a2e4a;color:#a0aec0;padding:8pt 18pt;font-size:7.5pt;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
.foot strong{color:#fff}
</style>
</head>
<body>
<div class="page">

  <div class="hdr">
    <div class="hdr-left">
      ${logoHtml}
      <div>
        <div class="brand-name">Sri Vinayaka Tenders</div>
        <div class="brand-sub">Official Loan Receipt</div>
      </div>
    </div>
    <div class="badge">Loan Receipt</div>
  </div>
  <div class="gold"></div>

  <div class="info-grid">
    <div class="ic"><div class="il">Loan ID</div><div class="iv">${escapeHtml(truncatedLoanId) || '—'}</div></div>
    <div class="ic"><div class="il">Issue Date</div><div class="iv">${formatDate(issueDate || startDate)}</div></div>
    <div class="ic"><div class="il">Customer Name</div><div class="iv">${escapeHtml(customerName)}</div></div>
    <div class="ic"><div class="il">Phone</div><div class="iv">${escapeHtml(phone) || '—'}</div></div>
  </div>

  <div class="summary">
    <div class="card card-blue"><div class="cl">Total Amount</div><div class="cv">Rs. ${formatAmount(totalAmount)}</div></div>
    <div class="card card-green"><div class="cl">Amount Paid</div><div class="cv">Rs. ${formatAmount(amountPaid)}</div></div>
    <div class="card card-red"><div class="cl">Balance Due</div><div class="cv">Rs. ${formatAmount(balance)}</div></div>
  </div>

  <div class="meta">
    <div class="mc"><div class="il">Loan Type</div><div class="iv">${escapeHtml(loanType) || '—'}</div></div>
    <div class="mc"><div class="il">Start Date</div><div class="iv">${formatDate(startDate)}</div></div>
    <div class="mc"><div class="il">Status</div><div class="iv">${escapeHtml(status) || '—'}</div></div>
  </div>

  <div class="txn">
    <div class="txn-header">
      <div class="txn-yellow-bar"></div>
      <div class="txn-title">Transaction History</div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:6%">#</th>
          <th style="width:28%">Date</th>
          <th style="width:36%">Type</th>
          <th style="width:30%;text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || '<tr><td class="empty-cell" colspan="4">No transactions available</td></tr>'}
      </tbody>
    </table>
    ${transactions.length > 0 ? `<div class="txn-foot"><span>${transactions.length} Payment(s)</span><span>Total Paid: Rs. ${formatAmount(totalPaid)}</span></div>` : ''}
    <div class="spacer"></div>
  </div>

  <div class="foot">
    <span>Generated: ${generatedLabel}</span>
    <span><strong>Sri Vinayaka Tenders</strong> | Thank you for your business</span>
  </div>

</div>
</body>
</html>`;
};

module.exports = { buildLoanReceiptHtml };