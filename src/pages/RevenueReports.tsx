import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { DollarSign, TrendingUp, Package, RefreshCw, ShoppingCart, Calendar, Receipt, Banknote } from 'lucide-react';

interface RevenueData {
  total: number;
  totalVAT: number;
  totalProfit: number;
  subscriptions: number;
  renewals: number;
  sales: number;
  byScheme: { [key: string]: number };
  byItem: { [key: string]: number };
}

export default function RevenueReports() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('month');
  const [revenueData, setRevenueData] = useState<RevenueData>({
    total: 0,
    totalVAT: 0,
    totalProfit: 0,
    subscriptions: 0,
    renewals: 0,
    sales: 0,
    byScheme: {},
    byItem: {},
  });

  useEffect(() => {
    loadRevenueData();
  }, [period, profile]);

  async function loadRevenueData() {
    try {
      setLoading(true);

      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'day':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(0);
      }

      let query = supabase
        .from('invoices')
        .select(`
          *,
          invoice_items(*),
          scheme:schemes(name)
        `);

      if (profile?.role === 'branch_manager') {
        query = query.eq('branch_id', profile.branch_id);
      }

      if (period !== 'all') {
        query = query.gte('invoice_date', startDate.toISOString());
      }

      const { data: invoices } = await query;

      if (!invoices) {
        setRevenueData({
          total: 0,
          totalVAT: 0,
          totalProfit: 0,
          subscriptions: 0,
          renewals: 0,
          sales: 0,
          byScheme: {},
          byItem: {},
        });
        return;
      }

      const byScheme: { [key: string]: number } = {};
      const byItem: { [key: string]: number } = {};
      let subscriptions = 0;
      let renewals = 0;
      let sales = 0;
      let totalVAT = 0;

      invoices.forEach((invoice: any) => {
        const amount = parseFloat(invoice.total_amount) || 0;
        const vatAmount = parseFloat(invoice.vat_amount) || 0;

        totalVAT += vatAmount;

        if (invoice.invoice_type === 'subscription' || invoice.description?.toLowerCase().includes('membership')) {
          subscriptions += amount;
        } else if (invoice.invoice_type === 'renewal' || invoice.description?.toLowerCase().includes('renewal')) {
          renewals += amount;
        } else {
          sales += amount;
        }

        if (invoice.scheme?.name) {
          byScheme[invoice.scheme.name] = (byScheme[invoice.scheme.name] || 0) + amount;
        }

        invoice.invoice_items?.forEach((item: any) => {
          const itemName = item.item_name || item.item_description || 'Unknown Item';
          const itemTotal = parseFloat(item.total_price) || 0;
          byItem[itemName] = (byItem[itemName] || 0) + itemTotal;
        });
      });

      const total = invoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.total_amount || 0), 0);
      const totalProfit = total - totalVAT;

      setRevenueData({
        total,
        totalVAT,
        totalProfit,
        subscriptions,
        renewals,
        sales,
        byScheme,
        byItem,
      });
    } catch (error) {
      console.error('Error loading revenue data:', error);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
    }).format(amount);
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'day': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'year': return 'This Year';
      case 'all': return 'All Time';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-600">Loading revenue data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Revenue Reports</h1>
          <p className="text-gray-600 mt-1">Comprehensive revenue breakdown and analytics</p>
        </div>
        <button
          onClick={loadRevenueData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-gray-700">Period:</span>
          <div className="flex gap-2">
            {['day', 'week', 'month', 'year', 'all'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p as any)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  period === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {p === 'day' ? 'Day' : p === 'week' ? 'Week' : p === 'month' ? 'Month' : p === 'year' ? 'Year' : 'All Time'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Total Revenue</h3>
            <DollarSign className="w-8 h-8 opacity-80" />
          </div>
          <p className="text-3xl font-bold">{formatCurrency(revenueData.total)}</p>
          <p className="text-sm opacity-90 mt-1">{getPeriodLabel()}</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Net Profit</h3>
            <TrendingUp className="w-8 h-8 opacity-80" />
          </div>
          <p className="text-3xl font-bold">{formatCurrency(revenueData.totalProfit)}</p>
          <p className="text-sm opacity-90 mt-1">Revenue excluding VAT</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Total VAT</h3>
            <Receipt className="w-8 h-8 opacity-80" />
          </div>
          <p className="text-3xl font-bold">{formatCurrency(revenueData.totalVAT)}</p>
          <p className="text-sm opacity-90 mt-1">Payable to government</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Subscriptions</h3>
            <Package className="w-8 h-8 opacity-80" />
          </div>
          <p className="text-3xl font-bold">{formatCurrency(revenueData.subscriptions)}</p>
          <p className="text-sm opacity-90 mt-1">New memberships</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Renewals</h3>
            <RefreshCw className="w-8 h-8 opacity-80" />
          </div>
          <p className="text-3xl font-bold">{formatCurrency(revenueData.renewals)}</p>
          <p className="text-sm opacity-90 mt-1">Package renewals</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Sales</h3>
            <ShoppingCart className="w-8 h-8 opacity-80" />
          </div>
          <p className="text-3xl font-bold">{formatCurrency(revenueData.sales)}</p>
          <p className="text-sm opacity-90 mt-1">Product sales</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Revenue by Scheme
          </h2>
          {Object.keys(revenueData.byScheme).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(revenueData.byScheme)
                .sort(([, a], [, b]) => b - a)
                .map(([scheme, amount]) => (
                  <div key={scheme} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">{scheme}</span>
                    <span className="text-lg font-bold text-blue-600">{formatCurrency(amount)}</span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No scheme data available</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-orange-600" />
            Revenue by Item
          </h2>
          {Object.keys(revenueData.byItem).length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {Object.entries(revenueData.byItem)
                .sort(([, a], [, b]) => b - a)
                .map(([item, amount]) => (
                  <div key={item} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">{item}</span>
                    <span className="text-lg font-bold text-orange-600">{formatCurrency(amount)}</span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No item data available</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Revenue Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 font-medium mb-1">Subscriptions</p>
            <p className="text-2xl font-bold text-green-600">
              {revenueData.total > 0 ? ((revenueData.subscriptions / revenueData.total) * 100).toFixed(1) : 0}%
            </p>
          </div>
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-sm text-purple-700 font-medium mb-1">Renewals</p>
            <p className="text-2xl font-bold text-purple-600">
              {revenueData.total > 0 ? ((revenueData.renewals / revenueData.total) * 100).toFixed(1) : 0}%
            </p>
          </div>
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-700 font-medium mb-1">Sales</p>
            <p className="text-2xl font-bold text-orange-600">
              {revenueData.total > 0 ? ((revenueData.sales / revenueData.total) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
