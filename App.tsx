
import React, { useState, useMemo, useCallback } from 'react';
import { 
  Calculator as CalcIcon, 
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
  Zap,
  Star,
  X,
  User,
  Store,
  FileText,
  CreditCard,
  Percent,
  Banknote,
  MinusCircle,
  PlusCircle,
  Trash2,
  Tag
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
  
  // Local state for new extra fee input
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
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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
    
    state.extraFees.forEach(fee => {
      servicesList += `• ${fee.label}: ${formatIDR(fee.amount)}\n`;
    });

    return `
*RINCIAN PENAWARAN JASA*
*by OneWay media*
──────────────────
📅 Tgl: ${date}
👤 Klien: ${clientName || '-'}
🏪 Toko: ${shopName || '-'}

*Daftar Pesanan:*
${servicesList.trim() || '• (Belum ada layanan dipilih)'}

💰 Subtotal: ${formatIDR(breakdown.subtotal)}
📉 Diskon: -${formatIDR(breakdown.discount)}
──────────────────
*TOTAL BAYAR: ${formatIDR(breakdown.grandTotal)}*
──────────────────

*Ketentuan Layanan OneWay media:*
• Sistem bayar: Setelah toko jadi/selesai.
• Revisi: Berlaku untuk revisi minor saja.
• Estimasi: Segera setelah konfirmasi.

Apakah rincian dan nominal di atas sudah sesuai? Jika ya, akan segera kami eksekusi. Mohon konfirmasinya ya!
    `.trim();
  }, [breakdown, clientName, shopName, state.logoType, state.extraFees]);

  const resetCalculator = () => {
    setState({
      uploadCount: 0,
      photoCount: 0,
      bannerCount: 0,
      videoCount: 0,
      logoType: 'none',
      extraFees: []
    });
    setClientName('');
    setShopName('');
    setDiscountType('none');
    setDiscountValue(0);
    setAiAnalysis(null);
  };

  const copyToClipboard = () => {
    const text = generateInvoiceText();
    navigator.clipboard.writeText(text);
    alert('Invoice disalin ke clipboard!');
  };

  const handleSendInvoice = (e: React.MouseEvent) => {
    e.stopPropagation();
    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(generateInvoiceText())}`;
    window.open(whatsappLink, '_blank');
  };

  const askAiForTips = async () => {
    if (breakdown.grandTotal === 0) return;
    setLoadingAi(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Saya agensi "OneWay media" sedang melayani klien "${clientName}". Total: ${formatIDR(breakdown.grandTotal)}. 
      Jasa: Upload ${state.uploadCount}, Desain ${state.photoCount}, Banner ${state.bannerCount}, Video ${state.videoCount}, Logo ${state.logoType}. 
      Extra: ${state.extraFees.map(f => f.label).join(', ')}.
      Berikan 3 poin pitching profesional yang meyakinkan klien bahwa biaya ini adalah investasi tepat bersama OneWay media. Bahasa Indonesia akrab & profesional.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      setAiAnalysis(response.text);
    } catch (e) {
      console.error(e);
      setAiAnalysis("Gagal memuat strategi pitching. Silakan coba lagi.");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-32 md:pb-20">
      <header className="relative bg-[#3b49df] text-white py-16 px-6 overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-[#5c67f2] rounded-full blur-[80px] opacity-40 animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-5%] w-[300px] h-[300px] bg-[#2a37c7] rounded-full blur-[60px] opacity-60"></div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col items-center md:items-start space-y-4">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl inline-block">
              <Star className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-center md:text-left leading-tight">
              OneWay <br className="hidden md:block"/>
              <span className="text-indigo-200">media Toolkit</span>
            </h1>
            <p className="text-indigo-100/80 text-lg md:text-xl max-w-xl font-medium text-center md:text-left leading-relaxed">
              Platform internal agensi untuk penentuan harga, invoice, dan strategi branding profesional.
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto -mt-12 px-6 grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-20">
        <section className="lg:col-span-2 space-y-6">
          {/* Identitas Klien */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center gap-3 bg-white">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
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
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <Layout className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-xl font-extrabold text-slate-800">Pilihan Layanan</h2>
              </div>
              <button onClick={resetCalculator} className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" /> Reset
              </button>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                <div className="space-y-3"><label className="text-sm font-bold text-slate-700 flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-indigo-500" /> Upload Produk</label>
                  <div className="relative"><input type="number" value={state.uploadCount || ''} onChange={(e) => setState(prev => ({ ...prev, uploadCount: Math.max(0, Number(e.target.value)) }))} className="w-full pl-5 pr-12 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 transition-all outline-none text-lg font-bold" placeholder="0" /><div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold">Pcs</div></div>
                </div>
                <div className="space-y-3"><label className="text-sm font-bold text-slate-700 flex items-center gap-2"><ImageIcon className="w-4 h-4 text-indigo-500" /> Desain Foto Produk</label>
                  <div className="relative"><input type="number" value={state.photoCount || ''} onChange={(e) => setState(prev => ({ ...prev, photoCount: Math.max(0, Number(e.target.value)) }))} className="w-full pl-5 pr-12 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 transition-all outline-none text-lg font-bold" placeholder="0" /><div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold">Set</div></div>
                </div>
                <div className="space-y-3"><label className="text-sm font-bold text-slate-700 flex items-center gap-2"><Layout className="w-4 h-4 text-indigo-500" /> Banner Toko</label>
                  <input type="number" value={state.bannerCount || ''} onChange={(e) => setState(prev => ({ ...prev, bannerCount: Math.max(0, Number(e.target.value)) }))} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 transition-all outline-none text-lg font-bold" placeholder="0" />
                </div>
                <div className="space-y-3"><label className="text-sm font-bold text-slate-700 flex items-center gap-2"><Video className="w-4 h-4 text-indigo-500" /> Video Produk</label>
                  <input type="number" value={state.videoCount || ''} onChange={(e) => setState(prev => ({ ...prev, videoCount: Math.max(0, Number(e.target.value)) }))} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 transition-all outline-none text-lg font-bold" placeholder="0" />
                </div>
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
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <Tag className="w-5 h-5 text-amber-600" />
              </div>
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
                    <button onClick={addExtraFee} className="p-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl transition-all active:scale-95 shadow-lg shadow-amber-200">
                      <PlusCircle className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>

              {state.extraFees.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-50">
                  {state.extraFees.map((fee) => (
                    <div key={fee.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-left-4">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                        <div>
                          <div className="text-sm font-bold text-slate-800">{fee.label}</div>
                          <div className="text-xs font-bold text-slate-400">{formatIDR(fee.amount)}</div>
                        </div>
                      </div>
                      <button onClick={() => removeExtraFee(fee.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
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
              <button onClick={askAiForTips} disabled={loadingAi || (breakdown.grandTotal === 0)} className="whitespace-nowrap px-8 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-2xl font-black flex items-center gap-2 transition-all shadow-xl shadow-indigo-500/20">{loadingAi ? 'Menganalisis...' : 'Dapatkan Pitch'} <Sparkles className="w-5 h-5" /></button>
            </div>
            {aiAnalysis && <div className="mt-8 p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 text-slate-200 text-sm leading-relaxed animate-in fade-in slide-in-from-top-4 duration-500"><div className="font-black text-indigo-400 mb-2 flex items-center gap-2 uppercase tracking-widest text-[10px]">Asisten AI OneWay media</div><div className="whitespace-pre-line font-medium italic opacity-90">{aiAnalysis}</div></div>}
          </div>
        </section>

        {/* Tinjauan Invoice (Desktop) */}
        <section className="lg:col-start-3">
          <div className="sticky top-8 space-y-6">
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-8 text-white"><h2 className="text-xl font-black">Invoice Preview</h2><p className="text-indigo-100/60 text-[10px] font-black uppercase tracking-widest">OneWay media Billing</p></div>
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  {(clientName || shopName) && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Penerima</div>
                      <div className="text-sm font-black text-slate-800">{clientName || '-'}</div>
                      <div className="text-xs font-bold text-indigo-600 truncate">{shopName || '-'}</div>
                    </div>
                  )}
                  <div className="space-y-3">
                    <SummaryItem label="Upload Produk" count={breakdown.upload.count} value={formatIDR(breakdown.upload.total)} rate={formatIDR(breakdown.upload.rate)} />
                    <SummaryItem label="Desain Foto" count={breakdown.photo.count} value={formatIDR(breakdown.photo.total)} rate={formatIDR(breakdown.photo.rate)} />
                    <SummaryItem label="Banner Toko" count={breakdown.banner.count} value={formatIDR(breakdown.banner.total)} />
                    <SummaryItem label="Video Produk" count={breakdown.video.count} value={formatIDR(breakdown.video.total)} />
                    {state.logoType !== 'none' && <SummaryItem label="Layanan Logo" value={formatIDR(breakdown.logo.total)} subtext={breakdown.logo.type} />}
                    {state.extraFees.map(fee => <SummaryItem key={fee.id} label={fee.label} value={formatIDR(fee.amount)} />)}
                  </div>
                  {breakdown.subtotal > 0 && (
                    <div className="pt-4 mt-4 border-t border-slate-50 space-y-2">
                      <div className="flex justify-between text-xs font-bold text-slate-400"><span>SUBTOTAL</span><span>{formatIDR(breakdown.subtotal)}</span></div>
                      {breakdown.discount > 0 && <div className="flex justify-between text-xs font-bold text-rose-500"><span>DISKON</span><span>- {formatIDR(breakdown.discount)}</span></div>}
                    </div>
                  )}
                  {breakdown.grandTotal === 0 && <div className="text-center py-10"><div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4"><CreditCard className="w-6 h-6 text-slate-200" /></div><p className="text-slate-300 text-xs font-bold uppercase tracking-widest">Kosong</p></div>}
                </div>
                <div className="pt-8 border-t border-slate-100 space-y-6">
                  <div className="flex flex-col"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Bayar</span><span className="text-3xl font-black text-indigo-600 tracking-tight">{formatIDR(breakdown.grandTotal)}</span></div>
                  <div className="space-y-3">
                    <button onClick={handleSendInvoice} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"><Send className="w-5 h-5" /> Kirim Invoice (WA)</button>
                    <button onClick={copyToClipboard} className="w-full py-3 bg-white text-slate-600 border-2 border-slate-100 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"><Copy className="w-4 h-4" /> Salin Rincian</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Mobile Floating Bar */}
      <div className="lg:hidden fixed bottom-6 left-6 right-6 z-50">
        <div onClick={() => setIsDetailsOpen(true)} className="w-full py-2 bg-[#3b49df] text-white rounded-full shadow-2xl font-black flex items-center justify-between pl-8 pr-2 border border-white/10 cursor-pointer">
          <div className="flex flex-col"><span className="text-[10px] font-black uppercase tracking-widest opacity-60">Total OneWay media</span><span className="text-xl font-black">{formatIDR(breakdown.grandTotal)}</span></div>
          <button onClick={handleSendInvoice} className="flex items-center gap-2 bg-white/20 px-6 py-4 rounded-full border border-white/10 active:scale-95 transition-all"><span className="text-xs font-black uppercase">KIRIM</span><ArrowRight className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Mobile Details Sheet */}
      {isDetailsOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsDetailsOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] p-8 pb-12 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
            <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black text-slate-800">Rincian Invoice</h3><button onClick={() => setIsDetailsOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500"><X className="w-5 h-5" /></button></div>
            <div className="space-y-5">
              <SummaryItem label="Upload Produk" count={breakdown.upload.count} value={formatIDR(breakdown.upload.total)} rate={formatIDR(breakdown.upload.rate)} />
              <SummaryItem label="Desain Foto" count={breakdown.photo.count} value={formatIDR(breakdown.photo.total)} rate={formatIDR(breakdown.photo.rate)} />
              <SummaryItem label="Banner Toko" count={breakdown.banner.count} value={formatIDR(breakdown.banner.total)} />
              <SummaryItem label="Video Produk" count={breakdown.video.count} value={formatIDR(breakdown.video.total)} />
              {state.logoType !== 'none' && <SummaryItem label="Jasa Logo" value={formatIDR(breakdown.logo.total)} subtext={breakdown.logo.type} />}
              {state.extraFees.map(fee => <SummaryItem key={fee.id} label={fee.label} value={formatIDR(fee.amount)} />)}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-400"><span>SUBTOTAL</span><span>{formatIDR(breakdown.subtotal)}</span></div>
                {breakdown.discount > 0 && <div className="flex justify-between text-xs font-bold text-rose-500"><span>DISKON</span><span>- {formatIDR(breakdown.discount)}</span></div>}
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-slate-100"><div className="flex justify-between items-end mb-8"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grand Total</span><span className="text-3xl font-black text-indigo-600">{formatIDR(breakdown.grandTotal)}</span></div><button onClick={handleSendInvoice} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3"><Send className="w-5 h-5" /> Kirim ke WhatsApp</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryItem({ label, value, count, rate, subtext }: { label: string; value: string; count?: number; rate?: string; subtext?: string }) {
  if (count === 0 && !subtext && label !== 'Upload Produk' && label !== 'Desain Foto') return null;
  return (
    <div className="flex justify-between items-center group">
      <div className="flex flex-col">
        <span className="text-slate-800 font-bold text-sm">{label}</span>
        {count !== undefined && count > 0 && <span className="text-[10px] font-black text-indigo-400 uppercase">{count} UNIT {rate && `× ${rate}`}</span>}
        {subtext && <span className="text-[10px] font-bold text-slate-400 uppercase">{subtext}</span>}
      </div>
      <span className="text-slate-900 font-black text-sm">{value}</span>
    </div>
  );
}
