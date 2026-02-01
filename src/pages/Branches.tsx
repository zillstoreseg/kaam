import { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase, Branch } from '../lib/supabase';
import { Plus, Edit2, Trash2, X, MapPin, User } from 'lucide-react';
import { FeatureGate } from '../components/FeatureGate';
import { FEATURES } from '../lib/featureHelpers';

interface Profile {
  id: string;
  full_name: string;
  role: string;
}

interface ExtendedBranch extends Branch {
  manager?: Profile;
}

export default function Branches() {
  const { t } = useLanguage();
  const [branches, setBranches] = useState<ExtendedBranch[]>([]);
  const [managers, setManagers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({ name: '', location: '', manager_id: '' });

  useEffect(() => {
    loadBranches();
    loadManagers();
  }, []);

  async function loadBranches() {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select(`
          *,
          manager:profiles!branches_manager_id_fkey(id, full_name, role)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setBranches(data as ExtendedBranch[]);
    } catch (error) {
      console.error('Error loading branches:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadManagers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .in('role', ['branch_manager', 'coach'])
        .order('full_name');
      if (error) throw error;
      if (data) setManagers(data as Profile[]);
    } catch (error) {
      console.error('Error loading managers:', error);
    }
  }

  function openAddModal() {
    setEditingBranch(null);
    setFormData({ name: '', location: '', manager_id: '' });
    setShowModal(true);
  }

  function openEditModal(branch: ExtendedBranch) {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      location: branch.location,
      manager_id: branch.manager_id || ''
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingBranch) {
        const { error } = await supabase.from('branches').update(formData).eq('id', editingBranch.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('branches').insert([formData]);
        if (error) throw error;
      }
      setShowModal(false);
      loadBranches();
    } catch (error) {
      console.error('Error saving branch:', error);
      alert('Error saving branch');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure?')) return;
    try {
      const { error } = await supabase.from('branches').delete().eq('id', id);
      if (error) throw error;
      loadBranches();
    } catch (error) {
      console.error('Error deleting branch:', error);
      alert('Error deleting branch');
    }
  }

  if (loading) return <div className="text-center py-12">{t('common.loading')}</div>;

  return (
    <FeatureGate featureKey={FEATURES.BRANCHES}>
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{t('branches.title')}</h1>
        <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800">
          <Plus className="w-5 h-5" />
          {t('branches.add')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map((branch) => (
          <div key={branch.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{branch.name}</h3>
                <div className="flex items-center gap-2 mt-2 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{branch.location}</span>
                </div>
                {branch.manager && (
                  <div className="flex items-center gap-2 mt-2 text-gray-600">
                    <User className="w-4 h-4" />
                    <span className="text-sm">{branch.manager.full_name} ({branch.manager.role})</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEditModal(branch)} className="text-blue-600 hover:text-blue-900">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(branch.id)} className="text-red-600 hover:text-red-900">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold">{editingBranch ? t('common.edit') : t('branches.add')}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('branches.name')} *</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('branches.location')}</label>
                <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch Manager</label>
                <select
                  value={formData.manager_id}
                  onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                >
                  <option value="">No Manager</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.full_name} - {manager.role}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-red-700 text-white py-2 rounded-lg font-semibold hover:bg-red-800">{t('common.save')}</button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 py-2 rounded-lg font-semibold hover:bg-gray-300">{t('common.cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </FeatureGate>
  );
}
