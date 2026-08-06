
export interface PricingTier {
  min: number;
  rate: number;
}

export interface ExtraFee {
  id: string;
  label: string;
  amount: number;
}

export interface ServiceState {
  uploadCount: number;
  photoCount: number;
  bannerCount: number;
  videoCount: number;
  logoType: 'none' | 'client' | 'full';
  extraFees: ExtraFee[];
}

export const UPLOAD_TIERS: PricingTier[] = [
  { min: 101, rate: 2500 },
  { min: 76, rate: 3500 },
  { min: 51, rate: 4000 },
  { min: 31, rate: 4500 },
  { min: 0, rate: 5000 },
];

export const PHOTO_TIERS: PricingTier[] = [
  { min: 101, rate: 7500 },
  { min: 76, rate: 8500 },
  { min: 51, rate: 9000 },
  { min: 31, rate: 10000 },
];

export const CONSTANT_PRICES = {
  BANNER: 30000,
  VIDEO: 10000,
  LOGO_CLIENT: 150000,
  LOGO_FULL: 200000,
};

export interface PricingConfig {
  uploadTiers: PricingTier[];
  photoTiers: PricingTier[];
  constantPrices: {
    BANNER: number;
    VIDEO: number;
    LOGO_CLIENT: number;
    LOGO_FULL: number;
  };
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  uploadTiers: [
    { min: 101, rate: 2500 },
    { min: 76, rate: 3500 },
    { min: 51, rate: 4000 },
    { min: 31, rate: 4500 },
    { min: 0, rate: 5000 },
  ],
  photoTiers: [
    { min: 101, rate: 7500 },
    { min: 76, rate: 8500 },
    { min: 51, rate: 9000 },
    { min: 31, rate: 10000 },
  ],
  constantPrices: {
    BANNER: 30000,
    VIDEO: 10000,
    LOGO_CLIENT: 150000,
    LOGO_FULL: 200000,
  },
};

const STORAGE_KEY = 'oneway_pricing_config';

export function getStoredPricingConfig(): PricingConfig {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed && parsed.uploadTiers && parsed.photoTiers && parsed.constantPrices) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load pricing config', e);
  }
  return DEFAULT_PRICING_CONFIG;
}

export function savePricingConfigToStorage(config: PricingConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save pricing config', e);
  }
}

export interface InvoiceItem {
  id: string;
  description: string;
  qty: number | string;
  unitPrice: number;
  totalPrice?: number;
}

export interface InvoiceProjectGroup {
  id: string;
  projectName: string;
  items: InvoiceItem[];
}

export interface InvoiceDocumentData {
  logoText: string;
  logoSubtext: string;
  invoiceTitle: string;
  invoiceNumber: string;
  invoiceDate: string;
  clientName: string;
  projectDescription: string;
  projects: InvoiceProjectGroup[];
  paymentInfo: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  dpAmount: number;
  footerNote: string;
}

export const createDefaultInvoiceData = (clientName = '', shopName = '', breakdown?: QuoteBreakdown): InvoiceDocumentData => {
  const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const randomNo = Math.floor(100 + Math.random() * 900);
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const currentYear = new Date().getFullYear();

  const items: InvoiceItem[] = [];

  if (breakdown) {
    if (breakdown.upload.count > 0) {
      items.push({
        id: 'item-upload',
        description: 'Listing Produk',
        qty: breakdown.upload.count,
        unitPrice: breakdown.upload.rate,
        totalPrice: breakdown.upload.total
      });
    }
    if (breakdown.photo.count > 0) {
      items.push({
        id: 'item-photo',
        description: 'Optimasi Produk / Foto Produk',
        qty: breakdown.photo.count,
        unitPrice: breakdown.photo.rate,
        totalPrice: breakdown.photo.total
      });
    }
    if (breakdown.logo.total > 0) {
      items.push({
        id: 'item-logo',
        description: breakdown.logo.type || 'Logo + Konsep',
        qty: 1,
        unitPrice: breakdown.logo.total,
        totalPrice: breakdown.logo.total
      });
    }
    if (breakdown.banner.count > 0) {
      items.push({
        id: 'item-banner',
        description: 'Dekorasi Toko / Banner',
        qty: breakdown.banner.count,
        unitPrice: breakdown.banner.rate,
        totalPrice: breakdown.banner.total
      });
    }
    if (breakdown.video.count > 0) {
      items.push({
        id: 'item-video',
        description: 'Video Produk',
        qty: breakdown.video.count,
        unitPrice: breakdown.video.rate,
        totalPrice: breakdown.video.total
      });
    }
  }

  // If no items from breakdown, supply clean example rows matching sample
  if (items.length === 0) {
    items.push(
      { id: '1', description: 'Listing Produk', qty: 26, unitPrice: 15000, totalPrice: 390000 },
      { id: '2', description: 'Optimasi Produk / Foto Produk', qty: 26, unitPrice: 50000, totalPrice: 1300000 },
      { id: '3', description: 'Logo + Konsep', qty: '0,3', unitPrice: 200000, totalPrice: 60000 },
      { id: '4', description: 'Dekorasi Toko / Banner', qty: 5, unitPrice: 30000, totalPrice: 150000 }
    );
  }

  const projName = shopName ? `PROJECT: ${shopName.toUpperCase()} (PEMBUATAN AKUN SHOPEE)` : 'PROJECT: UTAMA (PEMBUATAN AKUN SHOPEE)';

  return {
    logoText: 'OneWay',
    logoSubtext: 'VISION, ONE POINT',
    invoiceTitle: 'INVOICE',
    invoiceNumber: `INV/OW/${currentYear}/${currentMonth}/${randomNo}`,
    invoiceDate: dateStr,
    clientName: clientName || 'Yudha Kurniawan',
    projectDescription: shopName ? `Project Pembuatan Akun Shopee (${shopName})` : 'Project Pembuatan Akun Shopee',
    projects: [
      {
        id: 'proj-1',
        projectName: projName,
        items: items
      }
    ],
    paymentInfo: {
      bankName: 'SeaBank',
      accountNumber: '9013 1445 4996',
      accountName: 'OneWay'
    },
    dpAmount: 0,
    footerNote: 'Terima kasih telah bekerja sama dengan OneWay.'
  };
};

export interface QuoteBreakdown {
  upload: { count: number; rate: number; total: number };
  photo: { count: number; rate: number; total: number };
  banner: { count: number; rate: number; total: number };
  video: { count: number; rate: number; total: number };
  logo: { type: string; total: number };
  extraFeesTotal: number;
  subtotal: number;
  discount: number;
  grandTotal: number;
}
