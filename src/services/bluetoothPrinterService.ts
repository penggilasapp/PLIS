import { BusinessSettings, Transaction } from '../types';

export interface BluetoothDeviceInfo {
  id: string;
  name: string;
  connected: boolean;
}

class BluetoothPrinterService {
  private device: any = null;
  private characteristic: any = null;
  private isConnecting: boolean = false;

  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  getConnectedDevice(): BluetoothDeviceInfo | null {
    if (this.device && this.device.gatt && this.device.gatt.connected) {
      return {
        id: this.device.id,
        name: this.device.name || 'Thermal Printer 58mm',
        connected: true,
      };
    }
    return null;
  }

  async connect(): Promise<{ success: boolean; message: string; deviceName?: string }> {
    if (!this.isSupported()) {
      return {
        success: false,
        message:
          'Browser Anda belum mendukung Web Bluetooth API. Gunakan Google Chrome pada Android dengan koneksi HTTPS untuk menghubungkan printer Bluetooth secara langsung, atau gunakan opsi cetak sistem dialog browser.',
      };
    }

    try {
      this.isConnecting = true;
      // Request device with generic printer/serial GATT services or acceptAllDevices
      const bluetooth = (navigator as any).bluetooth;
      this.device = await bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          '0000e0ff-0000-1000-8000-00805f9b34fb',
          '49535343-fe7d-4ae5-8fa9-9fafd205e455',
          '0000ff00-0000-1000-8000-00805f9b34fb',
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        ],
      });

      if (!this.device) {
        return { success: false, message: 'Pemilihan perangkat Bluetooth dibatalkan.' };
      }

      const server = await this.device.gatt.connect();
      const services = await server.getPrimaryServices();

      // Find writable characteristic
      let writeChar = null;
      for (const service of services) {
        try {
          const chars = await service.getCharacteristics();
          for (const c of chars) {
            if (c.properties.write || c.properties.writeWithoutResponse) {
              writeChar = c;
              break;
            }
          }
          if (writeChar) break;
        } catch {
          // ignore restricted services
        }
      }

      this.characteristic = writeChar;

      return {
        success: true,
        message: `Terhubung ke printer "${this.device.name || 'Bluetooth Printer'}"`,
        deviceName: this.device.name || 'Bluetooth Printer',
      };
    } catch (err: any) {
      console.warn('Bluetooth connection error:', err);
      return {
        success: false,
        message:
          err.name === 'NotFoundError'
            ? 'Tidak ada printer Bluetooth yang dipilih.'
            : `Gagal terhubung ke Bluetooth: ${err.message || 'Periksa apakah printer menyala dan bluetooth aktif.'}`,
      };
    } finally {
      this.isConnecting = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.device && this.device.gatt && this.device.gatt.connected) {
      await this.device.gatt.disconnect();
    }
    this.device = null;
    this.characteristic = null;
  }

  /**
   * Generates ESC/POS standard byte buffer for 58mm thermal receipt (32 columns width)
   */
  generateEscPosBytes(trx: Transaction, settings: BusinessSettings): Uint8Array {
    const encoder = new TextEncoder();
    const parts: number[] = [];

    const pushStr = (str: string) => {
      const bytes = encoder.encode(str);
      for (let i = 0; i < bytes.length; i++) {
        parts.push(bytes[i]);
      }
    };

    // ESC @ : Initialize printer
    parts.push(0x1b, 0x40);

    // ESC a 1 : Align center
    parts.push(0x1b, 0x61, 0x01);

    // ESC E 1 : Bold ON
    parts.push(0x1b, 0x45, 0x01);
    pushStr(`${settings.storeName.toUpperCase()}\n`);
    // ESC E 0 : Bold OFF
    parts.push(0x1b, 0x45, 0x00);

    if (settings.tagline) {
      pushStr(`${settings.tagline}\n`);
    }
    pushStr(`${settings.address}\n`);
    pushStr(`Telp/WA: ${settings.phone}\n`);
    pushStr('================================\n'); // 32 chars for 58mm

    // ESC a 0 : Align left
    parts.push(0x1b, 0x61, 0x00);
    pushStr(`No. Nota : ${trx.id}\n`);
    pushStr(`Tgl      : ${new Date(trx.createdAt).toLocaleString('id-ID')}\n`);
    pushStr(`Kasir    : ${trx.createdByUserName}\n`);
    pushStr(`Pelanggan: ${trx.customerName}\n`);
    pushStr(`No. HP   : ${trx.customerPhone}\n`);
    if (trx.perfumePreference) {
      pushStr(`Parfum   : ${trx.perfumePreference}\n`);
    }
    pushStr('--------------------------------\n');

    // Items list: 32 columns
    trx.items.forEach((item) => {
      // Line 1: Item Name
      pushStr(`${item.serviceName}\n`);
      // Line 2: Qty x Price = Subtotal
      const qtyPrice = `  ${item.quantity} ${item.unitName} x ${item.pricePerUnit.toLocaleString('id-ID')}`;
      const sub = item.subtotal.toLocaleString('id-ID');
      const spaces = Math.max(1, 32 - qtyPrice.length - sub.length);
      pushStr(`${qtyPrice}${' '.repeat(spaces)}${sub}\n`);
    });

    pushStr('--------------------------------\n');

    // Totals
    const addRow = (label: string, value: string, bold = false) => {
      if (bold) parts.push(0x1b, 0x45, 0x01);
      const spaces = Math.max(1, 32 - label.length - value.length);
      pushStr(`${label}${' '.repeat(spaces)}${value}\n`);
      if (bold) parts.push(0x1b, 0x45, 0x00);
    };

    addRow('Total Tagihan', `Rp ${trx.finalAmount.toLocaleString('id-ID')}`, true);
    addRow('Dibayar', `Rp ${trx.paidAmount.toLocaleString('id-ID')}`);
    addRow('Sisa Tagihan', `Rp ${trx.remainingAmount.toLocaleString('id-ID')}`, trx.remainingAmount > 0);
    addRow('Status Bayar', trx.paymentStatus === 'LUNAS' ? 'LUNAS' : 'BELUM LUNAS');

    pushStr('================================\n');

    // Footer
    // Align center
    parts.push(0x1b, 0x61, 0x01);
    pushStr(`${settings.receiptFooterMessage}\n\n`);

    if (settings.termsAndConditions) {
      // Align left for small terms
      parts.push(0x1b, 0x61, 0x00);
      pushStr(`Syarat & Ketentuan:\n${settings.termsAndConditions}\n\n`);
    }

    // Feed lines & cut
    pushStr('\n\n\n');
    // GS V 0 : Cut paper
    parts.push(0x1d, 0x56, 0x00);

    return new Uint8Array(parts);
  }

  async printReceipt(
    trx: Transaction,
    settings: BusinessSettings
  ): Promise<{ success: boolean; message: string }> {
    const isConn = this.getConnectedDevice();
    if (!isConn || !this.characteristic) {
      return {
        success: false,
        message:
          'Printer Bluetooth belum terhubung. Silakan pasangkan perangkat Bluetooth atau gunakan tombol "Cetak via Browser".',
      };
    }

    try {
      const data = this.generateEscPosBytes(trx, settings);
      // Send in chunks of 100 bytes to avoid GATT buffer overflow on mobile
      const chunkSize = 100;
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        if (this.characteristic.writeValueWithoutResponse) {
          await this.characteristic.writeValueWithoutResponse(chunk);
        } else {
          await this.characteristic.writeValue(chunk);
        }
      }

      return {
        success: true,
        message: 'Perintah cetak berhasil dikirimkan ke printer Bluetooth.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Gagal mengirim data ke printer: ${err.message || 'Koneksi terputus'}`,
      };
    }
  }
}

export const bluetoothPrinterService = new BluetoothPrinterService();
