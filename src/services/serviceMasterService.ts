import { dbService } from '../db/indexedDb';
import { AppUser, LaundryService, ServiceCategory, ServiceClassification, UnitMaster } from '../types';

export const serviceMasterService = {
  async getAllServices(): Promise<LaundryService[]> {
    return dbService.getAll<LaundryService>('services');
  },

  async getActiveServices(): Promise<LaundryService[]> {
    const list = await dbService.getAll<LaundryService>('services');
    return list.filter((s) => s.isActive);
  },

  async getAllCategories(): Promise<ServiceCategory[]> {
    return dbService.getAll<ServiceCategory>('categories');
  },

  async getAllClassifications(): Promise<ServiceClassification[]> {
    return dbService.getAll<ServiceClassification>('classifications');
  },

  async getAllUnits(): Promise<UnitMaster[]> {
    return dbService.getAll<UnitMaster>('units');
  },

  async createService(
    data: Omit<LaundryService, 'id'>,
    operator: AppUser
  ): Promise<LaundryService> {
    const newId = `SRV-${Date.now().toString().slice(-5)}`;
    const newService: LaundryService = {
      ...data,
      id: newId,
    };
    await dbService.put('services', newService);

    await dbService.put('auditLogs', {
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actionType: 'MASTER_SERVICE_UPDATE',
      entityType: 'MASTER',
      entityId: newId,
      description: `Layanan baru dibuat: ${newService.name} (${newService.categoryName} - ${newService.classificationName}) @ ${newService.pricePerUnit}/${newService.unitName}`,
      userId: operator.id,
      userName: operator.name,
    });

    return newService;
  },

  async updateService(
    id: string,
    data: Partial<Omit<LaundryService, 'id'>>,
    operator: AppUser
  ): Promise<LaundryService> {
    const all = await dbService.getAll<LaundryService>('services');
    const existing = all.find((s) => s.id === id);
    if (!existing) {
      throw new Error(`Layanan dengan ID "${id}" tidak ditemukan.`);
    }

    const updated: LaundryService = {
      ...existing,
      ...data,
      id, // Menjamin ID yang sudah terbit tidak berubah
    };
    await dbService.put('services', updated);

    await dbService.put('auditLogs', {
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actionType: 'MASTER_SERVICE_UPDATE',
      entityType: 'MASTER',
      entityId: id,
      description: `Layanan diubah [${id}]: ${updated.name} (Harga: ${updated.pricePerUnit}/${updated.unitName}, Est: ${updated.estimatedDurationHours} Jam, Status: ${updated.isActive ? 'Aktif' : 'Nonaktif'})`,
      userId: operator.id,
      userName: operator.name,
    });

    return updated;
  },

  async toggleServiceActive(id: string, operator: AppUser): Promise<LaundryService> {
    const all = await dbService.getAll<LaundryService>('services');
    const s = all.find((item) => item.id === id);
    if (!s) throw new Error(`Layanan dengan ID "${id}" tidak ditemukan.`);
    return this.updateService(id, { isActive: !s.isActive }, operator);
  },

  async deleteService(id: string, operator: AppUser): Promise<void> {
    const all = await dbService.getAll<LaundryService>('services');
    const s = all.find((item) => item.id === id);
    if (!s) return;
    await dbService.delete('services', id);

    await dbService.put('auditLogs', {
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actionType: 'MASTER_SERVICE_UPDATE',
      entityType: 'MASTER',
      entityId: id,
      description: `Layanan dihapus [${id}]: ${s.name}`,
      userId: operator.id,
      userName: operator.name,
    });
  },

  async createCategory(name: string): Promise<ServiceCategory> {
    const newId = `CAT-${Date.now().toString().slice(-4)}`;
    const newCat: ServiceCategory = { id: newId, name: name.trim().toUpperCase() };
    await dbService.put('categories', newCat);
    return newCat;
  },

  async updateCategory(id: string, name: string): Promise<ServiceCategory> {
    const all = await dbService.getAll<ServiceCategory>('categories');
    const existing = all.find((c) => c.id === id);
    if (!existing) throw new Error(`Kategori dengan ID "${id}" tidak ditemukan.`);

    const updated: ServiceCategory = {
      ...existing,
      name: name.trim().toUpperCase(),
      id,
    };
    await dbService.put('categories', updated);
    return updated;
  },

  async createClassification(categoryId: string, name: string): Promise<ServiceClassification> {
    const newId = `CLS-${Date.now().toString().slice(-4)}`;
    const newCls: ServiceClassification = { id: newId, categoryId, name: name.trim() };
    await dbService.put('classifications', newCls);
    return newCls;
  },

  async updateClassification(id: string, name: string): Promise<ServiceClassification> {
    const all = await dbService.getAll<ServiceClassification>('classifications');
    const existing = all.find((c) => c.id === id);
    if (!existing) throw new Error(`Klasifikasi dengan ID "${id}" tidak ditemukan.`);

    const updated: ServiceClassification = {
      ...existing,
      name: name.trim(),
      id,
    };
    await dbService.put('classifications', updated);
    return updated;
  },

  async createUnit(name: string, description: string): Promise<UnitMaster> {
    const cleanName = name.trim().toLowerCase();
    const newId = `UNIT-${cleanName.replace(/\s+/g, '-').toUpperCase()}`;
    const newUnit: UnitMaster = { id: newId, name: cleanName, description: description.trim() };
    await dbService.put('units', newUnit);
    return newUnit;
  },

  async updateUnit(
    id: string,
    name: string,
    description: string,
    operator?: AppUser
  ): Promise<UnitMaster> {
    const all = await dbService.getAll<UnitMaster>('units');
    const existing = all.find((u) => u.id === id);
    if (!existing) {
      throw new Error(`Satuan dengan ID "${id}" tidak ditemukan.`);
    }

    const cleanName = name.trim().toLowerCase();
    const updated: UnitMaster = {
      id, // Mempertahankan no ID terbit permanen
      name: cleanName,
      description: description.trim(),
    };

    await dbService.put('units', updated);

    // Sinkronisasi otomatis ke semua layanan yang menggunakan satuan ini
    const services = await dbService.getAll<LaundryService>('services');
    const servicesToUpdate = services.filter((s) => s.unitId === id);
    for (const s of servicesToUpdate) {
      await dbService.put('services', {
        ...s,
        unitName: cleanName,
      });
    }

    if (operator) {
      await dbService.put('auditLogs', {
        id: `AUDIT-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actionType: 'MASTER_SERVICE_UPDATE',
        entityType: 'MASTER',
        entityId: id,
        description: `Master Satuan diubah [${id}]: "${updated.name}" (${updated.description}), ${servicesToUpdate.length} layanan tersinkronisasi.`,
        userId: operator.id,
        userName: operator.name,
      });
    }

    return updated;
  },

  async deleteUnit(id: string, operator?: AppUser): Promise<void> {
    const all = await dbService.getAll<UnitMaster>('units');
    const existing = all.find((u) => u.id === id);
    if (!existing) return;

    // Cek apakah ada layanan yang memakai satuan ini
    const services = await dbService.getAll<LaundryService>('services');
    const inUse = services.filter((s) => s.unitId === id);
    if (inUse.length > 0) {
      throw new Error(
        `Satuan "${existing.name}" tidak dapat dihapus karena sedang digunakan oleh ${inUse.length} layanan.`
      );
    }

    await dbService.delete('units', id);

    if (operator) {
      await dbService.put('auditLogs', {
        id: `AUDIT-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actionType: 'MASTER_SERVICE_UPDATE',
        entityType: 'MASTER',
        entityId: id,
        description: `Master Satuan dihapus [${id}]: "${existing.name}"`,
        userId: operator.id,
        userName: operator.name,
      });
    }
  },
};

