
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
  Percent
} from 'lucide-react';
import { 
  UPLOAD_TIERS, 
  PHOTO_TIERS, 
  CONSTANT_PRICES, 
  ServiceState, 
  QuoteBreakdown,
  ExtraFee
} from './types';
import { GoogleGenAI } from "@google/genai";
import { toJpeg } from 'html-to-image';

// Helper for currency formatting
const formatIDR = (val: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(val);
};

export default function App() {
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
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showFloatingBar, setShowFloatingBar] = useState(true);

  const desktopInvoiceRef = useRef<HTMLDivElement>(null);
  const mobileInvoiceRef = useRef<HTMLDivElement>(null);
  const invoiceSectionRef = useRef<HTMLElement>(null);

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

  const calculateRate = (count: number, tiers: any[]) => {
    const tier = tiers.find(t => count >= t.min);
    return tier ? tier.rate : tiers[tiers.length - 1].rate;
  };

  const breakdown = useMemo((): QuoteBreakdown => {
    const uploadRate = calculateRate(state.uploadCount, UPLOAD_TIERS);
    const photoRate = calculateRate(state.photoCount, PHOTO_TIERS);
    
    const uploadTotal = state.uploadCount * uploadRate;
    const photoTotal = state.photoCount * photoRate;
    const bannerTotal = state.bannerCount * CONSTANT_PRICES.BANNER;
    const videoTotal = state.videoCount * CONSTANT_PRICES.VIDEO;
    
    let logoTotal = 0;
    let logoName = 'Tanpa Logo';
    if (state.logoType === 'client') {
      logoTotal = CONSTANT_PRICES.LOGO_CLIENT;
      logoName = 'Logo (Konsep Klien)';
    } else if (state.logoType === 'full') {
      logoTotal = CONSTANT_PRICES.LOGO_FULL;
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
      banner: { count: state.bannerCount, rate: CONSTANT_PRICES.BANNER, total: bannerTotal },
      video: { count: state.videoCount, rate: CONSTANT_PRICES.VIDEO, total: videoTotal },
      logo: { type: logoName, total: logoTotal },
      extraFeesTotal,
      subtotal,
      discount,
      grandTotal: Math.max(0, subtotal - discount)
    };
  }, [state, discountType, discountValue]);

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
      const dataUrl = await toJpeg(targetRef.current, { 
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
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

  return (
    <div className="min-h-screen bg-slate-50/50 pb-32 md:pb-20">
      <header className="relative bg-[#3b49df] text-white py-20 px-6 overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-[#5c67f2] rounded-full blur-[100px] opacity-30 animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-5%] w-[400px] h-[400px] bg-[#2a37c7] rounded-full blur-[80px] opacity-50"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col items-center md:items-start space-y-4">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl inline-block"><Star className="w-10 h-10 text-white" /></div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-center md:text-left leading-tight">OneWay <br className="hidden md:block"/><span className="text-indigo-200">media Toolkit</span></h1>
            <p className="text-indigo-100/80 text-lg md:text-xl max-w-xl font-medium text-center md:text-left leading-relaxed">Platform internal agensi untuk penentuan harga, invoice, dan strategi branding profesional.</p>
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
                    { id: 'client', label: 'Konsep Klien', desc: 'Edit Saja', price: 150000, icon: <CheckCircle2 className="w-4 h-4" /> },
                    { id: 'full', label: 'Konsep Baru', desc: 'Profesional', price: 200000, icon: <Star className="w-4 h-4" /> },
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

        {/* Premium Invoice Preview (Desktop) */}
        <section ref={invoiceSectionRef} className="lg:col-start-3">
          <div className="sticky top-8 space-y-6">
            <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden flex flex-col">
              <div ref={desktopInvoiceRef} className="bg-white">
                <div className="relative bg-[#3b49df] p-10 text-white overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                   <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-400/20 rounded-full -ml-12 -mb-12 blur-2xl"></div>
                   
                   <div className="flex justify-between items-start relative z-10">
                     <div className="space-y-1">
                       <div className="flex items-center gap-2">
                         <div className="bg-white p-1 rounded-md"><Star className="w-4 h-4 text-indigo-600 fill-indigo-600" /></div>
                         <h2 className="text-xs font-black tracking-[0.2em] uppercase text-indigo-100/70">Official Invoice</h2>
                       </div>
                       <h3 className="text-3xl font-black tracking-tighter leading-none mt-2">OneWay media</h3>
                       <p className="text-[10px] font-bold text-indigo-200/80 uppercase tracking-widest mt-1">Marketplace Agency Solutions</p>
                     </div>
                     <div className="flex flex-col items-end">
                        <BadgeCheck className="w-12 h-12 text-white/40 mb-2" />
                        <div className="text-[10px] font-black text-white px-2 py-1 bg-white/10 rounded-md border border-white/20">Verified Agency</div>
                     </div>
                   </div>

                   <div className="mt-10 flex flex-wrap gap-6 border-t border-white/10 pt-6">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-200/60 block">Tanggal</span>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                          <Calendar className="w-3 h-3 opacity-50" /> {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-200/60 block">Invoice No.</span>
                        <div className="text-xs font-black text-white">#OW-{new Date().getTime().toString().slice(-6)}</div>
                      </div>
                   </div>
                </div>
                
                <div className="px-10 py-10 space-y-10">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2"><div className="w-1 h-3 bg-indigo-600 rounded-full"></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Klien</span></div>
                      <p className="text-sm font-black text-slate-800">{clientName || '-'}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2"><div className="w-1 h-3 bg-indigo-600 rounded-full"></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Toko</span></div>
                      <p className="text-sm font-bold text-indigo-600 uppercase tracking-tight">{shopName || '-'}</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Layanan</span>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Nominal</span>
                    </div>
                    
                    <div className="space-y-5">
                      <ReceiptItem label="Upload Produk" count={breakdown.upload.count} value={formatIDR(breakdown.upload.total)} details={`${breakdown.upload.count}x @ ${formatIDR(breakdown.upload.rate)}`} />
                      <ReceiptItem label="Desain Foto" count={breakdown.photo.count} value={formatIDR(breakdown.photo.total)} details={`${breakdown.photo.count}x @ ${formatIDR(breakdown.photo.rate)}`} />
                      <ReceiptItem label="Banner Toko" count={breakdown.banner.count} value={formatIDR(breakdown.banner.total)} />
                      <ReceiptItem label="Video Produk" count={breakdown.video.count} value={formatIDR(breakdown.video.total)} />
                      {state.logoType !== 'none' && <ReceiptItem label="Jasa Branding Logo" value={formatIDR(breakdown.logo.total)} details={breakdown.logo.type} />}
                      {state.extraFees.map(fee => <ReceiptItem key={fee.id} label={fee.label} value={formatIDR(fee.amount)} />)}
                      
                      {breakdown.subtotal === 0 && (
                        <div className="text-center py-16 opacity-30 border-2 border-dashed border-slate-100 rounded-3xl">
                          <FileText className="w-12 h-12 mx-auto mb-2 text-slate-200" />
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">Daftar pesanan kosong</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50/80 rounded-[2rem] p-8 space-y-4 border border-slate-100">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest">
                      <span>Subtotal</span>
                      <span>{formatIDR(breakdown.subtotal)}</span>
                    </div>
                    {breakdown.discount > 0 && (
                      <div className="flex justify-between items-center text-xs font-black text-rose-500 uppercase tracking-widest">
                        <span>Diskon Khusus</span>
                        <span>- {formatIDR(breakdown.discount)}</span>
                      </div>
                    )}
                    <div className="pt-4 border-t border-slate-200 flex justify-between items-end">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Pembayaran</span>
                        <div className="text-4xl font-black text-indigo-600 tracking-tighter leading-none">{formatIDR(breakdown.grandTotal)}</div>
                      </div>
                      <div className="text-[10px] font-black text-white px-3 py-1.5 bg-indigo-600 rounded-full shadow-lg shadow-indigo-100">
                        OFFICIAL QUOTE
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                         <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600"><Clock className="w-4 h-4" /></div>
                         <div className="text-[10px] font-bold text-slate-600 uppercase leading-tight">Pay after project <br/> is completed</div>
                       </div>
                       <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                         <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600"><ShieldCheck className="w-4 h-4" /></div>
                         <div className="text-[10px] font-bold text-slate-600 uppercase leading-tight">Minor revision <br/> included</div>
                       </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
                       <div className="flex items-center gap-4">
                         <span className="flex items-center gap-1.5"><Instagram className="w-3.5 h-3.5" /> oneway.media</span>
                         <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> owm.agency</span>
                       </div>
                       <span className="text-indigo-600 opacity-60 font-black">Thank you for choosing us</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons - More Integrated */}
              <div className="px-10 pb-10 space-y-4">
                <button onClick={handleSendInvoice} className="w-full py-5 bg-[#3b49df] text-white rounded-[1.5rem] font-black text-lg flex items-center justify-center gap-3 hover:bg-[#2a37c7] transition-all shadow-xl shadow-indigo-200/50 active:scale-[0.98]">
                  <Send className="w-6 h-6" /> Kirim Invoice ke WA
                </button>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={downloadInvoiceImage} disabled={isDownloading || breakdown.subtotal === 0} className="py-4 bg-slate-50 text-indigo-600 border border-indigo-100 rounded-[1.2rem] font-black text-xs flex items-center justify-center gap-2 hover:bg-indigo-50 disabled:opacity-50 transition-all">
                    {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Unduh Gambar
                  </button>
                  <button onClick={copyToClipboard} className="py-4 bg-slate-50 text-slate-500 border border-slate-200 rounded-[1.2rem] font-black text-xs flex items-center justify-center gap-2 hover:bg-slate-100 transition-all">
                    <Copy className="w-4 h-4" /> Salin Teks
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <div className={`lg:hidden fixed bottom-6 left-6 right-6 z-50 transition-all duration-500 transform ${showFloatingBar ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
        <div onClick={() => setIsDetailsOpen(true)} className="w-full py-3 bg-[#3b49df] text-white rounded-full shadow-2xl font-black flex items-center justify-between pl-8 pr-3 border border-white/20">
          <div className="flex flex-col"><span className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Penawaran</span><span className="text-xl font-black tracking-tight">{formatIDR(breakdown.grandTotal)}</span></div>
          <div className="bg-white/20 px-6 py-4 rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-2">Review <ArrowRight className="w-4 h-4" /></div>
        </div>
      </div>

      {isDetailsOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsDetailsOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[3rem] animate-in slide-in-from-bottom duration-300 max-h-[95vh] overflow-y-auto overflow-x-hidden">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-6" />
            
            <div className="px-4 pb-12 space-y-8 max-w-full">
              <div ref={mobileInvoiceRef} className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden w-full">
                <div className="bg-[#3b49df] text-white p-6 relative overflow-hidden">
                  <div className="relative z-10 flex justify-between items-start">
                    <div>
                      <div className="text-[8px] font-black uppercase tracking-widest text-indigo-200">Official Document</div>
                      <div className="text-xl font-black tracking-tight">OneWay media</div>
                    </div>
                    <BadgeCheck className="w-8 h-8 opacity-40 shrink-0" />
                  </div>
                  <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/10 pt-4 relative z-10">
                    <div className="min-w-0"><span className="text-[8px] font-black uppercase text-indigo-200 opacity-60">Klien</span><p className="text-[11px] font-black uppercase truncate">{clientName || '-'}</p></div>
                    <div className="min-w-0"><span className="text-[8px] font-black uppercase text-indigo-200 opacity-60">Toko</span><p className="text-[11px] font-black uppercase truncate">{shopName || '-'}</p></div>
                  </div>
                </div>

                <div className="p-5 space-y-6">
                  <div className="space-y-4">
                    <ReceiptItem label="Upload Produk" count={breakdown.upload.count} value={formatIDR(breakdown.upload.total)} details={`${breakdown.upload.count}x @ ${formatIDR(breakdown.upload.rate)}`} />
                    <ReceiptItem label="Desain Foto" count={breakdown.photo.count} value={formatIDR(breakdown.photo.total)} details={`${breakdown.photo.count}x @ ${formatIDR(breakdown.photo.rate)}`} />
                    <ReceiptItem label="Banner Toko" count={breakdown.banner.count} value={formatIDR(breakdown.banner.total)} />
                    <ReceiptItem label="Video Produk" count={breakdown.video.count} value={formatIDR(breakdown.video.total)} />
                    {state.logoType !== 'none' && <ReceiptItem label="Jasa Logo" value={formatIDR(breakdown.logo.total)} details={breakdown.logo.type} />}
                    {state.extraFees.map(fee => <ReceiptItem key={fee.id} label={fee.label} value={formatIDR(fee.amount)} />)}
                  </div>
                  
                  <div className="pt-6 border-t border-slate-100 space-y-2">
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest"><span>Subtotal</span><span>{formatIDR(breakdown.subtotal)}</span></div>
                    {breakdown.discount > 0 && <div className="flex justify-between text-[10px] font-black text-rose-500 uppercase tracking-widest"><span>Diskon</span><span>-{formatIDR(breakdown.discount)}</span></div>}
                    <div className="flex justify-between items-end pt-4">
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest shrink-0">Grand Total</span>
                      <span className="text-3xl font-black text-indigo-600 tracking-tighter truncate ml-2">{formatIDR(breakdown.grandTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <button onClick={handleSendInvoice} className="w-full py-5 bg-[#3b49df] text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-indigo-100"><Send className="w-5 h-5" /> Kirim ke WhatsApp</button>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={downloadInvoiceImage} disabled={isDownloading || breakdown.subtotal === 0} className="py-4 bg-white text-indigo-600 border-2 border-indigo-100 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all">
                    {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} JPG
                  </button>
                  <button onClick={() => setIsDetailsOpen(false)} className="py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-sm">Kembali</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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
