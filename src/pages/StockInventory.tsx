import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase, StockItem } from '../lib/supabase';
import { Calendar, FileDown, Package, Search, CheckCircle, AlertTriangle } from 'lucide-react';

interface StockCount {
  id: string;
  stock_item_id: string;
  count_date: string;
  system_quantity: number;
  actual_quantity: number;
  difference: number;
  notes: string;
  counted_by: string;
  created_at: string;
}

interface SalesRecord {
  invoice_date: string;
  customer_name: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export default function StockInventory() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState<'count' | 'sales'>('count');
  const [stockCounts, setStockCounts] = useState<StockCount[]>([]);
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCountModal, setShowCountModal] = useState(false);
  const [countForm, setCountForm] = useState({
    stock_item_id: '',
    actual_quantity: 0,
    notes: '',
  });

  useEffect(() => {
    loadData();
    setDefaultDates();
  }, []);

  function setDefaultDates() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }

  async function loadData() {
    try {
      const [itemsRes, countsRes] = await Promise.all([
        supabase.from('stock_items').select('*').eq('is_active', true).order('name'),
        supabase.from('stock_counts').select('*').order('count_date', { ascending: false }),
      ]);

      if (itemsRes.data) setStockItems(itemsRes.data);
      if (countsRes.data) setStockCounts(countsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadSalesReport() {
    if (!startDate || !endDate) {
      alert('Please select date range');
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from('invoice_items')
        .select(`
          quantity,
          unit_price,
          total_price,
          item_name,
          stock_item_id,
          invoice:invoices(customer_name, invoice_date)
        `)
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`)
        .order('created_at', { ascending: false });

      if (selectedItem !== 'all') {
        query = query.eq('stock_item_id', selectedItem);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formatted = (data as any[])?.map((item) => ({
        invoice_date: item.invoice?.invoice_date || '',
        customer_name: item.invoice?.customer_name || 'N/A',
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      })) || [];

      setSalesRecords(formatted);
    } catch (error) {
      console.error('Error loading sales:', error);
      alert('Error loading sales report');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveCount() {
    if (!countForm.stock_item_id || countForm.actual_quantity < 0) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const item = stockItems.find(i => i.id === countForm.stock_item_id);
      if (!item) return;

      const { error } = await supabase.from('stock_counts').insert({
        stock_item_id: countForm.stock_item_id,
        count_date: new Date().toISOString().split('T')[0],
        system_quantity: item.quantity,
        actual_quantity: countForm.actual_quantity,
        notes: countForm.notes,
        counted_by: profile?.id,
      });

      if (error) throw error;

      if (item.quantity !== countForm.actual_quantity) {
        const { error: updateError } = await supabase
          .from('stock_items')
          .update({ quantity: countForm.actual_quantity })
          .eq('id', countForm.stock_item_id);

        if (updateError) throw updateError;
      }

      alert('Stock count saved successfully!');
      setShowCountModal(false);
      setCountForm({ stock_item_id: '', actual_quantity: 0, notes: '' });
      loadData();
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Error: ${error?.message || 'Unknown error'}`);
    }
  }

  function exportToCSV(type: 'sales' | 'counts') {
    if (type === 'sales' && salesRecords.length === 0) {
      alert('No sales data to export');
      return;
    }

    if (type === 'counts' && stockCounts.length === 0) {
      alert('No stock count data to export');
      return;
    }

    let csv = '';
    let filename = '';

    if (type === 'sales') {
      csv = 'Date,Customer Name,Item Name,Quantity,Unit Price,Total Price\n';
      salesRecords.forEach((record) => {
        const date = new Date(record.invoice_date).toLocaleDateString();
        csv += `${date},"${record.customer_name}","${record.item_name}",${record.quantity},${record.unit_price},${record.total_price}\n`;
      });
      filename = `sales_report_${startDate}_to_${endDate}.csv`;
    } else {
      csv = 'Date,Item Name,System Qty,Actual Qty,Difference,Notes\n';
      const filtered = selectedItem === 'all'
        ? stockCounts
        : stockCounts.filter(c => c.stock_item_id === selectedItem);

      filtered.forEach((count) => {
        const item = stockItems.find(i => i.id === count.stock_item_id);
        const date = new Date(count.count_date).toLocaleDateString();
        csv += `${date},"${item?.name || 'Unknown'}",${count.system_quantity},${count.actual_quantity},${count.difference},"${count.notes || ''}"\n`;
      });
      filename = `stock_counts_${new Date().toISOString().split('T')[0]}.csv`;
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  const filteredCounts = selectedItem === 'all'
    ? stockCounts
    : stockCounts.filter(c => c.stock_item_id === selectedItem);

  const totalSalesQty = salesRecords.reduce((sum, r) => sum + r.quantity, 0);
  const totalSalesAmount = salesRecords.reduce((sum, r) => sum + Number(r.total_price), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('stockInventory.title')}</h1>
          <p className="text-gray-600 mt-1">{t('stockInventory.subtitle')}</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('count')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'count'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {t('stockInventory.stockCount')}
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'sales'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {t('stockInventory.salesReport')}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('stockInventory.item')}</label>
            <select
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">{t('stockInventory.allItems')}</option>
              {stockItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          {activeTab === 'sales' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('stockInventory.startDate')}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('stockInventory.endDate')}</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={loadSalesReport}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition"
                >
                  <Search className="w-4 h-4 inline mr-2" />
                  {t('stockInventory.loadReport')}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 mb-4">
          {activeTab === 'count' && (
            <button
              onClick={() => setShowCountModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition"
            >
              <Package className="w-4 h-4 inline mr-2" />
              {t('stockInventory.newStockCount')}
            </button>
          )}
          <button
            onClick={() => exportToCSV(activeTab === 'count' ? 'counts' : 'sales')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold transition"
          >
            <FileDown className="w-4 h-4 inline mr-2" />
            {t('stockInventory.exportCSV')}
          </button>
        </div>

        {activeTab === 'count' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Item</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">System Qty</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Actual Qty</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Difference</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Notes</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      No stock counts recorded yet
                    </td>
                  </tr>
                ) : (
                  filteredCounts.map((count) => {
                    const item = stockItems.find(i => i.id === count.stock_item_id);
                    const isMatch = count.difference === 0;
                    return (
                      <tr key={count.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {new Date(count.count_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm font-semibold text-gray-900">
                          {item?.name || 'Unknown'}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-gray-900">
                          {count.system_quantity}
                        </td>
                        <td className="py-3 px-4 text-sm text-right text-gray-900">
                          {count.actual_quantity}
                        </td>
                        <td className={`py-3 px-4 text-sm text-right font-semibold ${
                          count.difference > 0 ? 'text-green-600' : count.difference < 0 ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {count.difference > 0 ? '+' : ''}{count.difference}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {count.notes || '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isMatch ? (
                            <CheckCircle className="w-5 h-5 text-green-600 inline" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-yellow-600 inline" />
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div>
            {salesRecords.length > 0 && (
              <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600">Total Quantity Sold</div>
                  <div className="text-2xl font-bold text-gray-900">{totalSalesQty}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Total Sales Amount</div>
                  <div className="text-2xl font-bold text-gray-900">{totalSalesAmount.toFixed(2)} AED</div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Customer</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Item</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Quantity</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Unit Price</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {salesRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">
                        No sales data. Click "Load Report" to fetch data.
                      </td>
                    </tr>
                  ) : (
                    salesRecords.map((record, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {new Date(record.invoice_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">{record.customer_name}</td>
                        <td className="py-3 px-4 text-sm font-semibold text-gray-900">{record.item_name}</td>
                        <td className="py-3 px-4 text-sm text-right text-gray-900">{record.quantity}</td>
                        <td className="py-3 px-4 text-sm text-right text-gray-900">
                          {Number(record.unit_price).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900">
                          {Number(record.total_price).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showCountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Record Stock Count</h2>
              <button onClick={() => setShowCountModal(false)}>
                <Package className="w-6 h-6 text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Item *</label>
                <select
                  value={countForm.stock_item_id}
                  onChange={(e) => {
                    const item = stockItems.find(i => i.id === e.target.value);
                    setCountForm({
                      ...countForm,
                      stock_item_id: e.target.value,
                      actual_quantity: item?.quantity || 0,
                    });
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600"
                  required
                >
                  <option value="">Select item...</option>
                  {stockItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} (System: {item.quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Actual Quantity *</label>
                <input
                  type="number"
                  value={countForm.actual_quantity}
                  onChange={(e) => setCountForm({ ...countForm, actual_quantity: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600"
                  min="0"
                  required
                />
              </div>

              {countForm.stock_item_id && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">System Quantity</div>
                  <div className="text-lg font-bold text-gray-900">
                    {stockItems.find(i => i.id === countForm.stock_item_id)?.quantity || 0}
                  </div>
                  <div className="text-sm mt-1">
                    Difference:{' '}
                    <span className={`font-semibold ${
                      countForm.actual_quantity > (stockItems.find(i => i.id === countForm.stock_item_id)?.quantity || 0)
                        ? 'text-green-600'
                        : countForm.actual_quantity < (stockItems.find(i => i.id === countForm.stock_item_id)?.quantity || 0)
                        ? 'text-red-600'
                        : 'text-gray-900'
                    }`}>
                      {countForm.actual_quantity - (stockItems.find(i => i.id === countForm.stock_item_id)?.quantity || 0)}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                <textarea
                  value={countForm.notes}
                  onChange={(e) => setCountForm({ ...countForm, notes: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-600"
                  rows={3}
                  placeholder="Reason for difference, location checked, etc..."
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t">
              <button
                onClick={() => setShowCountModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCount}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition"
              >
                Save Count
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
