import { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, X, User, Mail, Shield, Key } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  role: string;
  branch_id: string | null;
  created_at: string;
  email?: string;
}

interface Branch {
  id: string;
  name: string;
}

interface ExtendedProfile extends Profile {
  branch?: Branch;
}

export default function Users() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<ExtendedProfile[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<ExtendedProfile | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'coach' as 'super_admin' | 'branch_manager' | 'coach' | 'accountant' | 'stock_manager',
    branch_id: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`;
      const [usersRes, branchesRes] = await Promise.all([
        fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'list' }),
        }).then(r => r.json()),
        supabase.from('branches').select('id, name').order('name'),
      ]);

      if (usersRes.success && usersRes.users) {
        setUsers(usersRes.users as ExtendedProfile[]);
      }
      if (branchesRes.data) setBranches(branchesRes.data as Branch[]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingUser(null);
    setFormData({
      email: '',
      password: '',
      full_name: '',
      role: 'coach',
      branch_id: '',
    });
    setShowModal(true);
  }

  function openEditModal(user: ExtendedProfile) {
    setEditingUser(user);
    setFormData({
      email: user.email || '',
      password: '',
      full_name: user.full_name,
      role: user.role as 'super_admin' | 'branch_manager' | 'coach',
      branch_id: user.branch_id || '',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`;

      const payload = editingUser
        ? {
            action: 'update',
            user_id: editingUser.id,
            full_name: formData.full_name,
            role: formData.role,
            branch_id: formData.branch_id,
            ...(formData.password && { password: formData.password }),
          }
        : {
            action: 'create',
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name,
            role: formData.role,
            branch_id: formData.branch_id,
          };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save user');
      }

      setShowModal(false);
      loadData();
      alert(editingUser ? 'User updated successfully!' : 'User created successfully!');
    } catch (error: any) {
      console.error('Error saving user:', error);
      alert(`Error: ${error.message || 'Failed to save user'}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'delete', user_id: id }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete user');
      }

      loadData();
      alert('User deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert(`Error: ${error.message || 'Failed to delete user'}`);
    }
  }

  async function handleResetPassword(userId: string, userName: string) {
    const newPassword = prompt(`Enter new password for ${userName}:`);
    if (!newPassword) return;

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reset_password',
          user_id: userId,
          new_password: newPassword
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to reset password');
      }

      alert('Password reset successfully!');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      alert(`Error: ${error.message || 'Failed to reset password'}`);
    }
  }

  if (loading) return <div className="text-center py-12">{t('common.loading')}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition"
        >
          <Plus className="w-5 h-5" />
          Add User
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-red-700" />
                      </div>
                      <div className="font-medium text-gray-900">{user.full_name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      {user.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-gray-400" />
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'super_admin'
                            ? 'bg-purple-100 text-purple-800'
                            : user.role === 'branch_manager'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {user.role.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.branch?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit user"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleResetPassword(user.id, user.full_name)}
                        className="text-orange-600 hover:text-orange-900"
                        title="Reset password"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12 text-gray-500">No users found</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required={!editingUser}
                  disabled={!!editingUser}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent disabled:bg-gray-100"
                />
                {editingUser && (
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {editingUser ? '' : '*'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                  minLength={6}
                />
                {editingUser && (
                  <p className="text-xs text-gray-500 mt-1">Leave blank to keep current password</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as 'super_admin' | 'branch_manager' | 'coach',
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                >
                  <option value="coach">Coach</option>
                  <option value="branch_manager">Branch Manager</option>
                  <option value="accountant">Accountant</option>
                  <option value="stock_manager">Stock Manager</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              {!['super_admin', 'accountant'].includes(formData.role) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch {formData.role === 'branch_manager' ? '*' : ''}
                  </label>
                  <select
                    required={formData.role === 'branch_manager'}
                    value={formData.branch_id}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                  >
                    <option value="">No Branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-red-700 text-white py-2 rounded-lg font-semibold hover:bg-red-800 transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : t('common.save')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
