import { useEffect, useState } from 'react';
import { supabase, RolePermission, UserRole, PageName } from '../lib/supabase';
import { Shield, Check, X } from 'lucide-react';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'branch_manager', label: 'Branch Manager' },
  { value: 'coach', label: 'Coach' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'stock_manager', label: 'Stock Manager' },
];

const PAGES: { value: PageName; label: string }[] = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'students', label: 'Students' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'packages', label: 'Packages' },
  { value: 'schemes', label: 'Schemes' },
  { value: 'branches', label: 'Branches' },
  { value: 'stock', label: 'Stock' },
  { value: 'sales', label: 'Sales' },
  { value: 'invoices', label: 'Invoices' },
  { value: 'reports', label: 'Reports' },
  { value: 'users', label: 'Users' },
  { value: 'settings', label: 'Settings' },
];

export default function PermissionsManager() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('branch_manager');
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPermissions();
  }, [selectedRole]);

  async function loadPermissions() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', selectedRole)
        .order('page');

      if (error) throw error;
      setPermissions((data as RolePermission[]) || []);
    } catch (error) {
      console.error('Error loading permissions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updatePermission(
    page: PageName,
    field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete',
    value: boolean
  ) {
    try {
      setSaving(true);

      const permission = permissions.find((p) => p.page === page);
      if (!permission) {
        console.error('Permission not found for page:', page);
        return;
      }

      const { error } = await supabase
        .from('role_permissions')
        .update({
          [field]: value,
          updated_at: new Date().toISOString()
        })
        .eq('id', permission.id);

      if (error) throw error;

      setPermissions(
        permissions.map((p) =>
          p.page === page ? { ...p, [field]: value } : p
        )
      );
    } catch (error) {
      console.error('Error updating permission:', error);
      alert('Error updating permission');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading permissions...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-6 h-6 text-red-700" />
        <h2 className="text-xl font-bold text-gray-900">Role Permissions</h2>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Role to Manage
        </label>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as UserRole)}
          className="w-full max-w-xs px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
        >
          {ROLES.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200">
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">
                Page/Section
              </th>
              <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">
                View
              </th>
              <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">
                Create
              </th>
              <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">
                Edit
              </th>
              <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">
                Delete
              </th>
            </tr>
          </thead>
          <tbody>
            {PAGES.map((page) => {
              const permission = permissions.find((p) => p.page === page.value);
              if (!permission) return null;

              return (
                <tr key={page.value} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {page.label}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        updatePermission(
                          page.value,
                          'can_view',
                          !permission.can_view
                        )
                      }
                      className={`p-2 rounded-lg transition ${
                        permission.can_view
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      } disabled:opacity-50`}
                    >
                      {permission.can_view ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <X className="w-5 h-5" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      disabled={saving || !permission.can_view}
                      onClick={() =>
                        updatePermission(
                          page.value,
                          'can_create',
                          !permission.can_create
                        )
                      }
                      className={`p-2 rounded-lg transition ${
                        permission.can_create
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      } disabled:opacity-30`}
                    >
                      {permission.can_create ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <X className="w-5 h-5" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      disabled={saving || !permission.can_view}
                      onClick={() =>
                        updatePermission(
                          page.value,
                          'can_edit',
                          !permission.can_edit
                        )
                      }
                      className={`p-2 rounded-lg transition ${
                        permission.can_edit
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      } disabled:opacity-30`}
                    >
                      {permission.can_edit ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <X className="w-5 h-5" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      disabled={saving || !permission.can_view}
                      onClick={() =>
                        updatePermission(
                          page.value,
                          'can_delete',
                          !permission.can_delete
                        )
                      }
                      className={`p-2 rounded-lg transition ${
                        permission.can_delete
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      } disabled:opacity-30`}
                    >
                      {permission.can_delete ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <X className="w-5 h-5" />
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Super Admin has full access to all pages and cannot be modified.
          Toggle permissions for other roles by clicking the checkmark/cross buttons. Create, Edit, and Delete permissions require View permission to be enabled.
        </p>
      </div>
    </div>
  );
}
