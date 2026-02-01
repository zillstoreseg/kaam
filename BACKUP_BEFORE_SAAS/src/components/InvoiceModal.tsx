import { X, Download, MessageCircle } from 'lucide-react';
import { Settings as SettingsType } from '../lib/supabase';

interface InvoiceData {
  invoice_number: string;
  invoice_date: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  items: {
    description: string;
    quantity: number;
    price: number;
    total: number;
  }[];
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  payment_method: string;
  notes?: string;
}

interface InvoiceModalProps {
  invoice: InvoiceData;
  settings: SettingsType | null;
  onClose: () => void;
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export default function InvoiceModal({ invoice, settings, onClose }: InvoiceModalProps) {
  const currencySymbol = settings?.currency_symbol || 'AED';

  function handlePrint() {
    window.print();
  }

  function handleWhatsApp() {
    const message = encodeURIComponent(
      `Invoice #${invoice.invoice_number}\n\n` +
      `Dear ${invoice.customer_name},\n\n` +
      `Thank you for your payment!\n\n` +
      `Invoice Details:\n` +
      `Invoice Number: ${invoice.invoice_number}\n` +
      `Date: ${formatDateTime(invoice.invoice_date)}\n` +
      `Amount: ${invoice.total_amount.toFixed(2)} ${currencySymbol}\n` +
      `Payment Method: ${invoice.payment_method}\n\n` +
      `${invoice.items.map(item => `${item.description}: ${item.total.toFixed(2)} ${currencySymbol}`).join('\n')}\n\n` +
      `${settings?.academy_name || 'Academy'}\n` +
      `${settings?.company_phone || ''}`
    );

    const phone = invoice.customer_phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[95vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 print:hidden">
          <h2 className="text-xl font-bold text-gray-900">Invoice Generated</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsApp}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Download className="w-4 h-4" />
              Print
            </button>
            <button onClick={onClose}>
              <X className="w-6 h-6 text-gray-600 hover:text-gray-900" />
            </button>
          </div>
        </div>

        <div className="p-8 overflow-y-auto max-h-[calc(95vh-80px)]" id="invoice-content">
          <div className="max-w-2xl mx-auto bg-white">
            <div className="border-b-2 border-gray-300 pb-6 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  {settings?.logo_url && (
                    <img src={settings.logo_url} alt="Logo" className="h-16 mb-2" />
                  )}
                  <h1 className="text-3xl font-bold text-gray-900">{settings?.academy_name || 'Academy'}</h1>
                  {settings?.company_slogan && (
                    <p className="text-sm text-gray-600 mt-1">{settings.company_slogan}</p>
                  )}
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-bold text-gray-900">INVOICE</h2>
                  <p className="text-lg font-semibold text-gray-700 mt-1">#{invoice.invoice_number}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    Date: {formatDateTime(invoice.invoice_date)}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">From:</h3>
                <div className="text-sm text-gray-900">
                  <p className="font-semibold">{settings?.academy_name}</p>
                  {settings?.company_address && <p>{settings.company_address}</p>}
                  {settings?.company_city && <p>{settings.company_city}</p>}
                  {settings?.company_country && <p>{settings.company_country}</p>}
                  {settings?.company_phone && <p>Phone: {settings.company_phone}</p>}
                  {settings?.company_email && <p>Email: {settings.company_email}</p>}
                  {settings?.tax_registration_number && (
                    <p className="mt-2">Tax ID: {settings.tax_registration_number}</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase mb-2">Bill To:</h3>
                <div className="text-sm text-gray-900">
                  <p className="font-semibold">{invoice.customer_name}</p>
                  <p>Phone: {invoice.customer_phone}</p>
                  {invoice.customer_email && <p>Email: {invoice.customer_email}</p>}
                </div>
              </div>
            </div>

            <div className="mb-8">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700 uppercase">Description</th>
                    <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700 uppercase">Qty</th>
                    <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700 uppercase">Price</th>
                    <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="py-3 px-2 text-sm text-gray-900">{item.description}</td>
                      <td className="text-right py-3 px-2 text-sm text-gray-900">{item.quantity}</td>
                      <td className="text-right py-3 px-2 text-sm text-gray-900">
                        {item.price.toFixed(2)} {currencySymbol}
                      </td>
                      <td className="text-right py-3 px-2 text-sm font-semibold text-gray-900">
                        {item.total.toFixed(2)} {currencySymbol}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mb-8">
              <div className="w-64">
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className="font-semibold text-gray-900">
                    {invoice.subtotal.toFixed(2)} {currencySymbol}
                  </span>
                </div>
                {invoice.vat_amount > 0 && (
                  <div className="flex justify-between py-2 text-sm border-t border-gray-200">
                    <span className="text-gray-700">VAT (5%):</span>
                    <span className="font-semibold text-gray-900">
                      {invoice.vat_amount.toFixed(2)} {currencySymbol}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-3 text-lg border-t-2 border-gray-300">
                  <span className="font-bold text-gray-900">Total:</span>
                  <span className="font-bold text-gray-900">
                    {invoice.total_amount.toFixed(2)} {currencySymbol}
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  <p>Payment Method: <span className="font-semibold capitalize">{invoice.payment_method}</span></p>
                </div>
              </div>
            </div>

            {invoice.notes && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-semibold text-gray-700 mb-1">Notes:</p>
                <p className="text-sm text-gray-600">{invoice.notes}</p>
              </div>
            )}

            {settings?.invoice_footer_text && (
              <div className="pt-6 border-t border-gray-300">
                <p className="text-xs text-gray-600 text-center">{settings.invoice_footer_text}</p>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-300 text-center">
              <p className="text-sm font-semibold text-gray-900">Thank you for your business!</p>
              {settings?.company_website && (
                <p className="text-xs text-gray-600 mt-1">{settings.company_website}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-content, #invoice-content * {
            visibility: visible;
          }
          #invoice-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
