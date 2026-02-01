import { useEffect, useState } from 'react';
import { supabase, Scheme } from '../lib/supabase';
import { Plus, Edit2, Trash2, X, Award } from 'lucide-react';

export default function Schemes() {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingScheme, setEditingScheme] = useState<Scheme | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    loadSchemes();
  }, []);

  async function loadSchemes() {
    try {
      const { data, error } = await supabase
        .from('schemes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setSchemes(data as Scheme[]);
    } catch (error) {
      console.error('Error loading schemes:', error);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingScheme(null);
    setFormData({ name: '', description: '', is_active: true });
    setShowModal(true);
  }

  function openEditModal(scheme: Scheme) {
    setEditingScheme(scheme);
    setFormData({
      name: scheme.name,
      description: scheme.description || '',
      is_active: scheme.is_active,
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingScheme) {
        const { error } = await supabase
          .from('schemes')
          .update(formData)
          .eq('id', editingScheme.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('schemes').insert([formData]);
        if (error) throw error;
      }
      setShowModal(false);
      loadSchemes();
      alert('Scheme saved successfully!');
    } catch (error) {
      console.error('Error saving scheme:', error);
      alert('Error saving scheme');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure? This will affect all packages and students using this scheme.')) return;

    try {
      const { error } = await supabase.from('schemes').delete().eq('id', id);
      if (error) throw error;
      loadSchemes();
      alert('Scheme deleted successfully!');
    } catch (error) {
      console.error('Error deleting scheme:', error);
      alert('Error deleting scheme');
    }
  }

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Programs & Schemes</h1>
          <p className="text-gray-600 mt-1">Manage sports programs offered at your academy</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition"
        >
          <Plus className="w-5 h-5" />
          Add Scheme
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {schemes.map((scheme) => (
          <div
            key={scheme.id}
            className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow ${
              !scheme.is_active ? 'opacity-60' : ''
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Award className="w-6 h-6 text-red-700" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{scheme.name}</h3>
                  {!scheme.is_active && (
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                      Inactive
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(scheme)}
                  className="text-blue-600 hover:text-blue-900"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(scheme.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600">{scheme.description || 'No description'}</p>
          </div>
        ))}
      </div>

      {schemes.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Award className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>No schemes found. Add your first program!</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold">
                {editingScheme ? 'Edit Scheme' : 'Add New Scheme'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scheme Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                  placeholder="e.g., Karate, Kickboxing, MMA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                  placeholder="Brief description of the program"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-red-700 rounded focus:ring-red-700"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Active (students can enroll)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-red-700 text-white py-2 rounded-lg font-semibold hover:bg-red-800 transition"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
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
