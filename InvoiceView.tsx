import React, { useState } from 'react';
import { 
  InvoiceDocumentData, 
  InvoiceProjectGroup, 
  InvoiceItem, 
  QuoteBreakdown 
} from './types';
import { 
  Edit3, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Save, 
  Check, 
  CreditCard, 
  FileText, 
  User, 
  Calendar, 
  Building2, 
  DollarSign, 
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface InvoiceViewProps {
  invoiceData: InvoiceDocumentData;
  onChangeInvoiceData: (newData: InvoiceDocumentData) => void;
  onSyncFromCalculator: () => void;
  innerRef?: React.RefObject<HTMLDivElement | null>;
}

// Helper to format currency exactly as seen in the sample: Rp 15.000 (with space)
const formatIDRDocument = (val: number) => {
  const formatted = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0
  }).format(val);
  return `Rp ${formatted}`;
};

export default function InvoiceView({ 
  invoiceData, 
  onChangeInvoiceData, 
  onSyncFromCalculator,
  innerRef 
}: InvoiceViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'projects' | 'payment'>('info');

  // Helper to calculate total of an item
  const getItemTotal = (item: InvoiceItem): number => {
    if (typeof item.totalPrice === 'number') return item.totalPrice;
    const numericQty = typeof item.qty === 'number' ? item.qty : parseFloat(item.qty.toString().replace(',', '.')) || 0;
    return numericQty * item.unitPrice;
  };

  // Calculate project subtotal
  const getProjectSubtotal = (project: InvoiceProjectGroup): number => {
    return project.items.reduce((sum, item) => sum + getItemTotal(item), 0);
  };

  // Calculate total across all projects
  const subtotal = invoiceData.projects.reduce((sum, p) => sum + getProjectSubtotal(p), 0);
  const discountVal = invoiceData.discountAmount || 0;
  const totalKeseluruhan = Math.max(0, subtotal - discountVal);
  const sisaTagihan = Math.max(0, totalKeseluruhan - (invoiceData.dpAmount || 0));

  // Editor Handlers
  const handleUpdateInfo = (field: keyof InvoiceDocumentData, value: any) => {
    onChangeInvoiceData({
      ...invoiceData,
      [field]: value
    });
  };

  const handleUpdatePayment = (field: keyof InvoiceDocumentData['paymentInfo'], value: string) => {
    onChangeInvoiceData({
      ...invoiceData,
      paymentInfo: {
        ...invoiceData.paymentInfo,
        [field]: value
      }
    });
  };

  const handleProjectNameChange = (projIndex: number, newName: string) => {
    const updatedProjects = [...invoiceData.projects];
    updatedProjects[projIndex] = {
      ...updatedProjects[projIndex],
      projectName: newName
    };
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
      // Auto recalculate if numeric
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

  return (
    <div className="space-y-4">
      {/* Top Toggle Bar for Editing */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md border border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Edit3 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white">Mode Edit Dokumen Invoice</h4>
            <p className="text-[11px] text-slate-400">Sesuaikan teks, nomor invoice, item project, dan nominal secara fleksibel.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSyncFromCalculator}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-700"
            title="Import item dari kalkulator"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Synchronize Kalkulator
          </button>
          
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
              isEditing 
                ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {isEditing ? (
              <>
                <Check className="w-3.5 h-3.5" /> Tutup Form Edit
              </>
            ) : (
              <>
                <Edit3 className="w-3.5 h-3.5" /> Edit Isi Invoice
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Drawer Form when editing is active */}
      {isEditing && (
        <div className="bg-white rounded-2xl p-6 border-2 border-indigo-100 shadow-xl space-y-6 animate-in fade-in duration-300">
          {/* Sub Navigation */}
          <div className="flex border-b border-slate-100 gap-2 pb-2">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                activeTab === 'info' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="w-3.5 h-3.5" /> Header & Klien
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                activeTab === 'projects' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Project & Item Layanan ({invoiceData.projects.length})
            </button>
            <button
              onClick={() => setActiveTab('payment')}
              className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                activeTab === 'payment' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" /> Pembayaran & Uang Muka (DP)
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
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase">Tagline Sub-logo</label>
                <input
                  type="text"
                  value={invoiceData.logoSubtext}
                  onChange={(e) => handleUpdateInfo('logoSubtext', e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase">Tagihan Kepada (Klien)</label>
                <input
                  type="text"
                  value={invoiceData.clientName}
                  onChange={(e) => handleUpdateInfo('clientName', e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
                  placeholder="Nama Klien"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase">Keterangan Sub-Project Klien</label>
                <input
                  type="text"
                  value={invoiceData.projectDescription}
                  onChange={(e) => handleUpdateInfo('projectDescription', e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
                  placeholder="Deskripsi singkat project..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase">Nomor Invoice</label>
                <input
                  type="text"
                  value={invoiceData.invoiceNumber}
                  onChange={(e) => handleUpdateInfo('invoiceNumber', e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-400 uppercase">Tanggal Invoice</label>
                <input
                  type="text"
                  value={invoiceData.invoiceDate}
                  onChange={(e) => handleUpdateInfo('invoiceDate', e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Projects & Items */}
          {activeTab === 'projects' && (
            <div className="space-y-6">
              {invoiceData.projects.map((proj, pIdx) => (
                <div key={proj.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={proj.projectName}
                      onChange={(e) => handleProjectNameChange(pIdx, e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs font-black uppercase bg-slate-900 text-white rounded-lg border border-slate-800"
                      placeholder="Judul Project Header..."
                    />
                    <button
                      onClick={() => handleRemoveProject(pIdx)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg text-xs"
                      title="Hapus Project Ini"
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
                      <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-xl border border-slate-200 text-xs">
                        <div className="col-span-5">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleUpdateItem(pIdx, iIdx, 'description', e.target.value)}
                            className="w-full px-2.5 py-1.5 font-bold text-slate-800 border border-slate-200 rounded-lg outline-none"
                            placeholder="Nama Layanan"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={item.qty}
                            onChange={(e) => handleUpdateItem(pIdx, iIdx, 'qty', e.target.value)}
                            className="w-full px-2 py-1.5 font-bold text-slate-800 border border-slate-200 rounded-lg text-center outline-none"
                            placeholder="Qty"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateItem(pIdx, iIdx, 'unitPrice', e.target.value)}
                            className="w-full px-2 py-1.5 font-bold text-slate-800 border border-slate-200 rounded-lg text-right outline-none"
                            placeholder="Harga Satuan"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={getItemTotal(item)}
                            onChange={(e) => handleUpdateItem(pIdx, iIdx, 'totalPrice', Number(e.target.value))}
                            className="w-full px-2 py-1.5 font-bold text-indigo-700 bg-indigo-50/50 border border-indigo-100 rounded-lg text-right outline-none"
                            placeholder="Total"
                          />
                        </div>
                        <div className="col-span-1 text-center">
                          <button
                            onClick={() => handleRemoveItem(pIdx, iIdx)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => handleAddItem(pIdx)}
                      className="mt-2 w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Layanan di {proj.projectName.replace('PROJECT:', '')}
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={handleAddProject}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
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
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 rounded-xl border border-slate-200 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Nomor Rekening</label>
                  <input
                    type="text"
                    value={invoiceData.paymentInfo.accountNumber}
                    onChange={(e) => handleUpdatePayment('accountNumber', e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 rounded-xl border border-slate-200 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Atas Nama</label>
                  <input
                    type="text"
                    value={invoiceData.paymentInfo.accountName}
                    onChange={(e) => handleUpdatePayment('accountName', e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 rounded-xl border border-slate-200 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Diskon / Potongan Harga (Rp)</label>
                  <input
                    type="number"
                    value={invoiceData.discountAmount || 0}
                    onChange={(e) => handleUpdateInfo('discountAmount', Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 text-xs font-bold bg-emerald-50/50 text-emerald-900 rounded-xl border border-emerald-200 outline-none"
                    placeholder="0"
                  />
                  <span className="text-[10px] text-slate-400 block font-medium">Potongan harga mengurangi subtotal tagihan.</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Uang Muka (DP) / Pembayaran Awal (Rp)</label>
                  <input
                    type="number"
                    value={invoiceData.dpAmount}
                    onChange={(e) => handleUpdateInfo('dpAmount', Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 text-xs font-bold bg-orange-50/50 text-orange-900 rounded-xl border border-orange-200 outline-none"
                    placeholder="0"
                  />
                  <span className="text-[10px] text-slate-400 block font-medium">Jika diisi, sisa tagihan otomatis dikurangi nominal DP ini.</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-400 uppercase">Catatan Footer / Ucapan</label>
                  <input
                    type="text"
                    value={invoiceData.footerNote}
                    onChange={(e) => handleUpdateInfo('footerNote', e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 rounded-xl border border-slate-200 outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DOKUMEN PREVIEW INVOICE (Matching Reference Image 1:1) */}
      <div 
        ref={innerRef}
        className="bg-white p-8 md:p-12 shadow-2xl rounded-sm text-slate-800 font-sans max-w-[800px] mx-auto border border-slate-200 relative select-none"
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
        <div className="grid grid-cols-12 gap-4 py-5 text-xs text-slate-700">
          <div className="col-span-7 space-y-1">
            <p className="font-bold text-slate-[#334155]">Tagihan Kepada:</p>
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
                      <th className="py-2 px-3 font-bold text-left w-[46%]">Deskripsi Layanan</th>
                      <th className="py-2 px-2 font-bold text-center w-[14%]">Qty</th>
                      <th className="py-2 px-3 font-bold text-right w-[20%]">Harga Satuan</th>
                      <th className="py-2 px-3 font-bold text-right w-[20%]">Total Harga</th>
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
                          <tr key={item.id} className={`${rowBg} border-b border-slate-200/80 hover:bg-slate-50`}>
                            <td className="py-2.5 px-3 font-medium text-slate-800">{item.description}</td>
                            <td className="py-2.5 px-2 text-center font-medium text-slate-700">{item.qty}</td>
                            <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                              {formatIDRDocument(item.unitPrice)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                              {formatIDRDocument(itemTotal)}
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
          <div className="col-span-6 bg-white p-3.5 rounded-md border border-slate-200 space-y-2 text-xs">
            <h3 className="font-extrabold text-[#1e293b] text-sm border-b border-slate-100 pb-1">
              Informasi Pembayaran
            </h3>
            <p className="text-slate-600 font-medium">Transfer Pembayaran:</p>
            <div className="space-y-0.5 text-slate-800 font-semibold">
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
                <span className="font-bold text-slate-900 shrink-0">{formatIDRDocument(getProjectSubtotal(proj))}</span>
              </div>
            ))}

            {discountVal > 0 ? (
              <>
                <div className="flex justify-between items-center text-slate-700 font-medium">
                  <span>Subtotal:</span>
                  <span className="font-bold text-slate-900">{formatIDRDocument(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-600 font-bold">
                  <span>Diskon / Potongan Harga:</span>
                  <span>- {formatIDRDocument(discountVal)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-800 font-extrabold text-sm pt-1 border-t border-slate-200">
                  <span>Total Keseluruhan:</span>
                  <span className="text-[#0f172a]">{formatIDRDocument(totalKeseluruhan)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between items-center text-slate-800 font-extrabold text-sm pt-1">
                <span>Total Keseluruhan:</span>
                <span className="text-[#0f172a]">{formatIDRDocument(totalKeseluruhan)}</span>
              </div>
            )}

            {invoiceData.dpAmount > 0 && (
              <div className="flex justify-between items-center text-slate-700 font-bold">
                <span>Uang Muka (DP):</span>
                <span className="text-slate-900">- {formatIDRDocument(invoiceData.dpAmount)}</span>
              </div>
            )}

            {/* Orange Highlight Box for Sisa Tagihan */}
            <div className="bg-[#ea580c] text-white p-3 rounded-md mt-3 shadow-sm text-center">
              <p className="text-xs font-bold leading-tight">
                {invoiceData.dpAmount > 0 ? 'Sisa Tagihan (Tertagih):' : 'Total Tagihan (Tertagih):'}
              </p>
              <p className="text-xl md:text-2xl font-black mt-1 tracking-tight">
                {formatIDRDocument(sisaTagihan)}
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-12 text-center text-[11px] italic font-medium text-slate-400">
          {invoiceData.footerNote}
        </div>
      </div>
    </div>
  );
}
