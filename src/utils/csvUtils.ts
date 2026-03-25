import { Loan } from '../types';
import { calculateTotalAmount, calculateAmountPaid, calculateBalance, getLoanStatus } from './planCalculations';

const sanitizeCell = (cellData: any): string => {
  if (cellData === null || typeof cellData === 'undefined') return '""';
  let str = String(cellData);
  const formulaChars = ['=', '+', '-', '@'];
  if (formulaChars.includes(str.charAt(0))) str = `'${str}`;
  return `"${str.replace(/"/g, '""')}"`;
};

export const generateCSV = (loans: Loan[], t: (key: string) => string) => {
  const headers = [
    t('Loan ID'), t('Customer Name'), t('Phone Number'), t('Loan Type'),
    t('Status'), t('Issue Date'), t('Principal Amount'), t('Given Amount (Disbursed)'),
    t('Total Amount'), t('Amount Paid'), t('Balance Due'),
  ];

  const rows = loans.map(loan => {
    const principalText = loan.loanAmount.toLocaleString('en-IN');
    const givenAmountText = loan.givenAmount.toLocaleString('en-IN');
    const rowData = [
      loan.id, loan.customerName, loan.phone || '', t(loan.loanType), t(getLoanStatus(loan)),
      new Date(loan.created_at).toLocaleDateString(), principalText, givenAmountText,
      calculateTotalAmount(loan).toLocaleString('en-IN'),
      calculateAmountPaid(loan.transactions).toLocaleString('en-IN'),
      calculateBalance(loan).toLocaleString('en-IN'),
    ];
    return rowData.map(sanitizeCell).join(',');
  });

  const csvContent = "data:text/csv;charset=utf-8," + [headers.map(sanitizeCell).join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "loan_plans_export.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
