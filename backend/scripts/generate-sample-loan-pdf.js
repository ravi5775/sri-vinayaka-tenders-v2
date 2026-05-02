require('dotenv').config();
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { pool } = require('../src/config/database');
const { buildLoanReceiptHtml } = require('../src/utils/loanReceiptTemplate');

async function main() {
  const client = await pool.connect();
  try {
    const loanResult = await client.query(`
      SELECT l.*, COUNT(t.id) AS transaction_count
      FROM loans l
      LEFT JOIN transactions t ON t.loan_id = l.id
      GROUP BY l.id
      ORDER BY COUNT(t.id) DESC, l.created_at DESC
      LIMIT 1
    `);
    if (loanResult.rows.length === 0) {
      throw new Error('No loans found to generate a sample PDF');
    }

    const loan = loanResult.rows[0];
    const txnResult = await client.query('SELECT * FROM transactions WHERE loan_id = $1 ORDER BY payment_date DESC', [loan.id]);
    const transactions = txnResult.rows.map(t => ({
      ...t,
      amount: Number(t.amount),
      payment_type: t.payment_type || null,
    }));

    const totalAmount = Number(loan.loan_amount || 0);
    const amountPaid = transactions.reduce((sum, txn) => sum + Number(txn.amount || 0), 0);
    const balance = totalAmount - amountPaid;

    const html = buildLoanReceiptHtml({
      customerName: loan.customer_name,
      loanId: loan.id,
      issueDate: loan.created_at || loan.start_date,
      phone: loan.phone,
      totalAmount,
      amountPaid,
      balance,
      loanType: loan.loan_type,
      startDate: loan.start_date,
      status: loan.status,
      transactions,
      generatedAt: Date.now(),
    });

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const outDir = path.join(__dirname, '..', 'generated');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const outFile = path.join(outDir, `sample-loan-receipt-${loan.customer_name.replace(/[^a-z0-9_-]/gi, '_')}.pdf`);
    const htmlFile = path.join(outDir, `sample-loan-receipt-${loan.customer_name.replace(/[^a-z0-9_-]/gi, '_')}.html`);
    fs.writeFileSync(htmlFile, html, 'utf8');
    await page.pdf({ path: outFile, format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    await browser.close();

    console.log(`Generated HTML preview: ${htmlFile}`);
    console.log(`Generated PDF: ${outFile}`);
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();