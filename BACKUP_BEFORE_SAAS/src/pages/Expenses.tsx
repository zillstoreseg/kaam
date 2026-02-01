import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Expense, Branch } from '../lib/supabase';
import { DollarSign, Plus, X, Calendar, Filter, Download, TrendingUp } from 'lucide-react';
import { logAudit, AuditActions, AuditEntityTypes, getChangedFields } from '../lib/auditLogger';

interface ExpenseWithDetails extends Expense {
  branch?: Branch;
  creator?: { full_name: string };
}

export default function Expenses() {
  const { profile } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingExpense, setEditingExpense] = useState<ExpenseWithDetails | null>(null);
  const [formData, setFormData] = useState({
    expense_date: new Date().toISOString().slice(0, 10),
    branch_id: '',
    category: 'other' as Expense['category'],
    amount: '',
    payment_method: 'cash' as Expense['payment_method'],
    notes: '',
  });

  const categories = [
    { value: 'rent', label: 'Rent' },
    { value: 'salaries', label: 'Salaries' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'other', label: 'Other' },
  ];

  useEffect(() => {
    loadData();
  }, [profile, selectedMonth, selectedBranch, selectedCategory]);

  async function loadData() {
    try {
      let expensesQuery = supabase
        .from('expenses')
        .select('*, branch:branches(*), creator:profiles!created_by(full_name)')
        .order('expense_date', { ascending: false });

      if (profile?.role !== 'super_admin' && profile?.branch_id) {
        expensesQuery = expensesQuery.eq('branch_id', profile.branch_id);
      }

      if (selectedMonth) {
        const startDate = `${selectedMonth}-01`;
        const endDate = new Date(selectedMonth + '-01');
        endDate.setMonth(endDate.getMonth() + 1);
        expensesQuery = expensesQuery
          .gte('expense_date', startDate)
          .lt('expense_date', endDate.toISOString().slice(0, 10));
      }

      if (selectedBranch !== 'all') {
        expensesQuery = expensesQuery.eq('branch_id', selectedBranch);
      }

      if (selectedCategory !== 'all') {
        expensesQuery = expensesQuery.eq('category', selectedCategory);
      }

      const [expensesRes, branchesRes] = await Promise.all([
        expensesQuery,
        supabase.from('branches').select('*').order('name'),
      ]);

      if (expensesRes.data) setExpenses(expensesRes.data as ExpenseWithDetails[]);
      if (branchesRes.data) setBranches(branchesRes.data as Branch[]);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount),
        created_by: profile?.id,
      };

      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update({ ...expenseData, updated_at: new Date().toISOString() })
          .eq('id', editingExpense.id);
        if (error) throw error;

        try {
          const changedFields = getChangedFields(editingExpense, expenseData);
          await logAudit(profile?.role || 'unknown', {
            action: AuditActions.UPDATE,
            entityType: AuditEntityTypes.EXPENSE,
            entityId: editingExpense.id,
            summaryKey: 'audit.expense.updated',
            summaryParams: {
              amount: expenseData.amount,
              category: expenseData.category,
            },
            beforeData: editingExpense,
            afterData: expenseData,
            branchId: expenseData.branch_id,
            metadata: { changedFields },
          });
        } catch (logError) {
          console.error('Failed to log expense update:', logError);
        }
      } else {
        const { data, error } = await supabase.from('expenses').insert([expenseData]).select().single();
        if (error) throw error;

        try {
          await logAudit(profile?.role || 'unknown', {
            action: AuditActions.CREATE,
            entityType: AuditEntityTypes.EXPENSE,
            entityId: data?.id,
            summaryKey: 'audit.expense.created',
            summaryParams: {
              amount: expenseData.amount,
              category: expenseData.category,
            },
            afterData: expenseData,
            branchId: expenseData.branch_id,
          });
        } catch (logError) {
          console.error('Failed to log expense creation:', logError);
        }
      }

      setShowModal(false);
      setEditingExpense(null);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error saving expense:', error);
      alert(`Error: ${error.message}`);
    }
  }

  function resetForm() {
    setFormData({
      expense_date: new Date().toISOString().slice(0, 10),
      branch_id: profile?.branch_id || '',
      category: 'other',
      amount: '',
      payment_method: 'cash',
      notes: '',
    });
  }

  function handleEdit(expense: ExpenseWithDetails) {
    setEditingExpense(expense);
    setFormData({
      expense_date: expense.expense_date,
      branch_id: expense.branch_id,
      category: expense.category,
      amount: expense.amount.toString(),
      payment_method: expense.payment_method,
      notes: expense.notes || '',
    });
    setShowModal(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const expenseToDelete = expenses.find(e => e.id === id);

      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;

      if (expenseToDelete) {
        try {
          await logAudit(profile?.role || 'unknown', {
            action: AuditActions.DELETE,
            entityType: AuditEntityTypes.EXPENSE,
            entityId: id,
            summaryKey: 'audit.expense.deleted',
            summaryParams: {
              amount: expenseToDelete.amount,
              category: expenseToDelete.category,
            },
            beforeData: expenseToDelete,
            branchId: expenseToDelete.branch_id,
          });
        } catch (logError) {
          console.error('Failed to log expense deletion:', logError);
        }
      }

      loadData();
    } catch (error: any) {
      console.error('Error deleting expense:', error);
      alert(`Error: ${error.message}`);
    }
  }

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const categoryBreakdown = categories.map((cat) => {
    const total = expenses
      .filter((exp) => exp.category === cat.value)
      .reduce((sum, exp) => sum + exp.amount, 0);
    return { ...cat, total };
  }).filter((cat) => cat.total > 0);

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-red-700 text-white px-6 py-2 rounded-lg hover:bg-red-800 transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Expense
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900">{totalExpenses.toFixed(2)} AED</p>
            </div>
            <DollarSign className="w-12 h-12 text-red-700" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{expenses.length}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg per Transaction</p>
              <p className="text-2xl font-bold text-gray-900">
                {expenses.length > 0 ? (totalExpenses / expenses.length).toFixed(2) : '0.00'} AED
              </p>
            </div>
            <Calendar className="w-12 h-12 text-green-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-4 mb-6 flex-wrap">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            />
          </div>

          {profile?.role === 'super_admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="all">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {categoryBreakdown.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold mb-4">Category Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categoryBreakdown.map((cat) => (
                <div key={cat.value} className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">{cat.label}</p>
                  <p className="text-lg font-bold text-gray-900">{cat.total.toFixed(2)} AED</p>
                  <p className="text-xs text-gray-500">
                    {((cat.total / totalExpenses) * 100).toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Payment</th>
                {profile?.role === 'super_admin' && (
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Branch</th>
                )}
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Notes</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td className="px-4 py-3">{expense.expense_date}</td>
                  <td className="px-4 py-3 capitalize">{expense.category.replace('_', ' ')}</td>
                  <td className="px-4 py-3 font-semibold">{expense.amount.toFixed(2)} AED</td>
                  <td className="px-4 py-3 capitalize">{expense.payment_method.replace('_', ' ')}</td>
                  {profile?.role === 'super_admin' && (
                    <td className="px-4 py-3">{expense.branch?.name}</td>
                  )}
                  <td className="px-4 py-3 text-sm text-gray-600">{expense.notes || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(expense)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold">{editingExpense ? 'Edit' : 'Add'} Expense</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              {profile?.role === 'super_admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch *</label>
                  <select
                    required
                    value={formData.branch_id}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="">Select Branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as Expense['category'] })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (AED) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
                <select
                  required
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as Expense['payment_method'] })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-red-700 text-white px-6 py-3 rounded-lg hover:bg-red-800 transition"
                >
                  {editingExpense ? 'Update' : 'Add'} Expense
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
