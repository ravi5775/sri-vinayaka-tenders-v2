# Investor Module - Complete Guide

## Overview

The Investor Module tracks money received from investors, calculates monthly interest/profit owed to them, and monitors payment status. It helps you know **how much you owe each investor** and **whether you're paying them on time**.

---

## Key Concepts

### Investment Types

| Type | Description |
|------|-------------|
| **Interest Rate Plan** | Investor gives you a lump sum. You pay them monthly interest (profit) based on a fixed percentage. The principal stays with you until the investor closes. |
| **Finance** | One-time investment with profit sharing |
| **Tender** | Project-based investment |

### Payment Types

| Type | Effect |
|------|--------|
| **Interest / Profit** | Pays off the monthly interest you owe. Does NOT reduce the invested amount. |
| **Principal** | Returns part of the original investment. This **reduces the base amount**, so future monthly interest decreases. |

---

## How Interest Calculation Works

### Formula

```
Monthly Interest = Effective Investment × (Profit Rate / 100)
```

Where:
```
Effective Investment = Original Investment - Total Principal Payments Made
```

### Example 1: Basic Interest Tracking

**Investor:** Ravi  
**Investment:** ₹1,00,000  
**Profit Rate:** 1.5% per month  
**Start Date:** January 1, 2026  

| Month | Monthly Interest Owed | Accumulated Profit | You Paid | Pending |
|-------|----------------------|-------------------|----------|---------|
| Jan   | ₹1,500              | ₹1,500            | ₹0       | ₹1,500  |
| Feb   | ₹1,500              | ₹3,000            | ₹1,500   | ₹1,500  |
| Mar   | ₹1,500              | ₹4,500            | ₹3,000   | ₹1,500  |

- **Status:** "Delayed" (because ₹1,500 is still pending)
- **Missed Months:** 1

### Example 2: Principal Payment Reduces Future Interest

**Investor:** Mohan  
**Investment:** ₹2,00,000  
**Profit Rate:** 1% per month  
**Start Date:** January 1, 2026  

**Month 1-3:** Monthly Interest = ₹2,00,000 × 1% = **₹2,000/month**

**In March:** You make a **Principal payment of ₹50,000**

**Month 4 onward:**
```
Effective Investment = ₹2,00,000 - ₹50,000 = ₹1,50,000
New Monthly Interest = ₹1,50,000 × 1% = ₹1,500/month
```

So paying back principal **saves you ₹500/month** in interest going forward.

### Example 3: Fully Paid On Track

**Investor:** Satya  
**Investment:** ₹3,00,000  
**Profit Rate:** 1.25% per month  
**Start Date:** December 1, 2025  
**Monthly Interest:** ₹3,750  

| Month | Owed  | Paid (Interest) | Cumulative Paid | Pending |
|-------|-------|-----------------|-----------------|---------|
| Dec   | ₹3,750 | ₹3,750         | ₹3,750          | ₹0      |
| Jan   | ₹3,750 | ₹3,750         | ₹7,500          | ₹0      |
| Feb   | ₹3,750 | ₹3,750         | ₹11,250         | ₹0      |

- **Status:** "On Track" ✅
- **Missed Months:** 0

---

## Dashboard Metrics Explained

### Per-Investor Metrics (Table Columns)

| Column | Meaning | Example |
|--------|---------|---------|
| **Invested Amount** | Original amount the investor gave you | ₹2,00,000 |
| **Interest** | Monthly interest you owe (based on effective investment) | ₹2,000 |
| **Accumulated Profit** | Total interest earned since start date | ₹14,000 (7 months × ₹2,000) |
| **Total Paid** | Sum of all payments (Interest + Principal) you've made | ₹8,000 |
| **Missed Months** | How many months of interest are unpaid | 3 |
| **Status** | "On Track" if pending ≤ 0, "Delayed" if pending > 0, "Closed" if manually closed | Delayed |
| **Next Payout Date** | Next monthly date when interest is due | 1/3/2026 |

### Summary Cards (Top of Dashboard)

| Card | Formula | Example |
|------|---------|---------|
| **Total Investors** | Count of all investors | 10 |
| **Total Investment Amount** | Sum of all `investmentAmount` values | ₹26,40,000 |
| **Total Profit Earned** | Sum of all `accumulatedProfit` across investors | ₹1,10,375 |
| **Total Paid to Investors** | Sum of all payments (Interest + Principal) | ₹73,250 |
| **Total Pending Profit** | For non-InterestRate plans: accumulatedProfit - totalPaid | ₹0 |
| **Overall Profit/Loss** | Total Paid - Total Investment (negative means you still hold their money) | ₹-25,66,750 |

> **Note:** "Overall Profit/Loss" being negative (e.g., ₹-25,66,750) is **normal**. It means you haven't returned the investors' principal yet. It only becomes a concern if it's more negative than expected.

---

## Status Logic

```
If investor.status === 'Closed' → Status = "Closed"
If pendingProfit > ₹0.01      → Status = "Delayed"  
Otherwise                      → Status = "On Track"
```

Where:
```
pendingProfit = accumulatedProfit - totalInterestPaid
```

**Important:** Only **Interest/Profit payments** count toward clearing pending profit. Principal payments reduce the investment base but don't clear interest dues.

---

## Missed Months Calculation

```
missedMonths = floor(pendingProfit / monthlyInterest)
```

**Example:**  
- Monthly Interest: ₹2,000  
- Pending Profit: ₹5,500  
- Missed Months: floor(5500 / 2000) = **2**

---

## Payment Workflows

### Paying Monthly Interest
1. Click the ₹ (Pay) button on the investor row
2. Select payment type: **Interest** or **Profit**
3. Enter amount (e.g., ₹2,000)
4. This reduces "Pending Profit" and may change status from "Delayed" to "On Track"

### Returning Principal
1. Click the ₹ (Pay) button
2. Select payment type: **Principal**
3. Enter amount (e.g., ₹50,000)
4. This reduces the effective investment, lowering future monthly interest

### Viewing Payment History
1. Click the 🕐 (History) button
2. See all past payments with dates, amounts, and types

---

## Real-World Scenario

You borrow ₹6,00,000 from PAVAN at 1% monthly interest.

- **Monthly due:** ₹6,000
- **Start date:** March 1, 2025
- **Today:** February 19, 2026 (11 months completed)

```
Accumulated Profit = ₹6,000 × 11 = ₹66,000
You've paid so far: ₹52,000 (all Interest payments)
Pending: ₹66,000 - ₹52,000 = ₹14,000
Missed Months: floor(14000 / 6000) = 2
Status: Delayed
```

If you now pay ₹14,000 as Interest:
```
Pending: ₹66,000 - ₹66,000 = ₹0
Status: On Track ✅
```

If instead you pay ₹1,00,000 as Principal:
```
New Effective Investment: ₹6,00,000 - ₹1,00,000 = ₹5,00,000
New Monthly Interest: ₹5,00,000 × 1% = ₹5,000
(Future months cost you ₹1,000 less each month)
```

---

## Database Tables

### `investors`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Unique ID |
| user_id | UUID | Owner of this record |
| name | TEXT | Investor name |
| investment_amount | NUMERIC | Original invested amount |
| investment_type | TEXT | Finance / Tender / InterestRatePlan |
| profit_rate | NUMERIC | Monthly profit percentage |
| start_date | DATE | When the investment started |
| status | TEXT | On Track / Delayed / Closed |

### `investor_payments`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Unique ID |
| investor_id | UUID | Links to investor |
| user_id | UUID | Owner of this record |
| amount | NUMERIC | Payment amount |
| payment_date | DATE | When payment was made |
| payment_type | TEXT | Principal / Interest / Profit |
| remarks | TEXT | Optional notes |
