
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { 
  ShoppingBag, 
  Image as ImageIcon, 
  Video, 
  Palette, 
  Layout, 
  ArrowRight, 
  CheckCircle2, 
  Copy,
  Sparkles,
  RefreshCw,
  Send,
  Star,
  X,
  User,
  FileText,
  MinusCircle,
  PlusCircle,
  Trash2,
  Tag,
  Clock,
  ShieldCheck,
  Calendar,
  Download,
  Loader2,
  BadgeCheck,
  Instagram,
  Globe,
  Banknote,
  Percent,
  Lock,
  Printer
} from 'lucide-react';
import { 
  PricingConfig,
  PricingTier,
  getStoredPricingConfig,
  ServiceState, 
  QuoteBreakdown,
  ExtraFee,
  InvoiceDocumentData,
  createDefaultInvoiceData
} from './types';
import AdminPage from './AdminPage';
import InvoiceView from './InvoiceView';
import InvoicePage from './InvoicePage';
import { GoogleGenAI } from "@google/genai";
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';

// Helper for currency formatting
const formatIDR = (val: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(val);
};

export default function App() {
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(() => getStoredPricingConfig());
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(() => {
    return window.location.pathname.endsWith('/admin') || window.location.hash.includes('admin');
  });
  const [isInvoicePageOpen, setIsInvoicePageOpen] = useState<boolean>(() => {
    return window.location.hash.includes('invoice');
  });

  const [clientName, setClientName] = useState('');
  const [shopName, setShopName] = useState('');
  const [discountType, setDiscountType] = useState<'none' | 'nominal' | 'percent'>('none');
  const [discountValue, setDiscountValue] = useState(0);
  
  const [newFeeLabel, setNewFeeLabel] = useState('');
  const [newFeeAmount, setNewFeeAmount] = useState<number | ''>('');

  const [state, setState] = useState<ServiceState>({
    uploadCount: 0,
    photoCount: 0,
    bannerCount: 0,
    videoCount: 0,
    logoType: 'none',
    extraFees: []
  });

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showFloatingBar, setShowFloatingBar] = useState(true);

  const desktopInvoiceRef = useRef<HTMLDivElement>(null);
  const mobileInvoiceRef = useRef<HTMLDivElement>(null);
  const invoiceSectionRef = useRef<HTMLElement>(null);

  const calculateRate = (count: number, tiers: PricingTier[]) => {
    if (!tiers || tiers.length === 0) return 0;
    const sortedTiers = [...tiers].sort((a, b) => b.min - a.min);
    const tier = sortedTiers.find(t => count >= t.min);
    return tier ? tier.rate : sortedTiers[sortedTiers.length - 1].rate;
  };

  const breakdown = useMemo((): QuoteBreakdown => {
    const uploadRate = calculateRate(state.uploadCount, pricingConfig.uploadTiers);
    const photoRate = calculateRate(state.photoCount, pricingConfig.photoTiers);
    
    const uploadTotal = state.uploadCount * uploadRate;
    const photoTotal = state.photoCount * photoRate;
    const bannerTotal = state.bannerCount * pricingConfig.constantPrices.BANNER;
    const videoTotal = state.videoCount * pricingConfig.constantPrices.VIDEO;
    
    let logoTotal = 0;
    let logoName = 'Tanpa Logo';
    if (state.logoType === 'client') {
      logoTotal = pricingConfig.constantPrices.LOGO_CLIENT;
      logoName = 'Logo (Konsep Klien)';
    } else if (state.logoType === 'full') {
      logoTotal = pricingConfig.constantPrices.LOGO_FULL;
      logoName = 'Logo + Konsep (Pro)';
    }

    const extraFeesTotal = state.extraFees.reduce((sum, fee) => sum + fee.amount, 0);
    const subtotal = uploadTotal + photoTotal + bannerTotal + videoTotal + logoTotal + extraFeesTotal;
    
    let discount = 0;
    if (discountType === 'nominal') {
      discount = discountValue;
    } else if (discountType === 'percent') {
      discount = subtotal * (discountValue / 100);
    }

    return {
      upload: { count: state.uploadCount, rate: uploadRate, total: uploadTotal },
      photo: { count: state.photoCount, rate: photoRate, total: photoTotal },
      banner: { count: state.bannerCount, rate: pricingConfig.constantPrices.BANNER, total: bannerTotal },
      video: { count: state.videoCount, rate: pricingConfig.constantPrices.VIDEO, total: videoTotal },
      logo: { type: logoName, total: logoTotal },
      extraFeesTotal,
      subtotal,
      discount,
      grandTotal: Math.max(0, subtotal - discount)
    };
  }, [state, discountType, discountValue, pricingConfig]);

  const [invoiceDocData, setInvoiceDocData] = useState<InvoiceDocumentData>(() => 
    createDefaultInvoiceData('', '', undefined)
  );

  const handleSyncInvoiceFromCalc = useCallback(() => {
    setInvoiceDocData(createDefaultInvoiceData(clientName, shopName, breakdown));
  }, [clientName, shopName, breakdown]);

  // Keep clientName & shopName updated in invoice metadata if edited in calc form
  useEffect(() => {
    setInvoiceDocData(prev => ({
      ...prev,
      clientName: clientName || prev.clientName,
      projectDescription: shopName ? `Project Pembuatan Akun Shopee (${shopName})` : prev.projectDescription,
      discountAmount: breakdown.discount
    }));
  }, [clientName, shopName, breakdown.discount]);

  // Listen for /admin path, #admin or #invoice hash
  useEffect(() => {
    const handleLocationChange = () => {
      const isNavigatedToAdmin = window.location.pathname.endsWith('/admin') || window.location.hash.includes('admin');
      const isNavigatedToInvoice = window.location.hash.includes('invoice');
      
      setIsAdminOpen(isNavigatedToAdmin);
      setIsInvoicePageOpen(isNavigatedToInvoice);
    };

    handleLocationChange();

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const openAdmin = () => {
    setIsAdminOpen(true);
    if (!window.location.hash.includes('admin')) {
      window.history.pushState({}, '', '#admin');
    }
  };

  const closeAdmin = () => {
    setIsAdminOpen(false);
    if (window.location.hash.includes('admin')) {
      window.history.pushState({}, '', window.location.pathname);
    }
  };

  const openInvoicePage = () => {
    setIsInvoicePageOpen(true);
    if (!window.location.hash.includes('invoice')) {
      window.history.pushState({}, '', '#invoice');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeInvoicePage = () => {
    setIsInvoicePageOpen(false);
    if (window.location.hash.includes('invoice')) {
      window.history.pushState({}, '', window.location.pathname);
    }
  };

  // Intersection Observer to hide floating bar when invoice section is reached
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowFloatingBar(!entry.isIntersecting);
      },
      { 
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px' 
      }
    );

    if (invoiceSectionRef.current) {
      observer.observe(invoiceSectionRef.current);
    }

    return () => {
      if (invoiceSectionRef.current) {
        observer.unobserve(invoiceSectionRef.current);
      }
    };
  }, []);

  const addExtraFee = () => {
    if (!newFeeLabel || !newFeeAmount) return;
    const newFee: ExtraFee = {
      id: crypto.randomUUID(),
      label: newFeeLabel,
      amount: Number(newFeeAmount)
    };
    setState(prev => ({ ...prev, extraFees: [...prev.extraFees, newFee] }));
    setNewFeeLabel('');
    setNewFeeAmount('');
  };

  const removeExtraFee = (id: string) => {
    setState(prev => ({ ...prev, extraFees: prev.extraFees.filter(f => f.id !== id) }));
  };

  const generateInvoiceText = useCallback(() => {
    const date = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    let servicesList = '';
    if (breakdown.upload.count > 0) servicesList += `• Upload Produk (${breakdown.upload.count}x): ${formatIDR(breakdown.upload.total)}\n`;
    if (breakdown.photo.count > 0) servicesList += `• Desain Foto (${breakdown.photo.count}x): ${formatIDR(breakdown.photo.total)}\n`;
    if (breakdown.banner.count > 0) servicesList += `• Banner Toko (${breakdown.banner.count}x): ${formatIDR(breakdown.banner.total)}\n`;
    if (breakdown.video.count > 0) servicesList += `• Video Produk (${breakdown.video.count}x): ${formatIDR(breakdown.video.total)}\n`;
    if (state.logoType !== 'none') servicesList += `• Branding Logo: ${formatIDR(breakdown.logo.total)}\n`;
    state.extraFees.forEach(fee => { servicesList += `• ${fee.label}: ${formatIDR(fee.amount)}\n`; });

    return `*RINCIAN PENAWARAN JASA*
*by OneWay media*

📅 Tgl: ${date}
👤 Klien: ${clientName || '-'}
🏪 Toko: ${shopName || '-'}

*Daftar Pesanan:*
${servicesList.trim() || '• (Belum ada layanan dipilih)'}

💰 Subtotal: ${formatIDR(breakdown.subtotal)}
📉 Diskon: -${formatIDR(breakdown.discount)}

*TOTAL BAYAR: ${formatIDR(breakdown.grandTotal)}*

*Ketentuan Layanan OneWay media:*
• Sistem bayar: Setelah project jadi / selesai.
• Revisi: Berlaku untuk revisi minor saja.
• Estimasi: Segera setelah konfirmasi.

Apakah rincian dan nominal di atas sudah sesuai? Jika ya, akan segera kami eksekusi. Mohon konfirmasinya ya!`.trim();
  }, [breakdown, clientName, shopName, state.logoType, state.extraFees]);

  const resetCalculator = () => {
    setState({ uploadCount: 0, photoCount: 0, bannerCount: 0, videoCount: 0, logoType: 'none', extraFees: [] });
    setClientName('');
    setShopName('');
    setDiscountType('none');
    setDiscountValue(0);
    setAiAnalysis(null);
  };

  const downloadInvoiceImage = async () => {
    const targetRef = window.innerWidth >= 1024 ? desktopInvoiceRef : mobileInvoiceRef;
    if (!targetRef.current) return;
    setIsDownloading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      let dataUrl = '';
      try {
        dataUrl = await toJpeg(targetRef.current, { 
          quality: 0.95,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          skipFonts: true
        });
      } catch (e) {
        console.warn('Initial JPEG conversion warning, trying fallback...', e);
        dataUrl = await toJpeg(targetRef.current, { 
          quality: 0.9,
          pixelRatio: 1,
          backgroundColor: '#ffffff',
          skipFonts: true,
          fontEmbedCSS: ''
        });
      }

      const link = document.createElement('a');
      link.download = `Invoice_OneWay_${shopName || clientName || 'Client'}_${new Date().getTime()}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Download failed', err);
      alert('Gagal mengunduh gambar. Silakan coba lagi.');
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadInvoicePDF = async () => {
    const targetRef = window.innerWidth >= 1024 ? desktopInvoiceRef : mobileInvoiceRef;
    if (!targetRef.current) return;
    setIsDownloadingPdf(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      let dataUrl = '';
      try {
        dataUrl = await toJpeg(targetRef.current, { 
          quality: 0.95,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          skipFonts: true
        });
      } catch (e) {
        console.warn('Initial JPEG conversion warning, trying fallback...', e);
        dataUrl = await toJpeg(targetRef.current, { 
          quality: 0.9,
          pixelRatio: 1,
          backgroundColor: '#ffffff',
          skipFonts: true,
          fontEmbedCSS: ''
        });
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_OneWay_${invoiceDocData.clientName || shopName || 'Client'}_${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error('PDF Download failed', err);
      alert('Gagal mengunduh PDF. Silakan coba lagi.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateInvoiceText());
    alert('Invoice disalin ke clipboard!');
  };

  const handleSendInvoice = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://wa.me/?text=${encodeURIComponent(generateInvoiceText())}`, '_blank');
  };

  const askAiForTips = async () => {
    if (breakdown.grandTotal === 0) return;
    setLoadingAi(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Saya agensi "OneWay media" sedang melayani klien "${clientName}". Total: ${formatIDR(breakdown.grandTotal)}. Jasa: Upload ${state.uploadCount}, Desain ${state.photoCount}, Banner ${state.bannerCount}, Video ${state.videoCount}, Logo ${state.logoType}. Berikan 3 poin pitching profesional yang meyakinkan klien bahwa biaya ini adalah investasi tepat bersama OneWay media. Bahasa Indonesia akrab & profesional.`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      setAiAnalysis(response.text);
    } catch (e) {
      setAiAnalysis("Gagal memuat strategi pitching.");
    } finally { setLoadingAi(false); }
  };

  if (isAdminOpen) {
    return (
      <AdminPage 
        currentConfig={pricingConfig} 
        onSaveConfig={(newConfig) => setPricingConfig(newConfig)} 
        onClose={closeAdmin} 
      />
    );
  }

  if (isInvoicePageOpen) {
    return (
      <InvoicePage 
        invoiceData={invoiceDocData}
        onChangeInvoiceData={setInvoiceDocData}
        onSyncFromCalculator={handleSyncInvoiceFromCalc}
        onBackToCalculator={closeInvoicePage}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-32 md:pb-20">
      <header className="relative bg-[#3b49df] text-white py-20 px-6 overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-[#5c67f2] rounded-full blur-[100px] opacity-30 animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-5%] w-[400px] h-[400px] bg-[#2a37c7] rounded-full blur-[80px] opacity-50"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex justify-between items-start">
            <div className="flex flex-col items-center md:items-start space-y-4">
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl inline-block"><Star className="w-10 h-10 text-white" /></div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-center md:text-left leading-tight">OneWay <br className="hidden md:block"/><span className="text-indigo-200">media Toolkit</span></h1>
              <p className="text-indigo-100/80 text-lg md:text-xl max-w-xl font-medium text-center md:text-left leading-relaxed">Platform internal agensi untuk penentuan harga, invoice, dan strategi branding profesional.</p>
            </div>
            
            <button
              onClick={openAdmin}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold border border-white/20 transition-all backdrop-blur-md shadow-lg"
              title="Kelola Harga (Rahasia Admin)"
            >
              <Lock className="w-3.5 h-3.5" /> Admin
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto -mt-12 px-6 grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-20">
        <section className="lg:col-span-2 space-y-6">
          {/* Identitas Klien */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center gap-3 bg-white">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center"><User className="w-5 h-5 text-blue-600" /></div>
              <h2 className="text-xl font-extrabold text-slate-800">Identitas Klien</h2>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Nama Klien</label>
                <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 transition-all outline-none font-bold text-slate-800" placeholder="Misal: Andi Wijaya" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Nama Toko</label>
                <input type="text" value={shopName} onChange={(e) => setShopName(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 transition-all outline-none font-bold text-slate-800" placeholder="Mandiri Jaya Shop" />
              </div>
            </div>
          </div>

          {/* Layanan Utama */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center"><Layout className="w-5 h-5 text-indigo-600" /></div>
                <h2 className="text-xl font-extrabold text-slate-800">Pilihan Layanan</h2>
              </div>
              <button onClick={resetCalculator} className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" /> Reset</button>
            </div>
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                <div className="space-y-3"><label className="text-sm font-bold text-slate-700 flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-indigo-500" /> Upload Produk</label><div className="relative"><input type="number" value={state.uploadCount || ''} onChange={(e) => setState(prev => ({ ...prev, uploadCount: Math.max(0, Number(e.target.value)) }))} className="w-full pl-5 pr-12 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 transition-all outline-none text-lg font-bold" placeholder="0" /><div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold">Pcs</div></div></div>
                <div className="space-y-3"><label className="text-sm font-bold text-slate-700 flex items-center gap-2"><ImageIcon className="w-4 h-4 text-indigo-500" /> Desain Foto Produk</label><div className="relative"><input type="number" value={state.photoCount || ''} onChange={(e) => setState(prev => ({ ...prev, photoCount: Math.max(0, Number(e.target.value)) }))} className="w-full pl-5 pr-12 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 transition-all outline-none text-lg font-bold" placeholder="0" /><div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold">Set</div></div></div>
                <div className="space-y-3"><label className="text-sm font-bold text-slate-700 flex items-center gap-2"><Layout className="w-4 h-4 text-indigo-500" /> Banner Toko</label><input type="number" value={state.bannerCount || ''} onChange={(e) => setState(prev => ({ ...prev, bannerCount: Math.max(0, Number(e.target.value)) }))} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 transition-all outline-none text-lg font-bold" placeholder="0" /></div>
                <div className="space-y-3"><label className="text-sm font-bold text-slate-700 flex items-center gap-2"><Video className="w-4 h-4 text-indigo-500" /> Video Produk</label><input type="number" value={state.videoCount || ''} onChange={(e) => setState(prev => ({ ...prev, videoCount: Math.max(0, Number(e.target.value)) }))} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 transition-all outline-none text-lg font-bold" placeholder="0" /></div>
              </div>
              <div className="space-y-5 pt-8 border-t border-slate-50">
                <div className="flex items-center gap-2"><Palette className="w-5 h-5 text-indigo-500" /><label className="text-base font-extrabold text-slate-800">Branding Logo</label></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: 'none', label: 'Lewati', desc: 'Tanpa Logo', price: 0, icon: <Layout className="w-4 h-4" /> },
                    { id: 'client', label: 'Konsep Klien', desc: 'Edit Saja', price: pricingConfig.constantPrices.LOGO_CLIENT, icon: <CheckCircle2 className="w-4 h-4" /> },
                    { id: 'full', label: 'Konsep Baru', desc: 'Profesional', price: pricingConfig.constantPrices.LOGO_FULL, icon: <Star className="w-4 h-4" /> },
                  ].map((option) => (
                    <button key={option.id} onClick={() => setState(prev => ({ ...prev, logoType: option.id as any }))} className={`relative p-5 rounded-2xl border-2 text-left transition-all ${state.logoType === option.id ? 'border-indigo-600 bg-indigo-50 shadow-lg shadow-indigo-100' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                      <div className={`mb-3 p-2 rounded-lg inline-block ${state.logoType === option.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{option.icon}</div>
                      <div className="block font-black text-slate-800">{option.label}</div>
                      <div className="block text-xs text-slate-400 font-medium mb-2">{option.desc}</div>
                      <div className={`text-sm font-black ${state.logoType === option.id ? 'text-indigo-600' : 'text-slate-900'}`}>{option.price > 0 ? formatIDR(option.price) : 'Gratis'}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Biaya Tambahan */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center gap-3 bg-white">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center"><Tag className="w-5 h-5 text-amber-600" /></div>
              <h2 className="text-xl font-extrabold text-slate-800">Biaya Tambahan</h2>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Keterangan Biaya</label>
                  <input type="text" value={newFeeLabel} onChange={(e) => setNewFeeLabel(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-amber-500 transition-all outline-none font-bold text-slate-800" placeholder="Misal: Aset Berbayar / Express" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Nominal</label>
                  <div className="flex gap-2">
                    <input type="number" value={newFeeAmount} onChange={(e) => setNewFeeAmount(e.target.value === '' ? '' : Number(e.target.value))} className="flex-1 px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-amber-500 transition-all outline-none font-bold text-slate-800" placeholder="0" />
                    <button onClick={addExtraFee} className="p-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl transition-all active:scale-95 shadow-lg shadow-amber-200"><PlusCircle className="w-6 h-6" /></button>
                  </div>
                </div>
              </div>
              {state.extraFees.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-50">
                  {state.extraFees.map((fee) => (
                    <div key={fee.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3"><div className="w-2 h-2 bg-amber-400 rounded-full"></div><div><div className="text-sm font-bold text-slate-800">{fee.label}</div><div className="text-xs font-bold text-slate-400">{formatIDR(fee.amount)}</div></div></div>
                      <button onClick={() => removeExtraFee(fee.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Diskon Section */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden p-8">
            <div className="flex items-center gap-2 mb-6"><MinusCircle className="w-5 h-5 text-rose-500" /><label className="text-base font-extrabold text-slate-800">Diskon Khusus Klien</label></div>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl md:w-fit">
                {[
                  { id: 'none', label: 'No Discount', icon: <X className="w-3.5 h-3.5" /> },
                  { id: 'nominal', label: 'Nominal', icon: <Banknote className="w-3.5 h-3.5" /> },
                  { id: 'percent', label: 'Persen', icon: <Percent className="w-3.5 h-3.5" /> },
                ].map((type) => (
                  <button key={type.id} onClick={() => { setDiscountType(type.id as any); setDiscountValue(0); }} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${discountType === type.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{type.icon} {type.label}</button>
                ))}
              </div>
              {discountType !== 'none' && (
                <div className="flex-1 animate-in zoom-in duration-300"><div className="relative"><input type="number" value={discountValue || ''} onChange={(e) => setDiscountValue(Math.max(0, Number(e.target.value)))} className="w-full px-5 py-3 rounded-2xl bg-white border-2 border-rose-100 focus:border-rose-500 transition-all outline-none text-lg font-bold" placeholder={discountType === 'percent' ? '10' : '50000'} /><div className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-400 font-bold uppercase text-[10px]">{discountType === 'percent' ? '%' : 'IDR'}</div></div></div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-20"></div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2"><h3 className="text-2xl font-black">AI Pitching Generator</h3><p className="text-slate-400 text-sm max-w-md font-medium">Buat kalimat persuasif agar klien segera setuju dengan penawaran Anda.</p></div>
              <button onClick={askAiForTips} disabled={loadingAi || (breakdown.grandTotal === 0)} className="whitespace-nowrap px-8 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-500/20">{loadingAi ? 'Menganalisis...' : 'Dapatkan Pitch'} <Sparkles className="w-5 h-5" /></button>
            </div>
            {aiAnalysis && <div className="mt-8 p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 text-slate-200 text-sm italic leading-relaxed animate-in fade-in slide-in-from-top-4 duration-500 whitespace-pre-line">{aiAnalysis}</div>}
          </div>
        </section>

        {/* Studio Invoice Studio Launcher Card */}
        <section ref={invoiceSectionRef} className="lg:col-start-3">
          <div className="sticky top-8 space-y-6">
            <div className="bg-slate-900 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-800 text-white p-8 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600 rounded-full blur-[80px] opacity-30"></div>
              
              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[10px] font-black tracking-widest uppercase border border-indigo-500/30">
                    Official Studio Page
                  </span>
                  <BadgeCheck className="w-6 h-6 text-indigo-400" />
                </div>
                
                <h3 className="text-2xl font-black tracking-tight leading-tight">
                  Studio Invoice & Cetak A4 (Page Baru)
                </h3>
                
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  Buka halaman khusus invoice full-screen agar tampilan dokumen bersih, rasio A4 presisi, dan hasil cetak PDF/JPG tidak terpotong.
                </p>
              </div>

              {/* Total Tagihan Summary Card */}
              <div className="relative z-10 bg-slate-800/90 rounded-2xl p-5 border border-slate-700/80 space-y-3">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span className="font-bold">Klien:</span>
                  <span className="font-extrabold text-white">{clientName || 'Yudha Kurniawan'}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span className="font-bold">Total Kalkulasi:</span>
                  <span className="font-black text-emerald-400 text-base">{formatIDR(breakdown.grandTotal)}</span>
                </div>
                <div className="pt-2 border-t border-slate-700/60 text-[10px] text-slate-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Data item otomatis terhubung ke Studio Invoice</span>
                </div>
              </div>

              {/* Primary Action Button to open Page Baru */}
              <div className="relative z-10 space-y-3 pt-2">
                <button 
                  onClick={openInvoicePage} 
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-600/30 active:scale-[0.98]"
                >
                  <FileText className="w-5 h-5" /> Buka Studio Invoice (Page Baru)
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={openInvoicePage} 
                    className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-slate-700"
                  >
                    <Printer className="w-4 h-4 text-emerald-400" /> Cetak PDF A4
                  </button>

                  <button 
                    onClick={handleSendInvoice} 
                    className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-slate-700"
                  >
                    <Send className="w-4 h-4 text-green-400" /> Kirim WA
                  </button>
                </div>
              </div>

            </div>
          </div>
        </section>
      </main>

      {/* Floating Bar Mobile */}
      <div className={`lg:hidden fixed bottom-6 left-6 right-6 z-50 transition-all duration-500 transform ${showFloatingBar ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
        <div onClick={openInvoicePage} className="w-full py-3.5 bg-[#3b49df] text-white rounded-full shadow-2xl font-black flex items-center justify-between pl-6 pr-3 border border-white/20 active:scale-95 transition-all">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Dokumen Invoice</span>
            <span className="text-lg font-black tracking-tight">{formatIDR(breakdown.grandTotal)}</span>
          </div>
          <div className="bg-white/20 px-5 py-3 rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-2">
            Studio Invoice <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ReceiptItem({ label, value, count, details }: { label: string; value: string; count?: number; details?: string; key?: React.Key }) {
  // Logic Fix: Jika jumlah (count) adalah 0 secara eksplisit, item tidak ditampilkan.
  if (count === 0) return null;
  
  // Jika count tidak didefinisikan (seperti logo atau extra fees), 
  // cek apakah nilainya nol untuk label standar
  if (count === undefined && (value === 'Rp 0' || value === formatIDR(0)) && !details && label !== 'Biaya Tambahan' && label !== 'Extra Fee') {
    return null;
  }

  return (
    <div className="flex justify-between items-start gap-3 group py-1 animate-in fade-in slide-in-from-top-2 duration-300 w-full overflow-hidden">
      <div className="space-y-0.5 min-w-0 flex-1">
        <div className="text-sm font-black text-slate-800 leading-tight break-words">{label}</div>
        {details && <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest break-words">{details}</div>}
      </div>
      <div className="text-sm font-black text-slate-900 shrink-0 tabular-nums">{value}</div>
    </div>
  );
}
