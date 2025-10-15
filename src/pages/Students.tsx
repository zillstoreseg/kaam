import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase, Student, Branch, Package, Scheme } from '../lib/supabase';
import { Search, Plus, Edit2, Trash2, X, Upload, Camera, MessageCircle, Download } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import { nationalities } from '../data/nationalities';

export default function Students() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [students, setStudents] = useState<Student[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [packageSchemes, setPackageSchemes] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedSchemes, setSelectedSchemes] = useState<string[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [exportBranchId, setExportBranchId] = useState<string>('');
  const [formData, setFormData] = useState({
    full_name: '',
    phone1: '',
    phone2: '',
    whatsapp_number: '',
    nationality: '',
    address: '',
    branch_id: '',
    package_id: '',
    package_start: '',
    package_end: '',
    notes: '',
    is_active: true,
    trial_student: false,
    joined_date: '',
  });

  useEffect(() => {
    loadData();
  }, [profile]);

  async function loadData() {
    try {
      let studentsQuery = supabase.from('students').select('*').order('created_at', { ascending: false });

      if (profile?.role !== 'super_admin' && profile?.branch_id) {
        studentsQuery = studentsQuery.eq('branch_id', profile.branch_id);
      }

      const [studentsRes, branchesRes, packagesRes, schemesRes, packageSchemesRes] = await Promise.all([
        studentsQuery,
        supabase.from('branches').select('*'),
        supabase.from('packages').select('*'),
        supabase.from('schemes').select('*').eq('is_active', true),
        supabase.from('package_schemes').select('*'),
      ]);

      if (studentsRes.data) setStudents(studentsRes.data as Student[]);
      if (branchesRes.data) setBranches(branchesRes.data as Branch[]);
      if (packagesRes.data) setPackages(packagesRes.data as Package[]);
      if (schemesRes.data) setSchemes(schemesRes.data as Scheme[]);

      if (packageSchemesRes.data) {
        const pkgSchemes: Record<string, string[]> = {};
        (packageSchemesRes.data as any[]).forEach((ps) => {
          if (!pkgSchemes[ps.package_id]) {
            pkgSchemes[ps.package_id] = [];
          }
          pkgSchemes[ps.package_id].push(ps.scheme_id);
        });
        setPackageSchemes(pkgSchemes);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredStudents = students.filter((student) =>
    student.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPackages = packages.filter((pkg) => {
    if (selectedSchemes.length === 0) return true;

    const pkgSchemeIds = packageSchemes[pkg.id] || [];

    if (pkgSchemeIds.length === 0) return true;

    return selectedSchemes.some((schemeId) => pkgSchemeIds.includes(schemeId));
  });

  async function openAddModal() {
    setEditingStudent(null);
    setSelectedSchemes([]);
    setPhotoFile(null);
    setPhotoPreview(null);
    const today = new Date().toISOString().split('T')[0];
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
    const endDate = oneMonthLater.toISOString().split('T')[0];

    setFormData({
      full_name: '',
      phone1: '',
      phone2: '',
      whatsapp_number: '',
      nationality: '',
      address: '',
      branch_id: profile?.branch_id || '',
      package_id: '',
      package_start: today,
      package_end: endDate,
      notes: '',
      is_active: true,
      trial_student: false,
      joined_date: today,
    });
    setShowModal(true);
  }

  async function openEditModal(student: Student) {
    setEditingStudent(student);
    setPhotoFile(null);
    setPhotoPreview(student.photo_url);
    setFormData({
      full_name: student.full_name,
      phone1: student.phone1,
      phone2: student.phone2,
      whatsapp_number: student.whatsapp_number || '',
      nationality: student.nationality,
      address: student.address,
      branch_id: student.branch_id,
      package_id: student.package_id,
      package_start: student.package_start,
      package_end: student.package_end,
      notes: student.notes,
      is_active: student.is_active,
      trial_student: student.trial_student || false,
      joined_date: student.joined_date || new Date().toISOString().split('T')[0],
    });

    const { data: studentSchemes } = await supabase
      .from('student_schemes')
      .select('scheme_id')
      .eq('student_id', student.id);

    if (studentSchemes) {
      setSelectedSchemes(studentSchemes.map((ss: any) => ss.scheme_id));
    }

    setShowModal(true);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function uploadPhoto(studentId: string): Promise<string | null> {
    if (!photoFile) return null;

    try {
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${studentId}-${Date.now()}.${fileExt}`;
      const filePath = `student-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('students')
        .upload(filePath, photoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('students')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      let studentId = editingStudent?.id;
      let photoUrl = editingStudent?.photo_url;

      if (editingStudent) {
        if (photoFile) {
          photoUrl = await uploadPhoto(editingStudent.id);
        }

        const { error } = await supabase
          .from('students')
          .update({ ...formData, photo_url: photoUrl })
          .eq('id', editingStudent.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('students')
          .insert([formData])
          .select()
          .single();

        if (error) throw error;
        if (!data) throw new Error('Failed to create student');

        studentId = data.id;

        if (photoFile) {
          photoUrl = await uploadPhoto(studentId);
          if (photoUrl) {
            await supabase
              .from('students')
              .update({ photo_url: photoUrl })
              .eq('id', studentId);
          }
        }
      }

      if (studentId) {
        await supabase
          .from('student_schemes')
          .delete()
          .eq('student_id', studentId);

        if (selectedSchemes.length > 0) {
          const schemeInserts = selectedSchemes.map((schemeId) => ({
            student_id: studentId!,
            scheme_id: schemeId,
          }));

          await supabase.from('student_schemes').insert(schemeInserts);
        }
      }

      setShowModal(false);
      loadData();
      alert('Student saved successfully!');
    } catch (error) {
      console.error('Error saving student:', error);
      alert('Error saving student');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this student?')) return;

    try {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Error deleting student');
    }
  }

  async function sendWhatsAppMessage(student: Student) {
    const whatsapp = student.whatsapp_number || student.phone1;
    if (!whatsapp) {
      alert('No WhatsApp number available');
      return;
    }

    const message = encodeURIComponent(`Hello ${student.full_name}, this is a message from ${import.meta.env.VITE_ACADEMY_NAME || 'the Academy'}.`);
    window.open(`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${message}`, '_blank');
  }

  async function exportToExcel() {
    try {
      let query = supabase.from('students').select(`
        *,
        branch:branches(name, location),
        package:packages(name),
        student_schemes(scheme:schemes(name))
      `).order('created_at', { ascending: false });

      if (profile?.role !== 'super_admin' && profile?.branch_id) {
        query = query.eq('branch_id', profile.branch_id);
      } else if (exportBranchId) {
        query = query.eq('branch_id', exportBranchId);
      }

      const { data: studentsData, error } = await query;
      if (error) throw error;

      const csvRows = [
        [
          'Full Name',
          'Phone 1',
          'Phone 2',
          'WhatsApp',
          'Nationality',
          'Address',
          'Branch',
          'Branch Location',
          'Package',
          'Schemes',
          'Package Start',
          'Package End',
          'Joined Date',
          'Status',
          'Trial Student',
          'Notes'
        ]
      ];

      studentsData?.forEach((student: any) => {
        const schemes = student.student_schemes?.map((ss: any) => ss.scheme?.name).filter(Boolean).join(', ') || '';
        csvRows.push([
          student.full_name || '',
          student.phone1 || '',
          student.phone2 || '',
          student.whatsapp_number || '',
          student.nationality || '',
          student.address || '',
          student.branch?.name || '',
          student.branch?.location || '',
          student.package?.name || '',
          schemes,
          student.package_start || '',
          student.package_end || '',
          student.joined_date || '',
          student.is_active ? 'Active' : 'Inactive',
          student.trial_student ? 'Yes' : 'No',
          student.notes || ''
        ]);
      });

      const csvContent = csvRows.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `students_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert('Students exported successfully!');
    } catch (error) {
      console.error('Error exporting students:', error);
      alert('Error exporting students');
    }
  }

  if (loading) {
    return <div className="text-center py-12">{t('common.loading')}</div>;
  }

  const canEdit = profile?.role === 'super_admin' || profile?.role === 'branch_manager';

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{t('students.title')}</h1>
        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            <Download className="w-5 h-5" />
            Export to Excel
          </button>
          {canEdit && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition"
            >
              <Plus className="w-5 h-5" />
              {t('students.add')}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('students.search')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
            />
          </div>
          {profile?.role === 'super_admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter Export by Branch
              </label>
              <select
                value={exportBranchId}
                onChange={(e) => setExportBranchId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
              >
                <option value="">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} - {branch.location}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('students.name')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('students.package')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('students.branch')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('students.status')}
                </th>
                {canEdit && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('students.actions')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {student.photo_url ? (
                        <img src={student.photo_url} alt={student.full_name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                          <span className="text-red-700 font-semibold">{student.full_name.charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{student.full_name}</div>
                        <div className="text-sm text-gray-500">{student.nationality}</div>
                        {student.trial_student && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Trial</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{student.phone1}</div>
                    {student.whatsapp_number && (
                      <button
                        onClick={() => sendWhatsAppMessage(student)}
                        className="text-green-600 hover:text-green-800 flex items-center gap-1 mt-1"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span className="text-xs">WhatsApp</span>
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {packages.find((p) => p.id === student.package_id)?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {branches.find((b) => b.id === student.branch_id)?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        student.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {student.is_active ? t('students.active') : t('students.inactive')}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(student)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(student.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-12 text-gray-500">No students found</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold">
                {editingStudent ? t('students.edit') : t('students.add')}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="flex flex-col items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="relative">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-32 h-32 rounded-full object-cover" />
                  ) : (
                    <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center">
                      <Camera className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                </div>
                <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <Upload className="w-4 h-4" />
                  <span>Upload Photo</span>
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('students.name')} *
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
                  <SearchableSelect
                    options={nationalities}
                    value={formData.nationality}
                    onChange={(value) => setFormData({ ...formData, nationality: value })}
                    placeholder="Select nationality"
                    label={t('students.nationality')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('students.phone')} 1
                  </label>
                  <input
                    type="tel"
                    value={formData.phone1}
                    onChange={(e) => setFormData({ ...formData, phone1: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('students.phone')} 2
                  </label>
                  <input
                    type="tel"
                    value={formData.phone2}
                    onChange={(e) => setFormData({ ...formData, phone2: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    value={formData.whatsapp_number}
                    onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                    placeholder="+971501234567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('students.address')}
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Programs/Schemes *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {schemes.map((scheme) => (
                    <label key={scheme.id} className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('students.branch')} *
                  </label>
                  <select
                    required
                    value={formData.branch_id}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                    disabled={profile?.role !== 'super_admin'}
                  >
                    <option value="">Select Branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('students.package')}
                  </label>
                  <select
                    value={formData.package_id}
                    onChange={(e) => setFormData({ ...formData, package_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                  >
                    <option value="">Select Package</option>
                    {filteredPackages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} - {pkg.price} {pkg.currency}
                      </option>
                    ))}
                  </select>
                  {selectedSchemes.length > 0 && filteredPackages.length === 0 && (
                    <p className="text-xs text-yellow-600 mt-1">
                      No packages available for selected schemes
                    </p>
                  )}
                  {selectedSchemes.length > 0 && filteredPackages.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Showing packages for selected schemes
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Joined Date
                  </label>
                  <input
                    type="date"
                    value={formData.joined_date}
                    onChange={(e) => setFormData({ ...formData, joined_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('students.packageStart')}
                  </label>
                  <input
                    type="date"
                    value={formData.package_start}
                    onChange={(e) => {
                      const startDate = e.target.value;
                      setFormData({ ...formData, package_start: startDate });
                      if (startDate) {
                        const start = new Date(startDate);
                        start.setMonth(start.getMonth() + 1);
                        const endDate = start.toISOString().split('T')[0];
                        setFormData(prev => ({ ...prev, package_start: startDate, package_end: endDate }));
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('students.packageEnd')}
                  </label>
                  <input
                    type="date"
                    value={formData.package_end}
                    onChange={(e) => setFormData({ ...formData, package_end: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('students.notes')}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-transparent"
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-red-700 rounded focus:ring-red-700"
                  />
                  <span className="text-sm font-medium text-gray-700">{t('students.active')}</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.trial_student}
                    onChange={(e) => setFormData({ ...formData, trial_student: e.target.checked })}
                    className="w-4 h-4 text-yellow-600 rounded focus:ring-yellow-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Trial Student</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4 sticky bottom-0 bg-white border-t">
                <button
                  type="submit"
                  className="flex-1 bg-red-700 text-white py-3 rounded-lg font-semibold hover:bg-red-800 transition"
                >
                  {t('common.save')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
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
