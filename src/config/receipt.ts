/**
 * Printed stationery configuration.
 * Centralised so the guest receipt and kitchen ticket stay in sync.
 */
export const FOOD_COURT_INFO = {
  name: 'VIVACITY FOOD COURT',
  addressLine1: '349 Badurtola, Kandirpar, Comilla-3500',
  addressLine2: '(Level-5 of Showpno Super Shop)',
  phone: '01338777700',
  bin: 'Applied',
  mushak: '6.3',
  facebook:
    'https://www.facebook.com/photo/?fbid=122120336648537222&set=pcb.122120338040537222',
};

export const KIWEE_LOGO = '/assets/kiwee-logo-transparent.png';

const DHAKA = 'Asia/Dhaka';

export function formatReceiptDate(value: string | number | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
    timeZone: DHAKA,
  })
    .format(date)
    .replace(/ /g, '-');
}

export function formatReceiptTime(value: string | number | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: DHAKA,
  }).format(date);
}

export function money(value: number | string | null | undefined): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

export function orderTypeLabel(order: {
  customerOrderType?: string;
  type?: string;
  orderTypeDescription?: string;
  serviceType?: string;
}): string {
  if (order.orderTypeDescription) return order.orderTypeDescription;
  const takeaway = order.customerOrderType === 'TAKEAWAY' || order.type === 'PARCEL';
  return takeaway ? 'Takeaway → Carryout parcel box' : 'Dine-in → Hall / Table dining';
}

/** Shared 80mm thermal print styles. */
export const THERMAL_PRINT_CSS = `
  @page {
    size: 80mm auto;
    margin: 0;
  }
  @media print {
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
    }
    body * {
      visibility: hidden !important;
    }
    .thermal-print-root,
    .thermal-print-root * {
      visibility: visible !important;
    }
    /* The modal overlay normally adds screen padding; remove it so the
       thermal sheet starts exactly at the 80mm paper edge. */
    .fixed.inset-0 {
      padding: 0 !important;
    }
    .thermal-print-root {
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 80mm !important;
      max-width: 80mm !important;
      margin: 0 !important;
      box-shadow: none !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
    }
    .no-print {
      display: none !important;
    }
    .thermal-page-break {
      break-after: page;
      page-break-after: always;
    }
    .thermal-page-break:last-child {
      break-after: auto;
      page-break-after: auto;
    }
    .thermal-print-root * {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
`;
