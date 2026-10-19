import { dbService } from '../db/indexedDb';
import { INITIAL_SETTINGS } from '../db/initialData';
import { AppUser, AuditLog, BusinessSettings } from '../types';

export const settingsService = {
  async getSettings(): Promise<BusinessSettings> {
    return dbService.getSetting<BusinessSettings>('business_settings', INITIAL_SETTINGS);
  },

  async updateSettings(settings: BusinessSettings, operator: AppUser): Promise<BusinessSettings> {
    await dbService.setSetting('business_settings', settings);

    await dbService.put('auditLogs', {
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actionType: 'SETTINGS_UPDATE',
      entityType: 'SETTINGS',
      entityId: 'business_settings',
      description: `Pengaturan usaha diperbarui oleh ${operator.name} (${settings.storeName})`,
      userId: operator.id,
      userName: operator.name,
    });

    return settings;
  },
};

export const auditService = {
  async getAll(): Promise<AuditLog[]> {
    const list = await dbService.getAll<AuditLog>('auditLogs');
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },
};
