import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  Bluetooth,
  Check,
  Copy,
  Download,
  MessageCircle,
  Printer,
  Sparkles,
  X,
} from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  formatPhone,
  getLaundryStatusDetails,
  getPaymentStatusDetails,
  toWhatsAppPhone,
} from '../../../shared/formatters';
import { BusinessSettings, Transaction } from '../../../types';
import { bluetoothPrinterService } from '../../../services/bluetoothPrinterService';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  settings: BusinessSettings;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  transaction,
  settings,
}) => {
  const [paperWidth, setPaperWidth] = useState<'58mm' | 'standard'>('58mm');
  const [copied, setCopied] = useState(false);
  const [isBluetoothPrinting, setIsBluetoothPrinting] = useState(false);
  const [bluetoothMsg, setBluetoothMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen || !transaction) return null;

  const laundryDetails = getLaundryStatusDetails(transaction.laundryStatus);
  const paymentDetails = getPaymentStatusDetails(transaction.paymentStatus);

  // Browser print dialog
  const handleBrowserPrint = () => {
    window.print();
  };

  // WhatsApp share
  const handleShareWhatsApp = () => {
    if (!transaction.customerPhone) {
      alert('Nomor telepon pelanggan tidak tersedia pada nota ini!');
      return;
    }

    const waPhone = toWhatsAppPhone(transaction.customerPhone);
    const messageTemplate =
      settings.whatsappMessageTemplate ||
      'Halo Kak {customer_name}, terima kasih telah mempercayakan cucian di {store_name}.\n\n' +
      '📋 *No. Nota:* {order_number}\n' +
      '🧺 *Status:* {laundry_status}\n' +
      '💰 *Total Tagihan:* {total_amount}\n' +
      '💳 *Dibayar:* {paid_amount}\n' +
      '⚠️ *Sisa Piutang:* {remaining_amount}\n' +
      '⏰ *Estimasi Selesai:* {estimated_date}\n\n' +
      '{footer_message}';

    const text = messageTemplate
      .replace(/{customer_name}/g, transaction.customerName)
      .replace(/{store_name}/g, settings.storeName)
      .replace(/{order_number}/g, transaction.id)
      .replace(/{total_amount}/g, formatCurrency(transaction.finalAmount))
      .replace(/{paid_amount}/g, formatCurrency(transaction.paidAmount))
      .replace(/{remaining_amount}/g, formatCurrency(transaction.remainingAmount))
      .replace(/{laundry_status}/g, laundryDetails.label)
      .replace(/{estimated_date}/g, formatDate(transaction.estimatedCompletionAt, true))
      .replace(/{footer_message}/g, settings.receiptFooterMessage);

    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Bluetooth Direct Print
  const handleBluetoothPrint = async () => {
    setBluetoothMsg(null);
    setIsBluetoothPrinting(true);
    try {
      const res = await bluetoothPrinterService.printReceipt(transaction, settings);
      if (res.success) {
        setBluetoothMsg({ type: 'success', text: res.message });
      } else {
        setBluetoothMsg({ type: 'error', text: res.message });
      }
    } catch (e: any) {
      setBluetoothMsg({ type: 'error', text: e.message || 'Gagal mengirim data cetak' });
    } finally {
      setIsBluetoothPrinting(false);
    }
  };

  const handleCopyText = () => {
    const lines = [
      `=== ${settings.storeName.toUpperCase()} ===`,
      settings.address,
      `WA: ${settings.phone}`,
      '--------------------------------',
      `No. Nota: ${transaction.id}`,
      `Tanggal: ${formatDate(transaction.createdAt, true)}`,
      `Pelanggan: ${transaction.customerName} (${transaction.customerPhone})`,
      '--------------------------------',
      ...transaction.items.map(
        (it) => `${it.serviceName}\n  ${it.quantity} ${it.unitName} x ${formatCurrency(it.pricePerUnit)} = ${formatCurrency(it.subtotal)}`
      ),
      '--------------------------------',
      `Total Tagihan: ${formatCurrency(transaction.finalAmount)}`,
      `Telah Dibayar: ${formatCurrency(transaction.paidAmount)}`,
      `Sisa Tagihan: ${formatCurrency(transaction.remainingAmount)}`,
      `Status Bayar: ${paymentDetails.label}`,
      '--------------------------------',
      settings.receiptFooterMessage,
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-100 my-auto max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Control Bar (Hidden when printed) */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-sm">Nota Transaksi {transaction.id}</h3>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="bg-slate-800 p-0.5 rounded-lg flex text-[10px] font-bold">
              <button
                onClick={() => setPaperWidth('58mm')}
                className={`px-2 py-1 rounded-md transition ${
                  paperWidth === '58mm' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                58 mm
              </button>
              <button
                onClick={() => setPaperWidth('standard')}
                className={`px-2 py-1 rounded-md transition ${
                  paperWidth === 'standard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                A4 / Standar
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bluetooth Alert Notification */}
        {bluetoothMsg && (
          <div
            className={`p-2.5 text-xs font-semibold flex items-center gap-2 print:hidden ${
              bluetoothMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{bluetoothMsg.text}</span>
            <button onClick={() => setBluetoothMsg(null)} className="p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Scrollable Receipt Container (Strict Material/Thermal Design) */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-100/60 print:bg-white print:p-0 flex justify-center">
          {/* THE RECEIPT CANVAS */}
          <div
            id="printable-receipt"
            className={`bg-white shadow-xs border border-slate-200 print:border-none print:shadow-none p-4 rounded-xl text-slate-900 font-mono transition-all ${
              paperWidth === '58mm'
                ? 'w-[300px] text-[11px] leading-tight'
                : 'w-full max-w-sm text-xs leading-normal'
            }`}
          >
            {/* BAGIAN A: HEADER USAHA */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h2 className="font-black text-sm uppercase tracking-wide">
                {settings.storeName}
              </h2>
              {settings.tagline && (
                <p className="text-[10px] text-slate-600 italic mt-0.5">{settings.tagline}</p>
              )}
              <p className="text-[10px] text-slate-600 mt-1">{settings.address}</p>
              <p className="text-[10px] text-slate-600">Telp/WA: {formatPhone(settings.phone)}</p>
            </div>

            {/* BAGIAN B: DETAIL TRANSAKSI */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1">
              <div className="flex justify-between">
                <span>No. Nota:</span>
                <span className="font-bold">{transaction.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal:</span>
                <span>{formatDate(transaction.createdAt, true)}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir:</span>
                <span>{transaction.createdByUserName.split(' ')[0]}</span>
              </div>
              <div className="flex justify-between">
                <span>Pelanggan:</span>
                <span className="font-bold">{transaction.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>No. HP:</span>
                <span>{formatPhone(transaction.customerPhone)}</span>
              </div>
              {transaction.perfumePreference && (
                <div className="flex justify-between">
                  <span>Parfum:</span>
                  <span>{transaction.perfumePreference}</span>
                </div>
              )}
            </div>

            {/* Items List */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Layanan Cucian:
              </div>
              {transaction.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="font-bold">{item.serviceName}</div>
                  <div className="flex justify-between text-slate-600 text-[10px]">
                    <span>
                      {item.quantity} {item.unitName} × {formatCurrency(item.pricePerUnit)}
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Total, Payment, & Balance */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(transaction.totalAmount)}</span>
              </div>
              {transaction.discount > 0 && (
                <div className="flex justify-between">
                  <span>Diskon:</span>
                  <span>- {formatCurrency(transaction.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-xs pt-1 border-t border-slate-200">
                <span>TOTAL:</span>
                <span>{formatCurrency(transaction.finalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Dibayar:</span>
                <span>{formatCurrency(transaction.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Sisa Tagihan:</span>
                <span className={transaction.remainingAmount > 0 ? 'text-rose-600' : 'text-emerald-700'}>
                  {formatCurrency(transaction.remainingAmount)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-[10px]">
                <span>Status Bayar:</span>
                <span>{paymentDetails.label.toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>Status Cucian:</span>
                <span>{laundryDetails.label}</span>
              </div>
            </div>

            {/* BAGIAN C: KETENTUAN LAUNDRY */}
            <div className="pt-3 text-center space-y-2 text-[10px] text-slate-600">
              <p className="font-bold text-slate-800">{settings.receiptFooterMessage}</p>
              {settings.termsAndConditions && (
                <div className="text-left text-[9px] bg-slate-50 p-2 rounded-md border border-slate-200 whitespace-pre-line leading-relaxed">
                  <span className="font-bold block mb-1">Ketentuan Laundry:</span>
                  {settings.termsAndConditions}
                </div>
              )}
              <div className="pt-1 text-[8px] text-slate-400">
                Dicetak: {formatDate(new Date().toISOString(), true)} via PLIS
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions (Hidden when printing) */}
        <div className="p-3 bg-white border-t border-slate-200 shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2 print:hidden text-xs">
          {/* Print Dialog */}
          <button
            onClick={handleBrowserPrint}
            className="py-2.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Dialog</span>
          </button>

          {/* WhatsApp Direct */}
          <button
            onClick={handleShareWhatsApp}
            className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition shadow-xs"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Kirim WA</span>
          </button>

          {/* Bluetooth Print */}
          <button
            onClick={handleBluetoothPrint}
            disabled={isBluetoothPrinting}
            className="py-2.5 px-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition shadow-xs"
          >
            <Bluetooth className="w-3.5 h-3.5" />
            <span>{isBluetoothPrinting ? 'Mengirim...' : 'BT Thermal'}</span>
          </button>

          {/* Copy Text */}
          <button
            onClick={handleCopyText}
            className="py-2.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-1.5 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Tersalin!' : 'Salin Teks'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
