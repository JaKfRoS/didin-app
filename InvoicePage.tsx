import React, { useState, useRef } from 'react';
import { 
  InvoiceDocumentData, 
  InvoiceProjectGroup, 
  InvoiceItem 
} from './types';
import { 
  ArrowLeft, 
  Printer, 
  Download, 
  Send, 
  RotateCcw, 
  Edit3, 
  Check, 
  Plus, 
  Trash2, 
  CreditCard, 
  FileText, 
  User, 
  Copy,
  Loader2,
  Sparkles
} from 'lucide-react';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';

interface InvoicePageProps {
  invoiceData: InvoiceDocumentData;
  onChangeInvoiceData: (newData: InvoiceDocumentData) => void;
  onSyncFromCalculator: () => void;
  onBackToCalculator: () => void;
}

const formatIDR = (val: number) => {
  const formatted = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0
  }).format(val);
  return `Rp ${formatted}`;
};

export default function InvoicePage({
  invoiceData,
  onChangeInvoiceData,
  onSyncFromCalculator,
  onBackToCalculator
}: InvoicePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'projects' | 'payment'>('info');
  const [isDownloadingJpg, setIsDownloadingJpg] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Helper calculations
  const getItemTotal = (item: InvoiceItem): number => {
    if (typeof item.totalPrice === 'number') return item.totalPrice;
    const numericQty = typeof item.qty === 'number' ? item.qty : parseFloat(item.qty.toString().replace(',', '.')) || 0;
    return numericQty * item.unitPrice;
  };

  const getProjectSubtotal = (project: InvoiceProjectGroup): number => {
    return project.items.reduce((sum, item) => sum + getItemTotal(item), 0);
  };

  const totalKeseluruhan = invoiceData.projects.reduce((sum, p) => sum + getProjectSubtotal(p), 0);
  const sisaTagihan = Math.max(0, totalKeseluruhan - (invoiceData.dpAmount || 0));

  // Editor Handlers
  const handleUpdateInfo = (field: keyof InvoiceDocumentData, value: any) => {
    onChangeInvoiceData({ ...invoiceData, [field]: value });
  };

  const handleUpdatePayment = (field: keyof InvoiceDocumentData['paymentInfo'], value: string) => {
    onChangeInvoiceData({
      ...invoiceData,
      paymentInfo: { ...invoiceData.paymentInfo, [field]: value }
    });
  };

  const handleProjectNameChange = (projIndex: number, newName: string) => {
    const updatedProjects = [...invoiceData.projects];
    updatedProjects[projIndex] = { ...updatedProjects[projIndex], projectName: newName };
    onChangeInvoiceData({ ...invoiceData, projects: updatedProjects });
  };

  const handleAddProject = () => {
    const newProject: InvoiceProjectGroup = {
      id: `proj-${Date.now()}`,
      projectName: `PROJECT: KATEGORI BARU`,
      items: [
        {
          id: `item-${Date.now()}`,
          description: 'Layanan Baru',
          qty: 1,
          unitPrice: 50000,
          totalPrice: 50000
        }
      ]
    };
    onChangeInvoiceData({
      ...invoiceData,
      projects: [...invoiceData.projects, newProject]
    });
  };

  const handleRemoveProject = (projIndex: number) => {
    if (invoiceData.projects.length <= 1) {
      alert('Minimal harus ada 1 project dalam invoice.');
      return;
    }
    const updatedProjects = invoiceData.projects.filter((_, idx) => idx !== projIndex);
    onChangeInvoiceData({ ...invoiceData, projects: updatedProjects });
  };

  const handleAddItem = (projIndex: number) => {
    const updatedProjects = [...invoiceData.projects];
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      description: 'Layanan Tambahan',
      qty: 1,
      unitPrice: 20000,
      totalPrice: 20000
    };
    updatedProjects[projIndex].items.push(newItem);
    onChangeInvoiceData({ ...invoiceData, projects: updatedProjects });
  };

  const handleUpdateItem = (projIndex: number, itemIndex: number, field: keyof InvoiceItem, value: any) => {
    const updatedProjects = [...invoiceData.projects];
    const currentItem = { ...updatedProjects[projIndex].items[itemIndex] };

    if (field === 'qty') {
      currentItem.qty = value;
      const numericQty = typeof value === 'number' ? value : parseFloat(value.toString().replace(',', '.')) || 0;
      currentItem.totalPrice = numericQty * currentItem.unitPrice;
    } else if (field === 'unitPrice') {
      currentItem.unitPrice = Number(value);
      const numericQty = typeof currentItem.qty === 'number' ? currentItem.qty : parseFloat(currentItem.qty.toString().replace(',', '.')) || 0;
      currentItem.totalPrice = numericQty * Number(value);
    } else if (field === 'totalPrice') {
      currentItem.totalPrice = Number(value);
    } else if (field === 'description') {
      currentItem.description = value;
    }

    updatedProjects[projIndex].items[itemIndex] = currentItem;
    onChangeInvoiceData({ ...invoiceData, projects: updatedProjects });
  };

  const handleRemoveItem = (projIndex: number, itemIndex: number) => {
    const updatedProjects = [...invoiceData.projects];
    updatedProjects[projIndex].items = updatedProjects[projIndex].items.filter((_, idx) => idx !== itemIndex);
    onChangeInvoiceData({ ...invoiceData, projects: updatedProjects });
  };

  // Actions
  const handleNativePrint = () => {
    window.print();
  };

  const handleDownloadJpg = async () => {
    if (!printAreaRef.current) return;
    setIsDownloadingJpg(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      let dataUrl = '';
      try {
        dataUrl = await toJpeg(printAreaRef.current, { 
          quality: 0.95,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          skipFonts: true
        });
      } catch (e) {
        dataUrl = await toJpeg(printAreaRef.current, { 
          quality: 0.9,
          pixelRatio: 1,
          backgroundColor: '#ffffff',
          skipFonts: true,
          fontEmbedCSS: ''
        });
      }

      const link = document.createElement('a');
      link.download = `Invoice_OneWay_${invoiceData.clientName || 'Client'}_${Date.now()}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert('Gagal mengunduh gambar. Silakan gunakan tombol Print PDF.');
    } finally {
      setIsDownloadingJpg(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    setIsDownloadingPdf(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      let dataUrl = '';
      try {
        dataUrl = await toJpeg(printAreaRef.current, { 
          quality: 0.95,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          skipFonts: true
        });
      } catch (e) {
        dataUrl = await toJpeg(printAreaRef.current, { 
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
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_OneWay_${invoiceData.clientName || 'Client'}_${Date.now()}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Gagal mengunduh PDF. Silakan gunakan tombol Print A4.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSendWa = () => {
    let msg = `*${invoiceData.invoiceTitle} - ${invoiceData.logoText}*\n`;
    msg += `------------------------------------\n`;
    msg += `*Klien:* ${invoiceData.clientName}\n`;
    msg += `*No Invoice:* ${invoiceData.invoiceNumber}\n`;
    msg += `*Tanggal:* ${invoiceData.invoiceDate}\n\n`;

    invoiceData.projects.forEach(p => {
      msg += `*${p.projectName}*\n`;
      p.items.forEach(i => {
        msg += `• ${i.description} (${i.qty}x) = ${formatIDR(getItemTotal(i))}\n`;
      });
      msg += `\n`;
    });

    msg += `*Total Keseluruhan:* ${formatIDR(totalKeseluruhan)}\n`;
    if (invoiceData.dpAmount > 0) {
      msg += `*Uang Muka (DP):* - ${formatIDR(invoiceData.dpAmount)}\n`;
    }
    msg += `*Sisa Tagihan (Tertagih):* ${formatIDR(sisaTagihan)}\n\n`;
    msg += `*Transfer Pembayaran:*\n`;
    msg += `Bank: ${invoiceData.paymentInfo.bankName}\n`;
    msg += `No. Rekening: ${invoiceData.paymentInfo.accountNumber}\n`;
    msg += `Atas Nama: ${invoiceData.paymentInfo.accountName}\n\n`;
    msg += `${invoiceData.footerNote}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans print:bg-white print:text-slate-900">
      
      {/* CSS STYLE FOR CLEAN A4 PRINTING */}
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
        }
      `}</style>

      {/* TOP NAVIGATION & CONTROLS HEADER (HIDDEN ON PRINT) */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 md:px-8 py-3.5 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          
          {/* Left: Brand & Back button */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToCalculator}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all flex items-center gap-2 text-xs font-bold border border-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Kalkulator</span>
            </button>

            <div className="hidden sm:block h-6 w-px bg-slate-800" />

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-orange-400">Page Studio Invoice</span>
                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-black rounded-md border border-indigo-500/30">Halaman Khusus</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Render A4 optimal & siap cetak langsung tanpa terpotong</p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onSyncFromCalculator}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-700"
              title="Import data terbaru dari kalkulator"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sync Kalkulator</span>
            </button>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                isEditing 
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' 
                  : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Tutup Form Edit' : 'Edit Isi Invoice'}</span>
            </button>

            <button
              onClick={handleNativePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-600/20"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Print PDF (A4)</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              {isDownloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              <span>Download PDF</span>
            </button>

            <button
              onClick={handleDownloadJpg}
              disabled={isDownloadingJpg}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-700 disabled:opacity-50"
            >
              {isDownloadingJpg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>Gambar JPG</span>
            </button>

            <button
              onClick={handleSendWa}
              className="px-3.5 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-lg shadow-green-600/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim WA</span>
            </button>
          </div>

        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-8">

        {/* EDITOR FORM DRAWER (PRINT HIDDEN) */}
        {isEditing && (
          <div className="bg-slate-800/90 backdrop-blur-lg rounded-3xl p-6 border-2 border-indigo-500/30 shadow-2xl space-y-6 print:hidden animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Form Editor Dokumen Invoice</h3>
                  <p className="text-xs text-slate-400">Ubah seluruh teks, baris layanan, nomor invoice, dan detail pembayaran secara fleksibel.</p>
                </div>
              </div>

              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-xs font-bold"
              >
                Selesai Editing
              </button>
            </div>

            {/* Sub Navigation Tabs */}
            <div className="flex border-b border-slate-700 gap-2 pb-2">
              <button
                onClick={() => setActiveTab('info')}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                  activeTab === 'info' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" /> 1. Header & Klien
              </button>
              <button
                onClick={() => setActiveTab('projects')}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                  activeTab === 'projects' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> 2. Project & Item Layanan ({invoiceData.projects.length})
              </button>
              <button
                onClick={() => setActiveTab('payment')}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                  activeTab === 'payment' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" /> 3. Pembayaran & DP
              </button>
            </div>

            {/* TAB 1: Header & Klien */}
            {activeTab === 'info' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Nama Logo Agensi</label>
                  <input
                    type="text"
                    value={invoiceData.logoText}
                    onChange={(e) => handleUpdateInfo('logoText', e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl border border-slate-700 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Tagline Sub-logo</label>
                  <input
                    type="text"
                    value={invoiceData.logoSubtext}
                    onChange={(e) => handleUpdateInfo('logoSubtext', e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl border border-slate-700 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Tagihan Kepada (Nama Klien)</label>
                  <input
                    type="text"
                    value={invoiceData.clientName}
                    onChange={(e) => handleUpdateInfo('clientName', e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl border border-slate-700 focus:border-indigo-500 outline-none"
                    placeholder="Nama Klien"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Keterangan Sub-Project / Deskripsi Klien</label>
                  <input
                    type="text"
                    value={invoiceData.projectDescription}
                    onChange={(e) => handleUpdateInfo('projectDescription', e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl border border-slate-700 focus:border-indigo-500 outline-none"
                    placeholder="Deskripsi singkat project..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Nomor Invoice</label>
                  <input
                    type="text"
                    value={invoiceData.invoiceNumber}
                    onChange={(e) => handleUpdateInfo('invoiceNumber', e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl border border-slate-700 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Tanggal Invoice</label>
                  <input
                    type="text"
                    value={invoiceData.invoiceDate}
                    onChange={(e) => handleUpdateInfo('invoiceDate', e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl border border-slate-700 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: Projects & Items */}
            {activeTab === 'projects' && (
              <div className="space-y-6">
                {invoiceData.projects.map((proj, pIdx) => (
                  <div key={proj.id} className="p-4 bg-slate-900/80 rounded-2xl border border-slate-700 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={proj.projectName}
                        onChange={(e) => handleProjectNameChange(pIdx, e.target.value)}
                        className="flex-1 px-3 py-2 text-xs font-black uppercase bg-slate-950 text-indigo-300 rounded-xl border border-indigo-500/30"
                        placeholder="Judul Project Header..."
                      />
                      <button
                        onClick={() => handleRemoveProject(pIdx)}
                        className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg text-xs transition-colors"
                        title="Hapus Blok Project Ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Items List */}
                    <div className="space-y-2 pt-2">
                      <div className="grid grid-cols-12 gap-2 text-[10px] font-black text-slate-400 uppercase px-1">
                        <div className="col-span-5">Deskripsi Layanan</div>
                        <div className="col-span-2 text-center">Qty</div>
                        <div className="col-span-2 text-right">Harga Satuan (Rp)</div>
                        <div className="col-span-2 text-right">Total (Rp)</div>
                        <div className="col-span-1 text-center">Hapus</div>
                      </div>

                      {proj.items.map((item, iIdx) => (
                        <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-slate-800 p-2 rounded-xl border border-slate-700 text-xs">
                          <div className="col-span-5">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleUpdateItem(pIdx, iIdx, 'description', e.target.value)}
                              className="w-full px-2.5 py-1.5 font-bold bg-slate-900 text-white border border-slate-700 rounded-lg outline-none focus:border-indigo-500"
                              placeholder="Nama Layanan"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="text"
                              value={item.qty}
                              onChange={(e) => handleUpdateItem(pIdx, iIdx, 'qty', e.target.value)}
                              className="w-full px-2 py-1.5 font-bold bg-slate-900 text-white border border-slate-700 rounded-lg text-center outline-none focus:border-indigo-500"
                              placeholder="Qty"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => handleUpdateItem(pIdx, iIdx, 'unitPrice', e.target.value)}
                              className="w-full px-2 py-1.5 font-bold bg-slate-900 text-white border border-slate-700 rounded-lg text-right outline-none focus:border-indigo-500"
                              placeholder="Harga Satuan"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              value={getItemTotal(item)}
                              onChange={(e) => handleUpdateItem(pIdx, iIdx, 'totalPrice', Number(e.target.value))}
                              className="w-full px-2 py-1.5 font-bold text-indigo-300 bg-indigo-950/40 border border-indigo-500/40 rounded-lg text-right outline-none"
                              placeholder="Total"
                            />
                          </div>
                          <div className="col-span-1 text-center">
                            <button
                              onClick={() => handleRemoveItem(pIdx, iIdx)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={() => handleAddItem(pIdx)}
                        className="mt-2 w-full py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all border border-indigo-500/20"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Item Layanan
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={handleAddProject}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                >
                  <Plus className="w-4 h-4" /> Tambah Blok Project Baru (Multi-Project Invoice)
                </button>
              </div>
            )}

            {/* TAB 3: Payment & DP */}
            {activeTab === 'payment' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-400 uppercase">Nama Bank</label>
                    <input
                      type="text"
                      value={invoiceData.paymentInfo.bankName}
                      onChange={(e) => handleUpdatePayment('bankName', e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl border border-slate-700 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-400 uppercase">Nomor Rekening</label>
                    <input
                      type="text"
                      value={invoiceData.paymentInfo.accountNumber}
                      onChange={(e) => handleUpdatePayment('accountNumber', e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl border border-slate-700 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-400 uppercase">Atas Nama</label>
                    <input
                      type="text"
                      value={invoiceData.paymentInfo.accountName}
                      onChange={(e) => handleUpdatePayment('accountName', e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl border border-slate-700 outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-400 uppercase">Uang Muka (DP) / Pembayaran Awal (Rp)</label>
                    <input
                      type="number"
                      value={invoiceData.dpAmount}
                      onChange={(e) => handleUpdateInfo('dpAmount', Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2 text-xs font-bold bg-orange-950/40 text-orange-300 rounded-xl border border-orange-500/40 outline-none"
                      placeholder="0"
                    />
                    <span className="text-[10px] text-slate-400 block font-medium">Sisa tagihan otomatis dikurangi nominal DP ini.</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-400 uppercase">Catatan Footer / Ucapan</label>
                    <input
                      type="text"
                      value={invoiceData.footerNote}
                      onChange={(e) => handleUpdateInfo('footerNote', e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl border border-slate-700 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DOKUMEN INVOICE CANVAS (FULL A4 STANDALONE DISPLAY) */}
        <div className="flex justify-center w-full">
          <div 
            ref={printAreaRef}
            className="print-container bg-white p-8 md:p-14 text-slate-800 font-sans w-full max-w-[850px] shadow-2xl rounded-sm border border-slate-200 select-none print:shadow-none print:p-0 print:m-0 print:border-none print:w-full"
            style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
          >
            {/* HEADER */}
            <div className="flex justify-between items-start border-b-2 border-slate-300 pb-4">
              <div>
                <h1 className="text-3xl font-black text-[#1e293b] tracking-tight leading-tight">
                  {invoiceData.logoText}
                </h1>
                <p className="text-[11px] font-bold text-[#ea580c] tracking-[0.2em] uppercase mt-0.5">
                  {invoiceData.logoSubtext}
                </p>
              </div>
              <div className="text-right">
                <h2 className="text-3xl md:text-4xl font-black text-[#ea580c] tracking-tight uppercase">
                  {invoiceData.invoiceTitle}
                </h2>
              </div>
            </div>

            {/* METADATA ROW */}
            <div className="grid grid-cols-12 gap-4 py-6 text-xs text-slate-700">
              <div className="col-span-7 space-y-1">
                <p className="font-bold text-slate-800">Tagihan Kepada:</p>
                <p className="font-extrabold text-sm text-[#0f172a]">{invoiceData.clientName || 'Yudha Kurniawan'}</p>
                {invoiceData.projectDescription && (
                  <p className="font-medium text-slate-600 leading-snug">{invoiceData.projectDescription}</p>
                )}
              </div>
              <div className="col-span-5 text-right space-y-1">
                <p>
                  <span className="font-bold text-slate-800">Nomor Invoice:</span> {invoiceData.invoiceNumber}
                </p>
                <p>
                  <span className="font-bold text-slate-800">Tanggal:</span> {invoiceData.invoiceDate}
                </p>
              </div>
            </div>

            {/* PROJECT TABLES */}
            <div className="space-y-6 my-2">
              {invoiceData.projects.map((proj) => {
                const projSubtotal = getProjectSubtotal(proj);
                return (
                  <div key={proj.id} className="space-y-0 overflow-hidden">
                    {/* Project Navy Header */}
                    <div className="bg-[#1e293b] text-white px-3 py-2 text-xs font-extrabold uppercase tracking-wide">
                      {proj.projectName}
                    </div>

                    {/* Items Table */}
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-[#1e293b] text-white font-bold border-t border-slate-700">
                          <th className="py-2.5 px-3 font-bold text-left w-[46%]">Deskripsi Layanan</th>
                          <th className="py-2.5 px-2 font-bold text-center w-[14%]">Qty</th>
                          <th className="py-2.5 px-3 font-bold text-right w-[20%]">Harga Satuan</th>
                          <th className="py-2.5 px-3 font-bold text-right w-[20%]">Total Harga</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proj.items.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-slate-400 italic">Belum ada item layanan</td>
                          </tr>
                        ) : (
                          proj.items.map((item, idx) => {
                            const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]';
                            const itemTotal = getItemTotal(item);
                            return (
                              <tr key={item.id} className={`${rowBg} border-b border-slate-200/80`}>
                                <td className="py-2.5 px-3 font-medium text-slate-800">{item.description}</td>
                                <td className="py-2.5 px-2 text-center font-medium text-slate-700">{item.qty}</td>
                                <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                                  {formatIDR(item.unitPrice)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                                  {formatIDR(itemTotal)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>

            {/* BOTTOM SECTION: PAYMENT INFO & TOTALS */}
            <div className="grid grid-cols-12 gap-6 pt-6 items-start">
              {/* Left: Payment Info Box */}
              <div className="col-span-6 bg-white p-4 rounded-md border border-slate-200 space-y-2 text-xs">
                <h3 className="font-extrabold text-[#1e293b] text-sm border-b border-slate-100 pb-1">
                  Informasi Pembayaran
                </h3>
                <p className="text-slate-600 font-medium">Transfer Pembayaran:</p>
                <div className="space-y-1 text-slate-800 font-semibold">
                  <p><span className="font-bold">Bank:</span> {invoiceData.paymentInfo.bankName}</p>
                  <p><span className="font-bold">Nomor Rekening:</span> {invoiceData.paymentInfo.accountNumber}</p>
                  <p><span className="font-bold">Atas Nama:</span> {invoiceData.paymentInfo.accountName}</p>
                </div>
              </div>

              {/* Right: Subtotals & Sisa Tagihan */}
              <div className="col-span-6 space-y-2 text-xs text-right ml-auto w-full">
                {/* Project Subtotals if multiple */}
                {invoiceData.projects.length > 1 && invoiceData.projects.map((proj) => (
                  <div key={proj.id} className="flex justify-between items-center text-slate-700 font-medium">
                    <span className="truncate pr-2">Subtotal {proj.projectName.replace(/^PROJECT:\s*/i, '')}:</span>
                    <span className="font-bold text-slate-900 shrink-0">{formatIDR(getProjectSubtotal(proj))}</span>
                  </div>
                ))}

                <div className="flex justify-between items-center text-slate-800 font-extrabold text-sm pt-1">
                  <span>Total Keseluruhan:</span>
                  <span className="text-[#0f172a]">{formatIDR(totalKeseluruhan)}</span>
                </div>

                {invoiceData.dpAmount > 0 && (
                  <div className="flex justify-between items-center text-slate-700 font-bold">
                    <span>Uang Muka (DP):</span>
                    <span className="text-slate-900">- {formatIDR(invoiceData.dpAmount)}</span>
                  </div>
                )}

                {/* Orange Highlight Box for Sisa Tagihan */}
                <div className="bg-[#ea580c] text-white p-3.5 rounded-md mt-3 shadow-sm text-center">
                  <p className="text-xs font-bold leading-tight">
                    {invoiceData.dpAmount > 0 ? 'Sisa Tagihan (Tertagih):' : 'Total Tagihan (Tertagih):'}
                  </p>
                  <p className="text-xl md:text-2xl font-black mt-1 tracking-tight">
                    {formatIDR(sisaTagihan)}
                  </p>
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="mt-14 text-center text-[11px] italic font-medium text-slate-400">
              {invoiceData.footerNote}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
