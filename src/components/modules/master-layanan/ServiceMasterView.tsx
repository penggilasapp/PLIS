import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  Edit,
  FolderTree,
  Plus,
  Scale,
  Sparkles,
  Tag,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from 'lucide-react';
import { formatCurrency } from '../../../shared/formatters';
import {
  AppUser,
  LaundryService,
  ServiceCategory,
  ServiceClassification,
  UnitMaster,
} from '../../../types';
import { serviceMasterService } from '../../../services/serviceMasterService';

interface ServiceMasterViewProps {
  services: LaundryService[];
  categories: ServiceCategory[];
  classifications: ServiceClassification[];
  units: UnitMaster[];
  currentUser: AppUser;
  onRefreshData: () => void;
}

export const ServiceMasterView: React.FC<ServiceMasterViewProps> = ({
  services,
  categories,
  classifications,
  units,
  currentUser,
  onRefreshData,
}) => {
  // Navigation tab: 'services' | 'units'
  const [activeTab, setActiveTab] = useState<'services' | 'units'>('services');

  // Service filter
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');

  // Modals state
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Editing state for Service
  const [editingService, setEditingService] = useState<LaundryService | null>(null);

  // Form Service fields
  const [formName, setFormName] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formClassificationId, setFormClassificationId] = useState('');
  const [formClassificationCustom, setFormClassificationCustom] = useState('');
  const [formUnitId, setFormUnitId] = useState('');
  const [formPrice, setFormPrice] = useState('8000');
  const [formDuration, setFormDuration] = useState('24');
  const [formIsActive, setFormIsActive] = useState(true);
  const [serviceErrorMsg, setServiceErrorMsg] = useState('');

  // Editing state for Unit
  const [editingUnit, setEditingUnit] = useState<UnitMaster | null>(null);
  const [unitFormName, setUnitFormName] = useState('');
  const [unitFormDesc, setUnitFormDesc] = useState('');
  const [unitErrorMsg, setUnitErrorMsg] = useState('');

  // Form Category fields
  const [catName, setCatName] = useState('');
  const [clsName, setClsName] = useState('');

  // Success toast message
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((current) => (current === msg ? null : current));
    }, 3500);
  };

  // Classifications matching current selected category in form
  const filteredClassifications = formCategoryId
    ? classifications.filter((c) => c.categoryId === formCategoryId)
    : classifications;

  // --- SERVICE ACTIONS ---

  const handleOpenAddService = () => {
    setEditingService(null);
    setFormName('');
    const firstCat = categories[0]?.id || '';
    setFormCategoryId(firstCat);
    const matching = classifications.filter((c) => c.categoryId === firstCat);
    setFormClassificationId(matching[0]?.id || '');
    setFormClassificationCustom(matching[0]?.name || 'REGULAR');
    setFormUnitId(units[0]?.id || '');
    setFormPrice('10000');
    setFormDuration('24');
    setFormIsActive(true);
    setServiceErrorMsg('');
    setShowServiceModal(true);
  };

  const handleOpenEditService = (s: LaundryService) => {
    setEditingService(s);
    setFormName(s.name);
    setFormCategoryId(s.categoryId);
    setFormClassificationId(s.classificationId || '');
    setFormClassificationCustom(s.classificationName || '');
    setFormUnitId(s.unitId);
    setFormPrice(s.pricePerUnit.toString());
    setFormDuration(s.estimatedDurationHours.toString());
    setFormIsActive(s.isActive);
    setServiceErrorMsg('');
    setShowServiceModal(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setServiceErrorMsg('');

    if (!formName.trim()) {
      setServiceErrorMsg('Nama layanan wajib diisi!');
      return;
    }

    const cat = categories.find((c) => c.id === formCategoryId);
    if (!cat) {
      setServiceErrorMsg('Pilih kategori layanan!');
      return;
    }

    // Resolve classification
    let cls = classifications.find((c) => c.id === formClassificationId);
    let finalClsName = cls?.name || formClassificationCustom.trim() || 'REGULAR';
    let finalClsId = cls?.id || (formClassificationId ? formClassificationId : `CLS-${Date.now()}`);

    // If classification custom name entered but no ID, create classification
    if (!cls && finalClsName) {
      try {
        const createdCls = await serviceMasterService.createClassification(cat.id, finalClsName);
        finalClsId = createdCls.id;
        finalClsName = createdCls.name;
      } catch {
        // fallback to using custom string
      }
    }

    const unt = units.find((u) => u.id === formUnitId);
    if (!unt) {
      setServiceErrorMsg('Pilih satuan layanan!');
      return;
    }

    const price = parseFloat(formPrice);
    if (isNaN(price) || price < 0) {
      setServiceErrorMsg('Harga per satuan harus angka valid minimal 0!');
      return;
    }

    const duration = parseInt(formDuration) || 24;

    try {
      if (editingService) {
        // Update service retaining published ID
        await serviceMasterService.updateService(
          editingService.id,
          {
            categoryId: cat.id,
            categoryName: cat.name,
            classificationId: finalClsId,
            classificationName: finalClsName,
            name: formName.trim(),
            unitId: unt.id,
            unitName: unt.name,
            pricePerUnit: price,
            estimatedDurationHours: duration,
            isActive: formIsActive,
          },
          currentUser
        );
        showToast(`Layanan [${editingService.id}] "${formName.trim()}" berhasil diperbarui!`);
      } else {
        // Create new service
        await serviceMasterService.createService(
          {
            categoryId: cat.id,
            categoryName: cat.name,
            classificationId: finalClsId,
            classificationName: finalClsName,
            name: formName.trim(),
            unitId: unt.id,
            unitName: unt.name,
            pricePerUnit: price,
            estimatedDurationHours: duration,
            isActive: formIsActive,
          },
          currentUser
        );
        showToast(`Layanan baru "${formName.trim()}" berhasil disimpan!`);
      }

      onRefreshData();
      setShowServiceModal(false);
    } catch (err: any) {
      setServiceErrorMsg(err.message || 'Gagal menyimpan layanan');
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      const updated = await serviceMasterService.toggleServiceActive(id, currentUser);
      onRefreshData();
      showToast(`Status layanan [${id}] diubah menjadi ${updated.isActive ? 'Aktif' : 'Nonaktif'}`);
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status');
    }
  };

  const handleDeleteService = async (id: string, name: string) => {
    if (window.confirm(`Yakin ingin menghapus layanan [${id}] "${name}" dari master?`)) {
      await serviceMasterService.deleteService(id, currentUser);
      onRefreshData();
      showToast(`Layanan [${id}] berhasil dihapus`);
    }
  };

  // --- UNIT ACTIONS ---

  const handleOpenAddUnit = () => {
    setEditingUnit(null);
    setUnitFormName('');
    setUnitFormDesc('');
    setUnitErrorMsg('');
    setShowUnitModal(true);
  };

  const handleOpenEditUnit = (u: UnitMaster) => {
    setEditingUnit(u);
    setUnitFormName(u.name);
    setUnitFormDesc(u.description || '');
    setUnitErrorMsg('');
    setShowUnitModal(true);
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnitErrorMsg('');

    if (!unitFormName.trim()) {
      setUnitErrorMsg('Nama satuan wajib diisi (contoh: kg, pcs, meter)!');
      return;
    }

    try {
      if (editingUnit) {
        // Edit existing unit maintaining published ID
        await serviceMasterService.updateUnit(
          editingUnit.id,
          unitFormName.trim(),
          unitFormDesc.trim(),
          currentUser
        );
        showToast(`Master Satuan [${editingUnit.id}] "${unitFormName.trim()}" berhasil diperbarui!`);
      } else {
        // Create new unit
        await serviceMasterService.createUnit(unitFormName.trim(), unitFormDesc.trim());
        showToast(`Satuan baru "${unitFormName.trim()}" berhasil ditambahkan!`);
      }

      onRefreshData();
      setShowUnitModal(false);
      setEditingUnit(null);
    } catch (err: any) {
      setUnitErrorMsg(err.message || 'Gagal menyimpan satuan');
    }
  };

  const handleDeleteUnit = async (unit: UnitMaster) => {
    const inUseCount = services.filter((s) => s.unitId === unit.id).length;
    if (inUseCount > 0) {
      alert(
        `Satuan "${unit.name}" (${unit.id}) tidak dapat dihapus karena sedang dipakai oleh ${inUseCount} layanan!`
      );
      return;
    }

    if (window.confirm(`Yakin ingin menghapus satuan [${unit.id}] "${unit.name}"?`)) {
      try {
        await serviceMasterService.deleteUnit(unit.id, currentUser);
        onRefreshData();
        showToast(`Satuan [${unit.id}] berhasil dihapus`);
      } catch (err: any) {
        alert(err.message || 'Gagal menghapus satuan');
      }
    }
  };

  // --- CATEGORY ACTIONS ---

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    const newCat = await serviceMasterService.createCategory(catName);
    if (clsName.trim()) {
      await serviceMasterService.createClassification(newCat.id, clsName);
    }
    onRefreshData();
    setCatName('');
    setClsName('');
    setShowCategoryModal(false);
    showToast(`Kategori "${newCat.name}" berhasil dibuat`);
  };

  const displayServices = services.filter((s) => {
    if (activeCategoryFilter === 'ALL') return true;
    return s.categoryId === activeCategoryFilter;
  });

  return (
    <div className="space-y-3.5 pb-24">
      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-bounce-short">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <FolderTree className="w-4 h-4 text-blue-600" />
              Master Layanan & Satuan Laundry
            </h3>
            <p className="text-[11px] text-slate-500">
              Kelola daftar layanan, harga, estimasi pengerjaan, dan master satuan pengukuran
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowCategoryModal(true)}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1"
              title="Tambah Kategori Layanan"
            >
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              <span>+ Kategori</span>
            </button>

            {activeTab === 'services' ? (
              <button
                onClick={handleOpenAddService}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Layanan</span>
              </button>
            ) : (
              <button
                onClick={handleOpenAddUnit}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Satuan</span>
              </button>
            )}
          </div>
        </div>

        {/* Master Subtabs Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <button
            onClick={() => setActiveTab('services')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
              activeTab === 'services'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Master Layanan ({services.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('units')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
              activeTab === 'units'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Master Satuan ({units.length})</span>
          </button>
        </div>

        {/* Category Filter Pills (Services Tab Only) */}
        {activeTab === 'services' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              onClick={() => setActiveCategoryFilter('ALL')}
              className={`px-3 py-1 rounded-full font-semibold whitespace-nowrap transition border text-[11px] ${
                activeCategoryFilter === 'ALL'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Semua ({services.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryFilter(cat.id)}
                className={`px-3 py-1 rounded-full font-semibold whitespace-nowrap transition border text-[11px] ${
                  activeCategoryFilter === cat.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TAB 1: SERVICES LIST */}
      {activeTab === 'services' && (
        <div className="space-y-2">
          {displayServices.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
              Tidak ada layanan ditemukan untuk kategori ini.
            </div>
          ) : (
            displayServices.map((srv) => (
              <div
                key={srv.id}
                className={`p-3.5 rounded-2xl border transition shadow-2xs bg-white ${
                  srv.isActive ? 'border-slate-200/90' : 'border-slate-200/50 bg-slate-50/70 opacity-75'
                } flex items-center justify-between gap-3 text-xs`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      {srv.id}
                    </span>
                    <span className="font-black text-slate-900 text-sm">{srv.name}</span>
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                      {srv.categoryName}
                    </span>
                    <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
                      {srv.classificationName}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-2 flex-wrap">
                    <span>
                      Harga:{' '}
                      <strong className="text-slate-900 font-bold">
                        {formatCurrency(srv.pricePerUnit)}
                      </strong>{' '}
                      / {srv.unitName}
                    </span>
                    <span>•</span>
                    <span className="bg-indigo-50 text-indigo-700 font-semibold px-1.5 py-0.2 rounded">
                      Est: {srv.estimatedDurationHours} Jam
                    </span>
                    <span>•</span>
                    <span
                      className={
                        srv.isActive ? 'text-emerald-600 font-bold' : 'text-slate-400 font-bold'
                      }
                    >
                      {srv.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleToggleActive(srv.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-blue-600 transition"
                    title={srv.isActive ? 'Nonaktifkan layanan' : 'Aktifkan layanan'}
                  >
                    {srv.isActive ? (
                      <ToggleRight className="w-6 h-6 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-400" />
                    )}
                  </button>

                  <button
                    onClick={() => handleOpenEditService(srv)}
                    className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold transition flex items-center gap-1 shadow-2xs"
                    title={`Edit Layanan ${srv.id}`}
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-xs">Edit</span>
                  </button>

                  {currentUser.role === 'OWNER' && (
                    <button
                      onClick={() => handleDeleteService(srv.id, srv.name)}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                      title="Hapus Layanan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: MASTER SATUAN LIST & EDIT */}
      {activeTab === 'units' && (
        <div className="space-y-3">
          <div className="bg-blue-50/80 border border-blue-200/70 p-3 rounded-2xl flex items-start gap-2.5 text-xs text-blue-900">
            <Scale className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Pengelolaan Master Satuan</span>
              <p className="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
                Satuan digunakan untuk perhitungan harga per kg, pcs, meter persegi, atau pasang.
                Anda dapat mengedit nama satuan dan deskripsi. ID terbit bersifat permanen dan aman
                disimpan di IndexedDB.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {units.map((unit) => {
              const linkedServicesCount = services.filter((s) => s.unitId === unit.id).length;
              return (
                <div
                  key={unit.id}
                  className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                        {unit.id}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {linkedServicesCount} Layanan
                      </span>
                    </div>

                    <div className="font-black text-slate-900 text-base flex items-center gap-1.5">
                      <span>{unit.name}</span>
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
                      {unit.description || 'Tidak ada deskripsi'}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleOpenEditUnit(unit)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl transition flex items-center gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit Satuan</span>
                    </button>

                    {currentUser.role === 'OWNER' && linkedServicesCount === 0 && (
                      <button
                        onClick={() => handleDeleteUnit(unit)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition"
                        title="Hapus Satuan (Belum digunakan)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SERVICE ADD / EDIT MODAL */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md sm:max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-100 my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {editingService ? 'Edit Master Layanan' : 'Tambah Layanan Baru'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Pengaturan tarif & durasi pengerjaan</p>
                </div>
              </div>
              <button
                onClick={() => setShowServiceModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              {/* Published ID Badge when editing */}
              {editingService && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] font-semibold uppercase">
                      No ID Terbit (Layanan)
                    </span>
                    <span className="font-mono font-black text-blue-700 text-sm">
                      {editingService.id}
                    </span>
                  </div>
                  <span className="bg-blue-200/80 text-blue-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    ID Permanen
                  </span>
                </div>
              )}

              {serviceErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{serviceErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveService} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nama Layanan Laundry *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Contoh: Cuci Setrika Kilat 1 Hari"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kategori *</label>
                    <select
                      value={formCategoryId}
                      onChange={(e) => {
                        const newCatId = e.target.value;
                        setFormCategoryId(newCatId);
                        const matching = classifications.filter((c) => c.categoryId === newCatId);
                        if (matching.length > 0) {
                          setFormClassificationId(matching[0].id);
                          setFormClassificationCustom(matching[0].name);
                        } else {
                          setFormClassificationId('');
                          setFormClassificationCustom('REGULAR');
                        }
                      }}
                      className="w-full px-3.5 py-2.5 text-sm font-semibold border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 bg-white transition"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Klasifikasi</label>
                    {filteredClassifications.length > 0 ? (
                      <select
                        value={formClassificationId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormClassificationId(val);
                          const found = filteredClassifications.find((c) => c.id === val);
                          if (found) setFormClassificationCustom(found.name);
                        }}
                        className="w-full px-3.5 py-2.5 text-sm font-semibold border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 bg-white transition"
                      >
                        {filteredClassifications.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={formClassificationCustom}
                        onChange={(e) => setFormClassificationCustom(e.target.value)}
                        placeholder="Misal: REGULAR"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Master Satuan *</label>
                    <select
                      value={formUnitId}
                      onChange={(e) => setFormUnitId(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm font-semibold border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 bg-white transition"
                    >
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.description})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Harga / Satuan (Rp) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm font-black text-slate-900 border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
                      required
                    />
                    {/* Quick price chips */}
                    <div className="flex gap-1.5 mt-1.5 overflow-x-auto pb-0.5">
                      {[6000, 8000, 10000, 15000].map((pr) => (
                        <button
                          key={pr}
                          type="button"
                          onClick={() => setFormPrice(pr.toString())}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-bold transition"
                        >
                          {formatCurrency(pr)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Estimasi Pengerjaan (Jam)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={formDuration}
                      onChange={(e) => setFormDuration(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 text-sm font-bold border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
                    />
                    <div className="flex gap-1">
                      {[
                        { l: '4 Jam', v: '4' },
                        { l: '24 Jam', v: '24' },
                        { l: '48 Jam', v: '48' },
                        { l: '72 Jam', v: '72' },
                      ].map((d) => (
                        <button
                          key={d.v}
                          type="button"
                          onClick={() => setFormDuration(d.v)}
                          className={`px-2 py-2 rounded-xl text-[11px] font-bold border transition ${
                            formDuration === d.v
                              ? 'bg-blue-50 border-blue-400 text-blue-700'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {d.l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Status Aktif Switch */}
                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-0"
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      Layanan Aktif (Tersedia untuk transaksi kasir)
                    </span>
                  </label>
                </div>

                <div className="pt-2 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowServiceModal(false)}
                    className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition active:scale-[0.98]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow-xs hover:shadow-sm active:scale-[0.98] flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{editingService ? 'Simpan Perubahan' : 'Tambah Layanan'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* UNIT ADD / EDIT MODAL */}
      {showUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md sm:max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-100 my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {editingUnit ? 'Edit Master Satuan' : 'Tambah Satuan Baru'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Konfigurasi unit hitung laundry</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowUnitModal(false);
                  setEditingUnit(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              {/* Published ID Badge when editing */}
              {editingUnit && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] font-semibold uppercase">
                      No ID Terbit (Satuan)
                    </span>
                    <span className="font-mono font-black text-blue-700 text-sm">{editingUnit.id}</span>
                  </div>
                  <span className="bg-blue-200/80 text-blue-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    ID Permanen
                  </span>
                </div>
              )}

              {unitErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{unitErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveUnit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nama Satuan Pengukuran *
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: kg, pcs, meter, pasang, set"
                    value={unitFormName}
                    onChange={(e) => setUnitFormName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-bold border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Deskripsi Satuan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Kilogram (Timbangan pakaian harian)"
                    value={unitFormDesc}
                    onChange={(e) => setUnitFormDesc(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>

                {editingUnit && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/90 leading-relaxed">
                    💡 <strong>Info Sinkronisasi:</strong> Mengedit nama satuan akan otomatis
                    memperbarui seluruh nama satuan pada layanan terkait yang menggunakannya.
                  </p>
                )}

                <div className="pt-2 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUnitModal(false);
                      setEditingUnit(null);
                    }}
                    className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition active:scale-[0.98]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow-xs hover:shadow-sm active:scale-[0.98] flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{editingUnit ? 'Simpan Satuan' : '+ Tambah Satuan'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY & CLASSIFICATION MODAL */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-100 my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    Tambah Kategori & Klasifikasi
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Struktur klasifikasi layanan laundry</p>
                </div>
              </div>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <form onSubmit={handleCreateCategory} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nama Kategori Baru *
                  </label>
                  <input
                    type="text"
                    placeholder="Misal: DRY CLEAN EXCLUSIVE"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm uppercase font-bold border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Klasifikasi Awal (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Misal: REGULAR"
                    value={clsName}
                    onChange={(e) => setClsName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>

                <div className="pt-2 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(false)}
                    className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition active:scale-[0.98]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow-xs hover:shadow-sm active:scale-[0.98] flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Simpan Kategori</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
