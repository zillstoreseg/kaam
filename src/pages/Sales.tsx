import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Student, StockItem, Invoice, InvoiceItem, Settings as SettingsType, Branch } from '../lib/supabase';
import { Plus, X, Printer, Search, Send, ShoppingCart, Trash2, FileText } from 'lucide-react';

interface CartItem {
  stock_item: StockItem;
  quantity: number;
  custom_price?: number;
}

interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[];
  branch?: Branch;
  customer?: Student;
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

export default function Sales() {
  const { profile } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [customCustomer, setCustomCustomer] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'installment'>('cash');
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recentInvoices, setRecentInvoices] = useState<InvoiceWithItems[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithItems | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const VAT_RATE = 5;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (profile?.branch_id) {
      setSelectedBranch(profile.branch_id);
    }
  }, [profile]);

  async function loadData() {
    try {
      const [studentsRes, itemsRes, settingsRes, invoicesRes, branchesRes] = await Promise.all([
        supabase.from('students').select('*').eq('is_active', true).order('full_name'),
        supabase.from('stock_items').select('*').eq('is_active', true).order('name'),
        supabase.from('settings').select('*').limit(1).single(),
        supabase.from('invoices').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('branches').select('*'),
      ]);

      if (studentsRes.data) setStudents(studentsRes.data as Student[]);
      if (itemsRes.data) setStockItems(itemsRes.data as StockItem[]);
      if (settingsRes.data) setSettings(settingsRes.data as SettingsType);
      if (branchesRes.data) setBranches(branchesRes.data as Branch[]);

      if (invoicesRes.data) {
        const invoicesWithDetails = await Promise.all(
          (invoicesRes.data as Invoice[]).map(async (invoice) => {
            const [itemsRes, studentRes] = await Promise.all([
              supabase.from('invoice_items').select('*').eq('invoice_id', invoice.id),
              invoice.customer_id
                ? supabase.from('students').select('*').eq('id', invoice.customer_id).single()
                : Promise.resolve({ data: null }),
            ]);

            const branch = (branchesRes.data as Branch[])?.find(b => b.id === invoice.branch_id);

            return {
              ...invoice,
              items: (itemsRes.data as InvoiceItem[]) || [],
              customer: studentRes.data as Student | undefined,
              branch,
            };
          })
        );
        setRecentInvoices(invoicesWithDetails);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredItems = stockItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function addToCart(item: StockItem) {
    const existing = cart.find((c) => c.stock_item.id === item.id);
    if (existing) {
      if (existing.quantity >= item.quantity) {
        alert('Cannot add more than available stock');
        return;
      }
      setCart(cart.map((c) => (c.stock_item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)));
    } else {
      setCart([...cart, { stock_item: item, quantity: 1 }]);
    }
  }

  function updateQuantity(itemId: string, quantity: number) {
    const item = cart.find((c) => c.stock_item.id === itemId);
    if (!item) return;

    if (quantity <= 0) {
      setCart(cart.filter((c) => c.stock_item.id !== itemId));
      return;
    }

    if (quantity > item.stock_item.quantity) {
      alert('Cannot exceed available stock');
      return;
    }

    setCart(cart.map((c) => (c.stock_item.id === itemId ? { ...c, quantity } : c)));
  }

  function updatePrice(itemId: string, price: number) {
    setCart(cart.map((c) => (c.stock_item.id === itemId ? { ...c, custom_price: price } : c)));
  }

  function removeFromCart(itemId: string) {
    setCart(cart.filter((c) => c.stock_item.id !== itemId));
  }

  function calculateTotals() {
    const subtotal = cart.reduce((sum, item) => {
      const price = item.custom_price !== undefined ? item.custom_price : item.stock_item.price;
      return sum + price * item.quantity;
    }, 0);
    const vatAmount = (subtotal * VAT_RATE) / 100;
    const total = subtotal + vatAmount;
    return { subtotal, vatAmount, total };
  }

  async function handleCreateInvoice() {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    if (!selectedStudent && (!customCustomer.name || !customCustomer.phone)) {
      alert('Please select a student or enter customer details');
      return;
    }

    const branchId = profile?.branch_id || selectedBranch;

    if (!branchId) {
      alert('Please select a branch');
      return;
    }

    setSaving(true);
    try {
      const invoiceNumber = `INV-${Date.now()}`;
      const { subtotal, vatAmount, total } = calculateTotals();

      const invoiceData = {
        invoice_number: invoiceNumber,
        branch_id: branchId,
        customer_id: selectedStudent?.id || null,
        customer_name: selectedStudent?.full_name || customCustomer.name,
        customer_phone: selectedStudent?.phone1 || customCustomer.phone,
        customer_email: customCustomer.email || null,
        subtotal,
        vat_rate: VAT_RATE,
        vat_amount: vatAmount,
        total_amount: total,
        payment_method: paymentMethod,
        payment_status: 'paid',
        amount_paid: total,
        sold_by: profile?.id,
        notes,
        invoice_date: new Date().toISOString(),
      };

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const invoiceItems = cart.map((item) => {
        const price = item.custom_price !== undefined ? item.custom_price : item.stock_item.price;
        return {
          invoice_id: invoice.id,
          stock_item_id: item.stock_item.id,
          item_name: item.stock_item.name,
          item_description: item.stock_item.description,
          quantity: item.quantity,
          unit_price: price,
          total_price: price * item.quantity,
        };
      });

      const { error: itemsError } = await supabase.from('invoice_items').insert(invoiceItems);

      if (itemsError) throw itemsError;

      alert('Invoice created successfully!');

      setCart([]);
      setSelectedStudent(null);
      setCustomCustomer({ name: '', phone: '', email: '' });
      setNotes('');
      setPaymentMethod('cash');

      loadData();
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Error creating invoice');
    } finally {
      setSaving(false);
    }
  }

  function viewInvoice(invoice: InvoiceWithItems) {
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

  async function sendToWhatsApp() {
    if (!selectedInvoice) return;

    const phone = selectedInvoice.customer_phone;
    if (!phone) {
      alert('No phone number available');
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const message = `Invoice ${selectedInvoice.invoice_number}\nTotal: ${selectedInvoice.total_amount.toFixed(2)} AED\n\nThank you for your business!`;
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank');
  }

  const { subtotal, vatAmount, total } = calculateTotals();

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales & Invoicing</h1>
          <p className="text-gray-600">Create new sales invoices with automatic VAT calculation</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Invoice Information</h2>

          {!profile?.branch_id && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Branch *</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
              >
                <option value="">-- Select Branch --</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} - {branch.location}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Student</label>
            <select
              value={selectedStudent?.id || ''}
              onChange={(e) => {
                const student = students.find((s) => s.id === e.target.value);
                setSelectedStudent(student || null);
                if (student) {
                  setCustomCustomer({ name: '', phone: '', email: '' });
                }
              }}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
            >
              <option value="">-- Select Student or Enter Custom --</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name} - {student.phone1}
                </option>
              ))}
            </select>
          </div>

          {!selectedStudent && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  value={customCustomer.name}
                  onChange={(e) => setCustomCustomer({ ...customCustomer, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                  placeholder="Enter name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  value={customCustomer.phone}
                  onChange={(e) => setCustomCustomer({ ...customCustomer, phone: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                  placeholder="Enter phone"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={customCustomer.email}
                  onChange={(e) => setCustomCustomer({ ...customCustomer, email: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                  placeholder="Enter email"
                />
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Add Items</h2>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search items..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                disabled={item.quantity === 0}
                className={`p-4 border rounded-lg text-left hover:shadow-md transition ${
                  item.quantity === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:border-red-700'
                }`}
              >
                <div className="font-semibold text-gray-900">{item.name}</div>
                <div className="text-sm text-gray-600 mt-1">{item.price.toFixed(2)} AED</div>
                <div className="text-xs text-gray-500 mt-1">Stock: {item.quantity}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Invoices</h2>
          <div className="space-y-2">
            {recentInvoices.slice(0, 5).map((invoice) => (
              <div
                key={invoice.id}
                className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => viewInvoice(invoice)}
              >
                <div>
                  <div className="font-semibold">{invoice.invoice_number}</div>
                  <div className="text-sm text-gray-600">{invoice.customer_name}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">{invoice.total_amount.toFixed(2)} AED</div>
                  <div className="text-xs text-gray-500">{formatDateTime(invoice.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="w-6 h-6 text-red-700" />
            <h2 className="text-xl font-bold text-gray-900">Cart</h2>
          </div>

          {cart.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Cart is empty</p>
          ) : (
            <>
              <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                {cart.map((item) => {
                  const displayPrice = item.custom_price !== undefined ? item.custom_price : item.stock_item.price;
                  return (
                    <div key={item.stock_item.id} className="flex gap-3 p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{item.stock_item.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">Price:</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={displayPrice}
                            onChange={(e) => updatePrice(item.stock_item.id, parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border rounded text-sm"
                          />
                          <span className="text-xs text-gray-500">AED</span>
                          {displayPrice === 0 && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">FREE</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max={item.stock_item.quantity}
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.stock_item.id, parseInt(e.target.value))}
                          className="w-16 px-2 py-1 border rounded text-center"
                        />
                        <button
                          onClick={() => removeFromCart(item.stock_item.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{subtotal.toFixed(2)} {settings?.currency_symbol || 'AED'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>VAT ({VAT_RATE}%)</span>
                  <span>{vatAmount.toFixed(2)} {settings?.currency_symbol || 'AED'}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total</span>
                  <span className="text-green-600">{total.toFixed(2)} {settings?.currency_symbol || 'AED'}</span>
                </div>
                {total === 0 && (
                  <div className="text-center text-sm text-green-600 font-medium">
                    Free Invoice - No Payment Required
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="installment">Installment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                    placeholder="Add notes..."
                  />
                </div>

                <button
                  onClick={handleCreateInvoice}
                  disabled={saving}
                  className="w-full bg-red-700 text-white py-3 rounded-lg font-semibold hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white">
              <h2 className="text-2xl font-bold">Invoice Details</h2>
              <div className="flex gap-2">
                <button
                  onClick={printInvoice}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={sendToWhatsApp}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Send className="w-4 h-4" />
                  WhatsApp
                </button>
                <button onClick={() => setShowInvoiceModal(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div ref={printRef} className="p-8">
              <div className="mb-8 border-b-2 border-gray-900 pb-6">
                <div className="text-center">
                  {settings?.logo_url && (
                    <img src={settings.logo_url} alt="Logo" className="h-16 mx-auto mb-3" />
                  )}
                  <div className="text-3xl font-bold mb-1">{settings?.academy_name || 'Martial Arts Academy'}</div>
                  {settings?.company_slogan && (
                    <div className="text-sm italic text-gray-600 mb-3">{settings.company_slogan}</div>
                  )}
                </div>
                <div className="text-center text-sm text-gray-700 mt-4">
                  {settings?.company_address && <div>{settings.company_address}</div>}
                  {settings?.company_city && <div>{settings.company_city}, {settings?.company_country || 'UAE'}</div>}
                  <div className="mt-2">
                    {settings?.company_phone && <span>Tel: {settings.company_phone}</span>}
                    {settings?.company_email && <span className="ml-3">Email: {settings.company_email}</span>}
                  </div>
                  {settings?.tax_registration_number && (
                    <div className="mt-2 font-semibold">TRN: {settings.tax_registration_number}</div>
                  )}
                </div>
                <div className="text-center mt-4 text-lg font-bold text-red-700">TAX INVOICE</div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <div className="font-bold text-sm mb-2">BILL TO:</div>
                  <div className="text-sm">
                    <div className="font-semibold">{selectedInvoice.customer_name}</div>
                    <div>Phone: {selectedInvoice.customer_phone}</div>
                    {selectedInvoice.customer_email && <div>Email: {selectedInvoice.customer_email}</div>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm mb-2">INVOICE DETAILS:</div>
                  <div className="text-sm">
                    <div><span className="font-semibold">Invoice #:</span> {selectedInvoice.invoice_number}</div>
                    <div><span className="font-semibold">Date:</span> {formatDateTime(selectedInvoice.invoice_date)}</div>
                    <div><span className="font-semibold">Payment:</span> {selectedInvoice.payment_method.toUpperCase()}</div>
                  </div>
                </div>
              </div>

              <table className="w-full mb-8">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-3 text-left text-sm font-bold">#</th>
                    <th className="px-4 py-3 text-left text-sm font-bold">Item Description</th>
                    <th className="px-4 py-3 text-right text-sm font-bold">Qty</th>
                    <th className="px-4 py-3 text-right text-sm font-bold">Unit Price</th>
                    <th className="px-4 py-3 text-right text-sm font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items.map((item, index) => (
                    <tr key={item.id} className="border-b">
                      <td className="px-4 py-3 text-sm">{index + 1}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-semibold">{item.item_name}</div>
                        {item.item_description && <div className="text-gray-600 text-xs">{item.item_description}</div>}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-sm">{item.unit_price.toFixed(2)} AED</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold">{item.total_price.toFixed(2)} AED</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end mb-8">
                <div className="w-64">
                  <div className="flex justify-between py-2 text-sm">
                    <span>Subtotal:</span>
                    <span>{selectedInvoice.subtotal.toFixed(2)} AED</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm">
                    <span>VAT ({selectedInvoice.vat_rate}%):</span>
                    <span>{selectedInvoice.vat_amount.toFixed(2)} AED</span>
                  </div>
                  <div className="flex justify-between py-3 text-lg font-bold border-t-2 border-gray-900">
                    <span>Total Amount:</span>
                    <span>{selectedInvoice.total_amount.toFixed(2)} AED</span>
                  </div>
                </div>
              </div>

              {selectedInvoice.notes && (
                <div className="mb-6">
                  <div className="font-bold text-sm mb-1">Notes:</div>
                  <div className="text-sm text-gray-600">{selectedInvoice.notes}</div>
                </div>
              )}

              <div className="text-center text-xs text-gray-500 border-t pt-6">
                <div>Thank you for your business!</div>
                <div className="mt-2">This is a computer-generated invoice</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
