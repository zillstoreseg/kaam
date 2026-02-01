import { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase, Package, Scheme } from '../lib/supabase';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

interface PackageWithSchemes extends Package {
  schemes?: Scheme[];
}

export default function Packages() {
  const { t } = useLanguage();
  const [packages, setPackages] = useState<PackageWithSchemes[]>([]);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageWithSchemes | null>(null);
  const [selectedSchemes, setSelectedSchemes] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    sessions_per_month: 0,
    sessions_per_week: 0,
    price: 0,
    description: '',
    currency: 'AED',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [packagesRes, schemesRes] = await Promise.all([
        supabase.from('packages').select('*').order('created_at', { ascending: false }),
        supabase.from('schemes').select('*').eq('is_active', true),
      ]);

      if (packagesRes.data && schemesRes.data) {
        const packagesWithSchemes = await Promise.all(
          (packagesRes.data as Package[]).map(async (pkg) => {
            const { data: packageSchemes } = await supabase
              .from('package_schemes')
              .select('scheme_id')
              .eq('package_id', pkg.id);

            const schemeIds = packageSchemes?.map((ps: any) => ps.scheme_id) || [];
            const packageSchemesList = (schemesRes.data as Scheme[]).filter((s) =>
              schemeIds.includes(s.id)
            );

            return {
              ...pkg,
              schemes: packageSchemesList,
            };
          })
        );

        setPackages(packagesWithSchemes);
      }

      if (schemesRes.data) setSchemes(schemesRes.data as Scheme[]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function openAddModal() {
    setEditingPackage(null);
    setSelectedSchemes([]);
    setFormData({
      name: '',
      sessions_per_month: 0,
      sessions_per_week: 0,
      price: 0,
      description: '',
      currency: 'AED',
    });
    setShowModal(true);
  }

  async function openEditModal(pkg: PackageWithSchemes) {
    setEditingPackage(pkg);

    const { data: packageSchemes } = await supabase
      .from('package_schemes')
      .select('scheme_id')
      .eq('package_id', pkg.id);

    setSelectedSchemes(packageSchemes?.map((ps: any) => ps.scheme_id) || []);

    setFormData({
      name: pkg.name,
      sessions_per_month: pkg.sessions_per_month,
      sessions_per_week: pkg.sessions_per_week,
      price: pkg.price,
      description: pkg.description,
      currency: pkg.currency || 'AED',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      let packageId: string;

      if (editingPackage) {
        const { error } = await supabase.from('packages').update(formData).eq('id', editingPackage.id);
        if (error) throw error;
        packageId = editingPackage.id;
      } else {
        const { data, error } = await supabase.from('packages').insert([formData]).select().single();
        if (error) throw error;
        if (!data) throw new Error('Failed to create package');
        packageId = data.id;
      }

      await supabase.from('package_schemes').delete().eq('package_id', packageId);

      if (selectedSchemes.length > 0) {
        const schemeInserts = selectedSchemes.map((schemeId) => ({
          package_id: packageId,
          scheme_id: schemeId,
        }));
        await supabase.from('package_schemes').insert(schemeInserts);
      }

      setShowModal(false);
      loadData();
      alert('Package saved successfully!');
    } catch (error) {
      console.error('Error saving package:', error);
      alert('Error saving package');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure?')) return;
    try {
      const { error } = await supabase.from('packages').delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting package:', error);
      alert('Error deleting package');
    }
  }

  if (loading) return <div className="text-center py-12">{t('common.loading')}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{t('packages.title')}</h1>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800"
        >
          <Plus className="w-5 h-5" />
          {t('packages.add')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <div key={pkg.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{pkg.name}</h3>
                <div className="flex flex-wrap gap-1 mt-2">
                  {pkg.schemes && pkg.schemes.length > 0 ? (
                    pkg.schemes.map((scheme) => (
                      <span
                        key={scheme.id}
                        className="inline-block px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full"
                      >
                        {scheme.name}
                      </span>
                    ))
                  ) : (
                    <span className="inline-block px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">
                      All Programs
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEditModal(pkg)} className="text-blue-600 hover:text-blue-900">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(pkg.id)} className="text-red-600 hover:text-red-900">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-gray-600">{pkg.description}</p>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-600">{t('packages.sessionsPerMonth')}</span>
                <span className="font-semibold">{pkg.sessions_per_month}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('packages.sessionsPerWeek')}</span>
                <span className="font-semibold">{pkg.sessions_per_week}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-600">{t('packages.price')}</span>
                <span className="font-bold text-lg text-red-700">
                  {pkg.price} {pkg.currency}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold">
                {editingPackage ? t('common.edit') : t('packages.add')}
              </h2>
              <button onClick={() => setShowModal(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('packages.name')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Programs/Schemes (Select multiple or none for all)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {schemes.map((scheme) => (
                    <label
                      key={scheme.id}
                      className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSchemes.includes(scheme.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSchemes([...selectedSchemes, scheme.id]);
                          } else {
                            setSelectedSchemes(selectedSchemes.filter((id) => id !== scheme.id));
                          }
                        }}
                        className="w-4 h-4 text-red-700 rounded focus:ring-red-700"
                      />
                      <span className="text-sm font-medium">{scheme.name}</span>
                    </label>
                  ))}
                </div>
                {selectedSchemes.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    No schemes selected = Available for all programs
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency *</label>
                  <select
                    required
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                  >
                    <option value="AED">AED</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('packages.sessionsPerMonth')}
                </label>
                <input
                  type="number"
                  value={formData.sessions_per_month}
                  onChange={(e) =>
                    setFormData({ ...formData, sessions_per_month: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('packages.sessionsPerWeek')}
                </label>
                <input
                  type="number"
                  value={formData.sessions_per_week}
                  onChange={(e) =>
                    setFormData({ ...formData, sessions_per_week: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('packages.description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-red-700 text-white py-2 rounded-lg font-semibold hover:bg-red-800"
                >
                  {t('common.save')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 py-2 rounded-lg font-semibold hover:bg-gray-300"
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
