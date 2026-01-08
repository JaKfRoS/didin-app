
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
