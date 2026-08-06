import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Save, 
  RotateCcw, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Banknote,
  Sliders,
  Sparkles,
  LogOut
} from 'lucide-react';
import { 
  PricingConfig, 
  PricingTier, 
  DEFAULT_PRICING_CONFIG, 
  savePricingConfigToStorage 
} from './types';

interface AdminPageProps {
  currentConfig: PricingConfig;
  onSaveConfig: (newConfig: PricingConfig) => void;
  onClose: () => void;
}

export default function AdminPage({ currentConfig, onSaveConfig, onClose }: AdminPageProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('oneway_admin_auth') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  // Local config state being edited
  const [config, setConfig] = useState<PricingConfig>(JSON.parse(JSON.stringify(currentConfig)));
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'testing didin') {
      setIsAuthenticated(true);
      sessionStorage.setItem('oneway_admin_auth', 'true');
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('oneway_admin_auth');
  };

  const handleSave = () => {
    // Sort tiers descending by min before saving for accurate calculation
    const sortedUploadTiers = [...config.uploadTiers].sort((a, b) => b.min - a.min);
    const sortedPhotoTiers = [...config.photoTiers].sort((a, b) => b.min - a.min);
    
    const finalConfig: PricingConfig = {
      ...config,
      uploadTiers: sortedUploadTiers,
      photoTiers: sortedPhotoTiers
    };

    savePricingConfigToStorage(finalConfig);
    onSaveConfig(finalConfig);
    setSaveSuccessMessage('Perubahan harga & layanan berhasil disimpan!');
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  const handleResetDefault = () => {
    if (window.confirm('Apakah Anda yakin ingin mengembalikan semua harga ke pengaturan awal (default)?')) {
      const defaultConfigCopy = JSON.parse(JSON.stringify(DEFAULT_PRICING_CONFIG));
      setConfig(defaultConfigCopy);
      savePricingConfigToStorage(defaultConfigCopy);
      onSaveConfig(defaultConfigCopy);
      setSaveSuccessMessage('Harga telah dikembalikan ke standar awal.');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    }
  };

  // Tier helper functions
  const updateUploadTier = (index: number, field: keyof PricingTier, value: number) => {
    setConfig(prev => {
      const newTiers = [...prev.uploadTiers];
      newTiers[index] = { ...newTiers[index], [field]: Math.max(0, value) };
      return { ...prev, uploadTiers: newTiers };
    });
  };

  const addUploadTier = () => {
    setConfig(prev => ({
      ...prev,
      uploadTiers: [...prev.uploadTiers, { min: 0, rate: 3000 }]
    }));
  };

  const removeUploadTier = (index: number) => {
    setConfig(prev => ({
      ...prev,
      uploadTiers: prev.uploadTiers.filter((_, i) => i !== index)
    }));
  };

  const updatePhotoTier = (index: number, field: keyof PricingTier, value: number) => {
    setConfig(prev => {
      const newTiers = [...prev.photoTiers];
      newTiers[index] = { ...newTiers[index], [field]: Math.max(0, value) };
      return { ...prev, photoTiers: newTiers };
    });
  };

  const addPhotoTier = () => {
    setConfig(prev => ({
      ...prev,
      photoTiers: [...prev.photoTiers, { min: 0, rate: 6000 }]
    }));
  };

  const removePhotoTier = (index: number) => {
    setConfig(prev => ({
      ...prev,
      photoTiers: prev.photoTiers.filter((_, i) => i !== index)
    }));
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 md:p-10 max-w-md w-full shadow-2xl relative overflow-hidden border border-slate-100">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
          
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-2 rounded-xl transition-colors"
            title="Kembali ke Kalkulator"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center space-y-4 mb-8">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Portal Admin Rahasia</h1>
              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">OneWay media Toolkit</p>
            </div>
            <p className="text-sm font-medium text-slate-500 leading-relaxed">
              Masukkan kata sandi untuk mengakses pengaturan harga dan opsi layanan.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">
                Kata Sandi Admin
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => { setPasswordInput(e.target.value); setAuthError(false); }}
                placeholder="Masukkan kata sandi..."
                className={`w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 transition-all outline-none font-bold text-slate-800 ${
                  authError ? 'border-rose-500 bg-rose-50/50' : 'border-slate-100 focus:border-indigo-600'
                }`}
                autoFocus
              />
              {authError && (
                <div className="flex items-center gap-1.5 text-rose-500 text-xs font-bold mt-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Kata sandi salah. Silakan coba lagi.</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-base transition-all shadow-xl shadow-indigo-200 active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-5 h-5" /> Masuk ke Panel Admin
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <button
              onClick={onClose}
              className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors"
            >
              ← Kembali ke Kalkulator Depan
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Admin Top Header */}
      <header className="bg-slate-900 text-white py-6 px-6 sticky top-0 z-50 border-b border-slate-800 shadow-xl">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose} 
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
              title="Kembali ke Kalkulator"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-600 text-white px-2 py-0.5 rounded-md">Secret Admin</span>
                <h1 className="text-xl font-black tracking-tight text-white">Pengaturan Harga & Layanan</h1>
              </div>
              <p className="text-xs font-medium text-slate-400">Atur tarif dasar dan tier harga internal OneWay media</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-800 hover:bg-rose-900/40 text-rose-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-700"
            >
              <LogOut className="w-4 h-4" /> Keluar
            </button>
          </div>
        </div>
      </header>

      {/* Main Form Content */}
      <main className="max-w-5xl mx-auto mt-8 px-6 space-y-8">
        {saveSuccessMessage && (
          <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl text-emerald-800 text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
        )}

        {/* Floating Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">Panel Kelola Tarif</h2>
              <p className="text-xs font-medium text-slate-400">Simpan perubahan untuk langsung memperbarui kalkulator</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResetDefault}
              className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Reset Default
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm flex items-center gap-2 transition-all shadow-lg shadow-indigo-100 active:scale-95"
            >
              <Save className="w-4 h-4" /> Simpan Perubahan
            </button>
          </div>
        </div>

        {/* SECTION 1: Standard Unit Prices */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-50 flex items-center gap-3 bg-slate-50/50">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">1. Harga Fixed / Layanan Satuan</h2>
              <p className="text-xs font-medium text-slate-400">Tarif tetap untuk banner, video, dan pembuatan logo</p>
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">
                Banner Toko (Per Pcs)
              </label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</span>
                <input
                  type="number"
                  value={config.constantPrices.BANNER}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    constantPrices: { ...prev.constantPrices, BANNER: Math.max(0, Number(e.target.value)) }
                  }))}
                  className="w-full pl-12 pr-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 font-bold text-slate-800 text-base outline-none transition-all"
                />
              </div>
              <span className="text-[11px] font-bold text-slate-400 block">Saat ini: {formatIDR(config.constantPrices.BANNER)}</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">
                Video Produk (Per Pcs)
              </label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</span>
                <input
                  type="number"
                  value={config.constantPrices.VIDEO}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    constantPrices: { ...prev.constantPrices, VIDEO: Math.max(0, Number(e.target.value)) }
                  }))}
                  className="w-full pl-12 pr-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 font-bold text-slate-800 text-base outline-none transition-all"
                />
              </div>
              <span className="text-[11px] font-bold text-slate-400 block">Saat ini: {formatIDR(config.constantPrices.VIDEO)}</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">
                Branding Logo (Konsep Klien / Edit Saja)
              </label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</span>
                <input
                  type="number"
                  value={config.constantPrices.LOGO_CLIENT}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    constantPrices: { ...prev.constantPrices, LOGO_CLIENT: Math.max(0, Number(e.target.value)) }
                  }))}
                  className="w-full pl-12 pr-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 font-bold text-slate-800 text-base outline-none transition-all"
                />
              </div>
              <span className="text-[11px] font-bold text-slate-400 block">Saat ini: {formatIDR(config.constantPrices.LOGO_CLIENT)}</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">
                Branding Logo (Konsep Baru / Pro)
              </label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</span>
                <input
                  type="number"
                  value={config.constantPrices.LOGO_FULL}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    constantPrices: { ...prev.constantPrices, LOGO_FULL: Math.max(0, Number(e.target.value)) }
                  }))}
                  className="w-full pl-12 pr-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 font-bold text-slate-800 text-base outline-none transition-all"
                />
              </div>
              <span className="text-[11px] font-bold text-slate-400 block">Saat ini: {formatIDR(config.constantPrices.LOGO_FULL)}</span>
            </div>
          </div>
        </div>

        {/* SECTION 2: Tier Pricing for Product Upload */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">2. Tier Pricing Upload Produk</h2>
                <p className="text-xs font-medium text-slate-400">Harga per pcs menyesuaikan dengan jumlah produk</p>
              </div>
            </div>
            <button
              onClick={addUploadTier}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" /> Tambah Tier
            </button>
          </div>

          <div className="p-8 space-y-4">
            <div className="grid grid-cols-12 gap-4 text-xs font-black text-slate-400 uppercase tracking-widest px-2">
              <div className="col-span-5">Minimal Jumlah (Pcs)</div>
              <div className="col-span-6">Tarif per Pcs (Rp)</div>
              <div className="col-span-1 text-right">Aksi</div>
            </div>

            {config.uploadTiers.map((tier, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-4 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="col-span-5 flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">≥</span>
                  <input
                    type="number"
                    value={tier.min}
                    onChange={(e) => updateUploadTier(idx, 'min', Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 font-bold text-slate-800 outline-none text-sm"
                    placeholder="Min pcs"
                  />
                  <span className="text-xs font-bold text-slate-400">pcs</span>
                </div>

                <div className="col-span-6 flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    value={tier.rate}
                    onChange={(e) => updateUploadTier(idx, 'rate', Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 font-bold text-slate-800 outline-none text-sm"
                    placeholder="Tarif"
                  />
                  <span className="text-[11px] font-bold text-slate-400 shrink-0">/ pcs</span>
                </div>

                <div className="col-span-1 text-right">
                  <button
                    onClick={() => removeUploadTier(idx)}
                    disabled={config.uploadTiers.length <= 1}
                    className="p-2 text-slate-400 hover:text-rose-500 disabled:opacity-30 transition-colors"
                    title="Hapus Tier"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3: Tier Pricing for Photo Design */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">3. Tier Pricing Desain Foto Produk</h2>
                <p className="text-xs font-medium text-slate-400">Harga per set desain foto menyesuaikan jumlah order</p>
              </div>
            </div>
            <button
              onClick={addPhotoTier}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" /> Tambah Tier
            </button>
          </div>

          <div className="p-8 space-y-4">
            <div className="grid grid-cols-12 gap-4 text-xs font-black text-slate-400 uppercase tracking-widest px-2">
              <div className="col-span-5">Minimal Jumlah (Set)</div>
              <div className="col-span-6">Tarif per Set (Rp)</div>
              <div className="col-span-1 text-right">Aksi</div>
            </div>

            {config.photoTiers.map((tier, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-4 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="col-span-5 flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">≥</span>
                  <input
                    type="number"
                    value={tier.min}
                    onChange={(e) => updatePhotoTier(idx, 'min', Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 font-bold text-slate-800 outline-none text-sm"
                    placeholder="Min set"
                  />
                  <span className="text-xs font-bold text-slate-400">set</span>
                </div>

                <div className="col-span-6 flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    value={tier.rate}
                    onChange={(e) => updatePhotoTier(idx, 'rate', Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 font-bold text-slate-800 outline-none text-sm"
                    placeholder="Tarif"
                  />
                  <span className="text-[11px] font-bold text-slate-400 shrink-0">/ set</span>
                </div>

                <div className="col-span-1 text-right">
                  <button
                    onClick={() => removePhotoTier(idx)}
                    disabled={config.photoTiers.length <= 1}
                    className="p-2 text-slate-400 hover:text-rose-500 disabled:opacity-30 transition-colors"
                    title="Hapus Tier"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Save bar */}
        <div className="flex justify-end gap-4 pt-4">
          <button
            onClick={onClose}
            className="px-6 py-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-2xl font-bold text-sm transition-all"
          >
            Selesai & Kembali ke Kalkulator
          </button>
          <button
            onClick={handleSave}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm flex items-center gap-2 transition-all shadow-xl shadow-indigo-200 active:scale-95"
          >
            <Save className="w-5 h-5" /> Simpan Semua Perubahan
          </button>
        </div>
      </main>
    </div>
  );
}
