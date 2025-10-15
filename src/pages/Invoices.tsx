import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase, Invoice, InvoiceItem, Student, Branch, Settings as SettingsType } from '../lib/supabase';
import { FileText, Search, Filter, X, Printer, Download, Calendar } from 'lucide-react';

interface InvoiceWithDetails extends Invoice {
  items: InvoiceItem[];
  branch?: Branch;
  customer?: Student;
  sold_by_profile?: { full_name: string };
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

export default function Invoices() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithDetails | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [profile, filterBranch, filterPaymentMethod, filterPaymentStatus, filterDateFrom, filterDateTo]);

  async function loadData() {
    try {
      setLoading(true);

      let invoicesQuery = supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (profile?.role !== 'super_admin' && profile?.role !== 'accountant' && profile?.branch_id) {
        invoicesQuery = invoicesQuery.eq('branch_id', profile.branch_id);
      }

      if (filterBranch) {
        invoicesQuery = invoicesQuery.eq('branch_id', filterBranch);
      }

      if (filterPaymentMethod) {
        invoicesQuery = invoicesQuery.eq('payment_method', filterPaymentMethod);
      }

      if (filterPaymentStatus) {
        invoicesQuery = invoicesQuery.eq('payment_status', filterPaymentStatus);
      }

      if (filterDateFrom) {
        invoicesQuery = invoicesQuery.gte('invoice_date', filterDateFrom);
      }

      if (filterDateTo) {
        invoicesQuery = invoicesQuery.lte('invoice_date', filterDateTo);
      }

      const { data: invoicesData, error: invoicesError } = await invoicesQuery;
      if (invoicesError) throw invoicesError;

      const [branchesRes, settingsRes] = await Promise.all([
        supabase.from('branches').select('*'),
        supabase.from('settings').select('*').maybeSingle(),
      ]);

      if (branchesRes.data) setBranches(branchesRes.data as Branch[]);
      if (settingsRes.data) setSettings(settingsRes.data as SettingsType);

      if (invoicesData) {
        const invoicesWithDetails = await Promise.all(
          (invoicesData as Invoice[]).map(async (invoice) => {
            const [itemsRes, customerRes, soldByRes] = await Promise.all([
              supabase.from('invoice_items').select('*').eq('invoice_id', invoice.id),
              invoice.customer_id
                ? supabase.from('students').select('*').eq('id', invoice.customer_id).maybeSingle()
                : Promise.resolve({ data: null }),
              supabase.from('profiles').select('full_name').eq('id', invoice.sold_by).maybeSingle(),
            ]);

            const branch = branchesRes.data?.find((b: Branch) => b.id === invoice.branch_id);

            return {
              ...invoice,
              items: (itemsRes.data as InvoiceItem[]) || [],
              customer: customerRes.data as Student | undefined,
              branch,
              sold_by_profile: soldByRes.data as { full_name: string } | undefined,
            };
          })
        );
        setInvoices(invoicesWithDetails);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  }

  function viewInvoice(invoice: InvoiceWithDetails) {
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
  }

  function printInvoice() {
    if (!selectedInvoice) return;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const currencySymbol = settings?.currency_symbol || 'AED';

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${selectedInvoice.invoice_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
            .invoice-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .logo { max-height: 80px; margin-bottom: 15px; }
            .company-name { font-size: 28px; font-weight: bold; margin-bottom: 8px; }
            .company-slogan { font-size: 14px; font-style: italic; color: #666; margin-bottom: 15px; }
            .company-details { font-size: 12px; color: #333; line-height: 1.8; }
            .tax-invoice { font-size: 20px; font-weight: bold; color: #b91c1c; margin-top: 15px; }
            .invoice-info { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin: 30px 0; }
            .info-section { font-size: 13px; }
            .info-title { font-weight: bold; margin-bottom: 8px; font-size: 14px; }
            .info-right { text-align: right; }
            table { width: 100%; border-collapse: collapse; margin: 30px 0; }
            thead { background-color: #f5f5f5; }
            th { padding: 12px; text-align: left; font-weight: bold; border-bottom: 2px solid #000; font-size: 13px; }
            td { padding: 10px 12px; border-bottom: 1px solid #ddd; font-size: 13px; }
            .text-right { text-align: right; }
            .item-desc { font-weight: 600; }
            .item-detail { font-size: 11px; color: #666; margin-top: 2px; }
            .totals-section { float: right; width: 300px; margin-top: 20px; }
            .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; }
            .grand-total { font-size: 18px; font-weight: bold; border-top: 2px solid #000; padding-top: 12px; margin-top: 8px; }
            .notes { margin: 30px 0; font-size: 13px; }
            .notes-title { font-weight: bold; margin-bottom: 5px; }
            .notes-content { color: #666; }
            .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
            @media print {
              body { padding: 20px; }
              @page { margin: 0.5cm; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            ${settings?.logo_url ? `<img src="${settings.logo_url}" alt="Logo" class="logo" />` : ''}
            <div class="company-name">${settings?.academy_name || 'Martial Arts Academy'}</div>
            ${settings?.company_slogan ? `<div class="company-slogan">${settings.company_slogan}</div>` : ''}
            <div class="company-details">
              ${settings?.company_address ? `<div>${settings.company_address}</div>` : ''}
              ${settings?.company_city ? `<div>${settings.company_city}, ${settings?.company_country || 'UAE'}</div>` : ''}
              <div style="margin-top: 8px;">
                ${settings?.company_phone ? `Tel: ${settings.company_phone}` : ''}
                ${settings?.company_email ? `<span style="margin-left: 15px;">Email: ${settings.company_email}</span>` : ''}
              </div>
              ${settings?.tax_registration_number ? `<div style="margin-top: 8px; font-weight: bold;">TRN: ${settings.tax_registration_number}</div>` : ''}
            </div>
            <div class="tax-invoice">TAX INVOICE</div>
          </div>

          <div class="invoice-info">
            <div class="info-section">
              <div class="info-title">BILL TO:</div>
              <div style="font-weight: 600;">${selectedInvoice.customer_name}</div>
              <div>Phone: ${selectedInvoice.customer_phone}</div>
              ${selectedInvoice.customer_email ? `<div>Email: ${selectedInvoice.customer_email}</div>` : ''}
            </div>
            <div class="info-section info-right">
              <div class="info-title">INVOICE DETAILS:</div>
              <div><strong>Invoice #:</strong> ${selectedInvoice.invoice_number}</div>
              <div><strong>Date:</strong> ${formatDateTime(selectedInvoice.invoice_date)}</div>
              <div><strong>Payment:</strong> ${selectedInvoice.payment_method.toUpperCase()}</div>
              ${selectedInvoice.branch ? `<div><strong>Branch:</strong> ${selectedInvoice.branch.name}</div>` : ''}
              ${selectedInvoice.sold_by_profile ? `<div><strong>Sold By:</strong> ${selectedInvoice.sold_by_profile.full_name}</div>` : ''}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th>Item Description</th>
                <th class="text-right" style="width: 80px;">Qty</th>
                <th class="text-right" style="width: 120px;">Unit Price</th>
                <th class="text-right" style="width: 120px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${selectedInvoice.items.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>
                    <div class="item-desc">${item.item_name}</div>
                    ${item.item_description ? `<div class="item-detail">${item.item_description}</div>` : ''}
                  </td>
                  <td class="text-right">${item.quantity}</td>
                  <td class="text-right">${item.unit_price.toFixed(2)} ${currencySymbol}</td>
                  <td class="text-right" style="font-weight: 600;">${item.total_price.toFixed(2)} ${currencySymbol}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${selectedInvoice.subtotal.toFixed(2)} ${currencySymbol}</span>
            </div>
            <div class="total-row">
              <span>VAT (${selectedInvoice.vat_rate}%):</span>
              <span>${selectedInvoice.vat_amount.toFixed(2)} ${currencySymbol}</span>
            </div>
            <div class="total-row grand-total">
              <span>Total Amount:</span>
              <span>${selectedInvoice.total_amount.toFixed(2)} ${currencySymbol}</span>
            </div>
            <div class="total-row" style="border-top: 1px solid #ddd; margin-top: 8px; padding-top: 8px;">
              <span>Amount Paid:</span>
              <span style="color: ${selectedInvoice.amount_paid >= selectedInvoice.total_amount ? '#16a34a' : '#dc2626'};">${selectedInvoice.amount_paid.toFixed(2)} ${currencySymbol}</span>
            </div>
            ${selectedInvoice.amount_paid < selectedInvoice.total_amount ? `
              <div class="total-row" style="color: #dc2626;">
                <span>Balance Due:</span>
                <span>${(selectedInvoice.total_amount - selectedInvoice.amount_paid).toFixed(2)} ${currencySymbol}</span>
              </div>
            ` : ''}
          </div>

          <div style="clear: both;"></div>

          ${selectedInvoice.notes ? `
            <div class="notes">
              <div class="notes-title">Notes:</div>
              <div class="notes-content">${selectedInvoice.notes}</div>
            </div>
          ` : ''}

          <div class="footer">
            <div>Thank you for your business!</div>
            <div style="margin-top: 8px;">This is a computer-generated invoice</div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }

  async function exportToExcel() {
    try {
      const csvRows = [
        [
          'Invoice Number',
          'Date',
          'Branch',
          'Customer',
          'Customer Phone',
          'Items',
          'Subtotal',
          'VAT',
          'Total',
          'Payment Method',
          'Payment Status',
          'Amount Paid',
          'Sold By',
          'Notes',
        ],
      ];

      invoices.forEach((invoice) => {
        const items = invoice.items.map((item) => `${item.item_name} (${item.quantity})`).join('; ');
        csvRows.push([
          invoice.invoice_number,
          formatDateTime(invoice.invoice_date),
          invoice.branch?.name || '',
          invoice.customer_name,
          invoice.customer_phone || '',
          items,
          invoice.subtotal.toString(),
          invoice.vat_amount.toString(),
          invoice.total_amount.toString(),
          invoice.payment_method,
          invoice.payment_status,
          invoice.amount_paid.toString(),
          invoice.sold_by_profile?.full_name || '',
          invoice.notes || '',
        ]);
      });

      const csvContent = csvRows
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `invoices_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert('Invoices exported successfully!');
    } catch (error) {
      console.error('Error exporting invoices:', error);
      alert('Error exporting invoices');
    }
  }

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer_phone?.includes(searchTerm);
    return matchesSearch;
  });

  const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
  const totalPaid = filteredInvoices.reduce((sum, inv) => sum + Number(inv.amount_paid), 0);
  const totalPending = totalRevenue - totalPaid;

  if (loading) {
    return <div className="text-center py-12">{t('common.loading')}</div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{t('invoices.title')}</h1>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
        >
          <Download className="w-5 h-5" />
          {t('common.export')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">{t('invoices.totalRevenue')}</h3>
          <p className="text-2xl font-bold text-gray-900">
            {settings?.currency_symbol || 'SAR'} {totalRevenue.toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">{t('invoices.totalPaid')}</h3>
          <p className="text-2xl font-bold text-green-600">
            {settings?.currency_symbol || 'SAR'} {totalPaid.toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">{t('invoices.totalPending')}</h3>
          <p className="text-2xl font-bold text-orange-600">
            {settings?.currency_symbol || 'SAR'} {totalPending.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('invoices.search')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
            />
          </div>

          {(profile?.role === 'super_admin' || profile?.role === 'accountant') && (
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
            >
              <option value="">{t('invoices.allBranches')}</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={filterPaymentMethod}
            onChange={(e) => setFilterPaymentMethod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
          >
            <option value="">{t('invoices.allPaymentMethods')}</option>
            <option value="cash">{t('sales.cash')}</option>
            <option value="card">{t('sales.card')}</option>
            <option value="installment">{t('sales.installment')}</option>
          </select>

          <select
            value={filterPaymentStatus}
            onChange={(e) => setFilterPaymentStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
          >
            <option value="">{t('invoices.allStatuses')}</option>
            <option value="paid">{t('sales.paid')}</option>
            <option value="pending">{t('sales.pending')}</option>
            <option value="partial">{t('sales.partial')}</option>
          </select>

          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            placeholder={t('invoices.dateFrom')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
          />

          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            placeholder={t('invoices.dateTo')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('invoices.invoiceNumber')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('invoices.date')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('invoices.customer')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('invoices.branch')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('invoices.total')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('invoices.paymentMethod')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('invoices.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDateTime(invoice.invoice_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div>{invoice.customer_name}</div>
                    <div className="text-xs text-gray-500">{invoice.customer_phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {invoice.branch?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {settings?.currency_symbol || 'SAR'} {Number(invoice.total_amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <span className="capitalize">{t(`sales.${invoice.payment_method}`)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        invoice.payment_status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : invoice.payment_status === 'partial'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      {t(`sales.${invoice.payment_status}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => viewInvoice(invoice)}
                      className="text-red-700 hover:text-red-900 font-medium"
                    >
                      {t('common.view')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredInvoices.length === 0 && (
            <div className="text-center py-12 text-gray-500">{t('invoices.noInvoices')}</div>
          )}
        </div>
      </div>

      {showInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold">{t('invoices.invoiceDetails')}</h2>
              <div className="flex gap-2">
                <button
                  onClick={printInvoice}
                  className="p-2 text-red-700 hover:bg-red-50 rounded-lg transition"
                >
                  <Printer className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div ref={printRef} className="p-6">
              <div className="flex justify-between items-start mb-8">
                <div>
                  {settings?.logo_url && <img src={settings.logo_url} alt="Logo" className="h-16 mb-4" />}
                  <h3 className="text-xl font-bold">{settings?.academy_name || 'Academy'}</h3>
                  <p className="text-sm text-gray-600">{settings?.company_address}</p>
                  <p className="text-sm text-gray-600">{settings?.company_phone}</p>
                  <p className="text-sm text-gray-600">{settings?.company_email}</p>
                  {settings?.tax_registration_number && (
                    <p className="text-sm text-gray-600">{t('settings.taxNumber')}: {settings.tax_registration_number}</p>
                  )}
                </div>
                <div className="text-right">
                  <h4 className="text-2xl font-bold text-red-700">{t('invoices.invoice')}</h4>
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-medium">{t('invoices.invoiceNumber')}:</span> {selectedInvoice.invoice_number}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">{t('invoices.date')}:</span>{' '}
                    {formatDateTime(selectedInvoice.invoice_date)}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">{t('invoices.branch')}:</span> {selectedInvoice.branch?.name}
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <h4 className="font-bold mb-2">{t('invoices.billTo')}:</h4>
                <p className="text-gray-700">{selectedInvoice.customer_name}</p>
                {selectedInvoice.customer_phone && <p className="text-gray-600">{selectedInvoice.customer_phone}</p>}
                {selectedInvoice.customer_email && <p className="text-gray-600">{selectedInvoice.customer_email}</p>}
              </div>

              <table className="w-full mb-8">
                <thead className="border-b-2 border-gray-300">
                  <tr>
                    <th className="text-left py-2">{t('invoices.item')}</th>
                    <th className="text-right py-2">{t('invoices.quantity')}</th>
                    <th className="text-right py-2">{t('invoices.unitPrice')}</th>
                    <th className="text-right py-2">{t('invoices.total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items.map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-3">{item.item_name}</td>
                      <td className="text-right">{item.quantity}</td>
                      <td className="text-right">
                        {settings?.currency_symbol || 'SAR'} {Number(item.unit_price).toFixed(2)}
                      </td>
                      <td className="text-right">
                        {settings?.currency_symbol || 'SAR'} {Number(item.total_price).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end mb-8">
                <div className="w-64">
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">{t('invoices.subtotal')}:</span>
                    <span className="font-medium">
                      {settings?.currency_symbol || 'SAR'} {Number(selectedInvoice.subtotal).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">{t('invoices.vat')} ({selectedInvoice.vat_rate}%):</span>
                    <span className="font-medium">
                      {settings?.currency_symbol || 'SAR'} {Number(selectedInvoice.vat_amount).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-t-2 border-gray-300 text-lg font-bold">
                    <span>{t('invoices.total')}:</span>
                    <span>
                      {settings?.currency_symbol || 'SAR'} {Number(selectedInvoice.total_amount).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">{t('invoices.paymentMethod')}:</span>
                    <span className="font-medium capitalize">{t(`sales.${selectedInvoice.payment_method}`)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">{t('invoices.paymentStatus')}:</span>
                    <span className="font-medium capitalize">{t(`sales.${selectedInvoice.payment_status}`)}</span>
                  </div>
                  {selectedInvoice.amount_paid > 0 && (
                    <div className="flex justify-between py-2 text-green-600">
                      <span>{t('invoices.amountPaid')}:</span>
                      <span className="font-medium">
                        {settings?.currency_symbol || 'SAR'} {Number(selectedInvoice.amount_paid).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {selectedInvoice.notes && (
                <div className="mb-4">
                  <h4 className="font-bold mb-2">{t('common.notes')}:</h4>
                  <p className="text-gray-600">{selectedInvoice.notes}</p>
                </div>
              )}

              <div className="text-center text-sm text-gray-500 mt-8 pt-4 border-t">
                {settings?.invoice_footer_text && <p className="mb-2">{settings.invoice_footer_text}</p>}
                {!settings?.invoice_footer_text && <p>{t('invoices.thankYou')}</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
