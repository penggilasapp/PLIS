import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Bluetooth,
  CheckCircle2,
  ExternalLink,
  Info,
  Printer,
  RefreshCw,
  Smartphone,
  WifiOff,
} from 'lucide-react';
import {
  BluetoothDeviceInfo,
  bluetoothPrinterService,
} from '../../../services/bluetoothPrinterService';
import { BusinessSettings } from '../../../types';

interface BluetoothPrinterViewProps {
  settings: BusinessSettings;
}

export const BluetoothPrinterView: React.FC<BluetoothPrinterViewProps> = ({ settings }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [device, setDevice] = useState<BluetoothDeviceInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(
    null
  );

  useEffect(() => {
    const supported = bluetoothPrinterService.isSupported();
    setIsSupported(supported);
    setDevice(bluetoothPrinterService.getConnectedDevice());
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    setStatusMessage(null);
    const result = await bluetoothPrinterService.connect();
    if (result.success) {
      setDevice(bluetoothPrinterService.getConnectedDevice());
      setStatusMessage({ type: 'success', text: result.message });
    } else {
      setStatusMessage({ type: 'error', text: result.message });
    }
    setIsConnecting(false);
  };

  const handleDisconnect = async () => {
    await bluetoothPrinterService.disconnect();
    setDevice(null);
    setStatusMessage({ type: 'info', text: 'Printer Bluetooth terputus.' });
  };

  const handleTestPrint = async () => {
    if (!device) {
      setStatusMessage({
        type: 'error',
        text: 'Printer belum terhubung! Silakan klik "Cari & Hubungkan Printer".',
      });
      return;
    }

    // Dummy test transaction
    const testTrx: any = {
      id: 'TEST-PRINT-58MM',
      createdAt: new Date().toISOString(),
      customerName: 'PELANGGAN TEST',
      customerPhone: '08123456789',
      items: [
        {
          serviceName: 'Uji Cetak Thermal 58mm',
          quantity: 1,
          unitName: 'pcs',
          pricePerUnit: 10000,
          subtotal: 10000,
        },
      ],
      totalAmount: 10000,
      discount: 0,
      finalAmount: 10000,
      paidAmount: 10000,
      remainingAmount: 0,
      paymentStatus: 'LUNAS',
      laundryStatus: 'SIAP_DIAMBIL',
      createdByUserName: 'Teknisi PLIS',
    };

    const res = await bluetoothPrinterService.printReceipt(testTrx, settings);
    if (res.success) {
      setStatusMessage({ type: 'success', text: 'Uji cetak berhasil dikirim ke printer thermal!' });
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Header Info Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <Bluetooth className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">Printer Thermal Bluetooth 58 mm</h3>
            <p className="text-xs text-slate-500">
              Web Bluetooth API untuk printer kasir mini (Panda, RPP02N, VSC, Mini POS)
            </p>
          </div>
        </div>

        {/* Compatibility Status Banner */}
        <div
          className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
            isSupported
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          {isSupported ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="font-bold">
              {isSupported
                ? 'Web Bluetooth API Didukung di Perangkat Ini'
                : 'Web Bluetooth API Belum Aktif di Browser Ini'}
            </div>
            <p className="mt-0.5 text-[11px] leading-relaxed">
              {isSupported
                ? 'Browser Anda mendukung koneksi Bluetooth langsung ke thermal printer portable. Nyalakan printer thermal Anda dan pastikan Bluetooth ponsel aktif.'
                : 'Web Bluetooth API hanya tersedia pada Google Chrome di Android via HTTPS atau desktop Chrome. Jika menggunakan browser lain, gunakan tombol "Cetak via Browser" pada pratinjau nota.'}
            </p>
          </div>
        </div>
      </div>

      {/* Connection & Status Panel */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
          Status Koneksi Printer
        </h4>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-3.5 h-3.5 rounded-full ${
                device ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
              }`}
            />
            <div>
              <div className="font-bold text-sm text-slate-800">
                {device ? device.name : 'Belum Ada Printer Terhubung'}
              </div>
              <div className="text-[11px] text-slate-500">
                {device ? `ID: ${device.id}` : 'Silakan klik tombol di bawah untuk mencari printer'}
              </div>
            </div>
          </div>

          {device && (
            <button
              onClick={handleDisconnect}
              className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition"
            >
              Putuskan
            </button>
          )}
        </div>

        {statusMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : statusMessage.type === 'error'
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
          >
            <Bluetooth className="w-4 h-4" />
            <span>{isConnecting ? 'Mencari Perangkat...' : 'Cari & Hubungkan Printer'}</span>
          </button>

          <button
            onClick={handleTestPrint}
            disabled={!device}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Uji Cetak Sampel (Test Print)</span>
          </button>
        </div>
      </div>

      {/* Realistic Troubleshooting Guide */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 text-xs text-slate-600">
        <h4 className="font-bold uppercase tracking-wider text-slate-800">
          Panduan & Batasan Nyata Printer Bluetooth:
        </h4>
        <ul className="space-y-1.5 list-disc pl-4 text-[11px] leading-relaxed">
          <li>
            <strong>Izin Bluetooth:</strong> Saat dialog pop-up muncul, pilih nama printer Bluetooth Anda (biasanya bernama <em>MTP-II, RPP02N, POS-58, Bluetooth Printer</em>) lalu tekan <strong>Pair / Hubungkan</strong>.
          </li>
          <li>
            <strong>Lebar Kertas:</strong> Standar format yang dikirimkan adalah 58 mm (32 kolom teks ESC/POS).
          </li>
          <li>
            <strong>Opsi Alternatif (Sistem Cetak Browser):</strong> Jika printer tidak memiliki Bluetooth GATT atau menggunakan printer WiFi / USB OTG, Anda tetap bisa mencetak nota dengan sangat nyaman melalui tombol <strong>"Cetak Dialog"</strong> di pratinjau nota yang memanfaatkan driver bawaan Android.
          </li>
        </ul>
      </div>
    </div>
  );
};
