// Standard Chart of Accounts (COA) for Vivacity Food Court
export const ACCOUNT_TYPES = {
  ASSET: 'ASSET',
  LIABILITY: 'LIABILITY',
  EQUITY: 'EQUITY',
  REVENUE: 'REVENUE',
  COGS: 'COGS',
  EXPENSE: 'EXPENSE'
};

export const CHART_OF_ACCOUNTS = {
  // --- 1000-1999: ASSETS (Normal: DEBIT) ---
  '1010': { code: '1010', name: 'Cash in Till (Physical Drawer)', type: ACCOUNT_TYPES.ASSET, normal: 'DEBIT' },
  '1020': { code: '1020', name: 'Bank & Online Card Gateway', type: ACCOUNT_TYPES.ASSET, normal: 'DEBIT' },
  '1030': { code: '1030', name: 'bKash Merchant Settlement', type: ACCOUNT_TYPES.ASSET, normal: 'DEBIT' },
  '1040': { code: '1040', name: 'Nagad Merchant Settlement', type: ACCOUNT_TYPES.ASSET, normal: 'DEBIT' },
  '1050': { code: '1050', name: 'NFC / Contactless Clearing', type: ACCOUNT_TYPES.ASSET, normal: 'DEBIT' },
  '1100': { code: '1100', name: 'Accounts Receivable (Customer Dues)', type: ACCOUNT_TYPES.ASSET, normal: 'DEBIT' },
  '1200': { code: '1200', name: 'Food & Beverage Inventory (at Cost)', type: ACCOUNT_TYPES.ASSET, normal: 'DEBIT' },
  '1500': { code: '1500', name: 'Kitchen & Venue Equipment', type: ACCOUNT_TYPES.ASSET, normal: 'DEBIT' },

  // --- 2000-2999: LIABILITIES (Normal: CREDIT) ---
  '2010': { code: '2010', name: 'Accounts Payable - Suppliers', type: ACCOUNT_TYPES.LIABILITY, normal: 'CREDIT' },
  '2020': { code: '2020', name: 'Accrued Operating Expenses Payable', type: ACCOUNT_TYPES.LIABILITY, normal: 'CREDIT' },
  '2030': { code: '2030', name: 'VAT / Tax Payable', type: ACCOUNT_TYPES.LIABILITY, normal: 'CREDIT' },
  '2040': { code: '2040', name: 'Service Charge Clearing / Payable', type: ACCOUNT_TYPES.LIABILITY, normal: 'CREDIT' },

  // --- 3000-3999: EQUITY (Normal: CREDIT) ---
  '3010': { code: '3010', name: "Owner's Capital", type: ACCOUNT_TYPES.EQUITY, normal: 'CREDIT' },
  '3020': { code: '3020', name: 'Retained Earnings (Prior Periods)', type: ACCOUNT_TYPES.EQUITY, normal: 'CREDIT' },
  '3030': { code: '3030', name: 'Current Period Net Income / Loss', type: ACCOUNT_TYPES.EQUITY, normal: 'CREDIT' },

  // --- 4000-4999: REVENUE (Normal: CREDIT) ---
  '4010': { code: '4010', name: 'Food & Beverage Sales Revenue', type: ACCOUNT_TYPES.REVENUE, normal: 'CREDIT' },
  '4020': { code: '4020', name: 'Sales Discounts Allowed', type: ACCOUNT_TYPES.REVENUE, normal: 'DEBIT', contra: true },
  '4030': { code: '4030', name: 'Sales Returns & Customer Refunds', type: ACCOUNT_TYPES.REVENUE, normal: 'DEBIT', contra: true },
  '4040': { code: '4040', name: 'Service Charge Revenue', type: ACCOUNT_TYPES.REVENUE, normal: 'CREDIT' },

  // --- 5000-5999: COST OF GOODS SOLD (Normal: DEBIT) ---
  '5010': { code: '5010', name: 'Cost of Goods Sold - Food Ingredients', type: ACCOUNT_TYPES.COGS, normal: 'DEBIT' },
  '5020': { code: '5020', name: 'Inventory Spoilage & Wastage Loss', type: ACCOUNT_TYPES.COGS, normal: 'DEBIT' },
  '5030': { code: '5030', name: 'Inventory Count Adjustments', type: ACCOUNT_TYPES.COGS, normal: 'DEBIT' },

  // --- 6000-6999: OPERATING EXPENSES (Normal: DEBIT) ---
  '6010': { code: '6010', name: 'Direct Kitchen Supplies', type: ACCOUNT_TYPES.EXPENSE, normal: 'DEBIT' },
  '6020': { code: '6020', name: 'Staff Salaries & Labor', type: ACCOUNT_TYPES.EXPENSE, normal: 'DEBIT' },
  '6030': { code: '6030', name: 'Utilities (Electricity, Gas, Water)', type: ACCOUNT_TYPES.EXPENSE, normal: 'DEBIT' },
  '6040': { code: '6040', name: 'Venue & Stall Rent', type: ACCOUNT_TYPES.EXPENSE, normal: 'DEBIT' },
  '6050': { code: '6050', name: 'Repairs & Equipment Maintenance', type: ACCOUNT_TYPES.EXPENSE, normal: 'DEBIT' },
  '6060': { code: '6060', name: 'Marketing & Promotions', type: ACCOUNT_TYPES.EXPENSE, normal: 'DEBIT' },
  '6070': { code: '6070', name: 'Sanitation & Cleaning Supplies', type: ACCOUNT_TYPES.EXPENSE, normal: 'DEBIT' },
  '6080': { code: '6080', name: 'Packaging & Disposable Ware', type: ACCOUNT_TYPES.EXPENSE, normal: 'DEBIT' },
  '6090': { code: '6090', name: 'Miscellaneous Operating Expenses', type: ACCOUNT_TYPES.EXPENSE, normal: 'DEBIT' }
};

export function getAccountByPaymentMethod(method) {
  switch (method) {
    case 'CASH': return CHART_OF_ACCOUNTS['1010'];
    case 'bKash': return CHART_OF_ACCOUNTS['1030'];
    case 'Nagad': return CHART_OF_ACCOUNTS['1040'];
    case 'Online Card': return CHART_OF_ACCOUNTS['1020'];
    case 'NFC / Contactless': return CHART_OF_ACCOUNTS['1050'];
    default: return CHART_OF_ACCOUNTS['1010'];
  }
}

export function getAccountByExpenseCategory(category) {
  switch (category) {
    case 'Food Cost': return CHART_OF_ACCOUNTS['6010'];
    case 'Labor': return CHART_OF_ACCOUNTS['6020'];
    case 'Utilities': return CHART_OF_ACCOUNTS['6030'];
    case 'Rent': return CHART_OF_ACCOUNTS['6040'];
    case 'Maintenance': return CHART_OF_ACCOUNTS['6050'];
    case 'Marketing': return CHART_OF_ACCOUNTS['6060'];
    case 'Cleaning': return CHART_OF_ACCOUNTS['6070'];
    case 'Packaging': return CHART_OF_ACCOUNTS['6080'];
    default: return CHART_OF_ACCOUNTS['6090'];
  }
}
