import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase, Student, Branch, Package as PackageType, Settings as SettingsType, Scheme } from '../lib/supabase';
import { Search, Plus, X, Snowflake, Play, RefreshCw, FileText, Edit2, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import InvoiceModal from '../components/InvoiceModal';
import SearchableSelect from '../components/SearchableSelect';
import { nationalities } from '../data/nationalities';

interface StudentWithDetails extends Student {
  branch?: Branch;
  package?: PackageType;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

export default function Students() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [students, setStudents] = useState<StudentWithDetails[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [allStudents, setAllStudents] = useState<StudentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('all');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<string>('all');
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithDetails | null>(null);
  const [freezeData, setFreezeData] = useState({ start: '', end: '', reason: '' });
  const [renewalData, setRenewalData] = useState({
    package_id: '',
    amount: '',
    discount: '0',
    payment_method: 'cash' as 'cash' | 'card' | 'bank_transfer',
    notes: '',
  });
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [generatedInvoice, setGeneratedInvoice] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentWithDetails | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [formData, setFormData] = useState({
    full_name: '',
    phone1: '',
    whatsapp_number: '',
    email: '',
    gender: '',
    birthdate: '',
    nationality: '',
    address: '',
    package_id: '',
    branch_id: '',
    scheme_id: '',
    referral_source: 'other',
    referred_by_student_id: '',
    package_start: '',
    package_end: '',
    notes: '',
    photo_url: '',
    trial_student: false,
  });

  useEffect(() => {
    loadData();
  }, [profile]);

  async function loadData() {
    try {
      let studentsQuery = supabase.from('students').select('*, branch:branches(*), package:packages(*), scheme:schemes(*), referred_by:students!referred_by_student_id(id, full_name)').order('created_at', { ascending: false });

      if (profile?.role !== 'super_admin' && profile?.branch_id) {
        studentsQuery = studentsQuery.eq('branch_id', profile.branch_id);
      }

      const [studentsRes, branchesRes, packagesRes, schemesRes, allStudentsRes, settingsRes] = await Promise.all([
        studentsQuery,
        supabase.from('branches').select('*').order('name'),
        supabase.from('packages').select('*').order('name'),
        supabase.from('schemes').select('*').order('name'),
        supabase.from('students').select('id, full_name').order('full_name'),
        supabase.from('settings').select('*').maybeSingle(),
      ]);

      if (studentsRes.data) setStudents(studentsRes.data as StudentWithDetails[]);
      if (branchesRes.data) setBranches(branchesRes.data as Branch[]);
      if (packagesRes.data) setPackages(packagesRes.data as PackageType[]);
      if (schemesRes.data) setSchemes(schemesRes.data as Scheme[]);
      if (allStudentsRes.data) setAllStudents(allStudentsRes.data as any);
      if (settingsRes.data) setSettings(settingsRes.data as SettingsType);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredStudents = students.filter((student) => {
    const matchesSearch = student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.phone1.includes(searchTerm);
    const matchesBranch = selectedBranchFilter === 'all' || student.branch_id === selectedBranchFilter;

    const studentBirthdate = (student as any).birthdate;
    const matchesYear = selectedYearFilter === 'all' ||
      (studentBirthdate && new Date(studentBirthdate).getFullYear().toString() === selectedYearFilter);

    const studentGender = (student as any).gender;
    const matchesGender = selectedGenderFilter === 'all' || studentGender === selectedGenderFilter;

    return matchesSearch && matchesBranch && matchesYear && matchesGender;
  });

  async function markAsExpired(student: StudentWithDetails) {
    if (!confirm(`Mark ${student.full_name} as expired (deactivate)?`)) return;

    try {
      const { error } = await supabase
        .from('students')
        .update({ is_active: false })
        .eq('id', student.id);

      if (error) throw error;
      alert('Student marked as expired');
      loadData();
    } catch (error) {
      console.error('Error:', error);
      alert('Error marking student as expired');
    }
  }

  async function openFreezeModal(student: StudentWithDetails) {
    setSelectedStudent(student);
    setFreezeData({ start: '', end: '', reason: '' });
    setShowFreezeModal(true);
  }

  async function freezeMembership() {
    if (!selectedStudent || !freezeData.start || !freezeData.end) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const { error: studentError } = await supabase
        .from('students')
        .update({
          is_frozen: true,
          freeze_start_date: freezeData.start,
          freeze_end_date: freezeData.end,
          freeze_reason: freezeData.reason,
        })
        .eq('id', selectedStudent.id);

      if (studentError) throw studentError;

      await supabase.from('membership_freeze_history').insert({
        student_id: selectedStudent.id,
        freeze_start: freezeData.start,
        freeze_end: freezeData.end,
        freeze_reason: freezeData.reason,
        frozen_by: profile?.id,
      });

      alert('Membership frozen successfully!');
      setShowFreezeModal(false);
      setSelectedStudent(null);
      loadData();
    } catch (error) {
      console.error('Error:', error);
      alert('Error freezing membership');
    }
  }

  async function unfreezeMembership(student: StudentWithDetails) {
    try {
      const { error: studentError } = await supabase
        .from('students')
        .update({
          is_frozen: false,
          freeze_start_date: null,
          freeze_end_date: null,
          freeze_reason: null,
        })
        .eq('id', student.id);

      if (studentError) throw studentError;

      await supabase
        .from('membership_freeze_history')
        .update({
          unfrozen_at: new Date().toISOString(),
          unfrozen_by: profile?.id,
        })
        .eq('student_id', student.id)
        .is('unfrozen_at', null);

      alert('Membership unfrozen successfully!');
      loadData();
    } catch (error) {
      console.error('Error:', error);
      alert('Error unfreezing membership');
    }
  }

  async function openRenewalModal(student: StudentWithDetails) {
    setSelectedStudent(student);
    const selectedPackage = packages.find(p => p.id === student.package_id);
    setRenewalData({
      package_id: student.package_id,
      amount: selectedPackage?.price?.toString() || '0',
      discount: '0',
      payment_method: 'cash',
      notes: '',
    });
    setShowRenewalModal(true);
  }

  async function processRenewal() {
    if (!selectedStudent || !renewalData.package_id || !renewalData.amount) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const today = new Date();
      const endDate = new Date(today);
      endDate.setMonth(endDate.getMonth() + 1);

      const amount = parseFloat(renewalData.amount);
      const discount = parseFloat(renewalData.discount || '0');
      const finalAmount = amount - discount;

      const { error: studentError } = await supabase
        .from('students')
        .update({
          package_id: renewalData.package_id,
          package_start: today.toISOString().split('T')[0],
          package_end: endDate.toISOString().split('T')[0],
          is_active: true,
        })
        .eq('id', selectedStudent.id);

      if (studentError) throw studentError;

      const selectedPackage = packages.find(p => p.id === renewalData.package_id);

      const paymentData = {
        student_id: selectedStudent.id,
        branch_id: selectedStudent.branch_id,
        package_id: renewalData.package_id,
        amount: finalAmount,
        payment_method: renewalData.payment_method,
        currency: selectedPackage?.currency || 'AED',
        payment_date: today.toISOString().split('T')[0],
        notes: renewalData.notes ? `Package Renewal - Discount: ${discount} - ${renewalData.notes}` : `Package Renewal - Discount: ${discount}`,
        created_by: profile?.id,
      };

      const { error: paymentError } = await supabase
        .from('payments')
        .insert(paymentData);

      if (paymentError) throw paymentError;

      const invoiceNumber = `INV-${Date.now()}`;
      const invoiceData = {
        invoice_number: invoiceNumber,
        branch_id: selectedStudent.branch_id,
        customer_name: selectedStudent.full_name,
        customer_phone: selectedStudent.phone1,
        customer_email: (selectedStudent as any).email || '',
        subtotal: amount,
        vat_rate: 0,
        vat_amount: 0,
        total_amount: finalAmount,
        payment_method: renewalData.payment_method,
        payment_status: 'paid',
        amount_paid: finalAmount,
        sold_by: profile?.id,
        notes: `Package: ${selectedPackage?.name} | Discount: ${discount} | ${renewalData.notes || ''}`,
        invoice_date: today.toISOString(),
      };

      const { error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoiceData);

      if (invoiceError) console.warn('Invoice creation warning:', invoiceError);

      const invoiceForDisplay = {
        invoice_number: invoiceNumber,
        invoice_date: today.toISOString(),
        customer_name: selectedStudent.full_name,
        customer_phone: selectedStudent.phone1,
        customer_email: (selectedStudent as any).email || '',
        items: [
          {
            description: `Package Renewal - ${selectedPackage?.name || 'Package'}`,
            quantity: 1,
            price: amount,
            total: amount,
          }
        ],
        subtotal: amount,
        vat_amount: 0,
        total_amount: finalAmount,
        payment_method: renewalData.payment_method,
        notes: discount > 0 ? `Discount Applied: ${discount.toFixed(2)} ${selectedPackage?.currency || 'AED'}\n${renewalData.notes || ''}` : renewalData.notes || '',
      };

      setGeneratedInvoice(invoiceForDisplay);
      setShowRenewalModal(false);
      setShowInvoiceModal(true);
      setSelectedStudent(null);
      loadData();
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Error processing renewal: ${error?.message || 'Unknown error'}`);
    }
  }

  function openAddModal() {
    setEditingStudent(null);
    setPhotoFile(null);
    setPhotoPreview('');
    setFormData({
      full_name: '',
      phone1: '',
      whatsapp_number: '',
      email: '',
      gender: '',
      birthdate: '',
      nationality: '',
      address: '',
      package_id: '',
      branch_id: profile?.role === 'branch_manager' ? profile.branch_id || '' : '',
      scheme_id: '',
      referral_source: 'other',
      referred_by_student_id: '',
      package_start: new Date().toISOString().split('T')[0],
      package_end: '',
      notes: '',
      photo_url: '',
      trial_student: false,
    });
    setShowAddModal(true);
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function uploadPhoto(): Promise<string | null> {
    if (!photoFile) return formData.photo_url || null;

    try {
      setUploadingPhoto(true);
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('student-photos')
        .upload(filePath, photoFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('student-photos')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      alert(`Error uploading photo: ${error?.message || 'Unknown error'}`);
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  }

  function openEditModal(student: StudentWithDetails) {
    setEditingStudent(student);
    setPhotoFile(null);
    setPhotoPreview(student.photo_url || '');
    setFormData({
      full_name: student.full_name,
      phone1: student.phone1 || '',
      whatsapp_number: student.whatsapp_number || '',
      email: (student as any).email || '',
      gender: (student as any).gender || '',
      birthdate: (student as any).birthdate || '',
      nationality: student.nationality || '',
      address: student.address || '',
      package_id: student.package_id || '',
      branch_id: student.branch_id,
      scheme_id: (student as any).scheme_id || '',
      referral_source: (student as any).referral_source || 'other',
      referred_by_student_id: (student as any).referred_by_student_id || '',
      package_start: student.package_start || '',
      package_end: student.package_end || '',
      notes: student.notes || '',
      photo_url: student.photo_url || '',
      trial_student: student.trial_student || false,
    });
    setShowAddModal(true);
  }

  async function handleDeleteStudent(student: StudentWithDetails) {
    if (!confirm(`Are you sure you want to delete ${student.full_name}?`)) return;

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', student.id);

      if (error) throw error;
      alert('Student deleted successfully!');
      loadData();
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Error deleting student: ${error?.message || 'Unknown error'}`);
    }
  }

  async function createStudentInvoice(student: any) {
    try {
      const selectedPackage = packages.find(p => p.id === student.package_id);
      if (!selectedPackage) return;

      const selectedScheme = student.scheme_id ? schemes.find(s => s.id === student.scheme_id) : null;
      const vatRate = settings?.vat_rate || 0;

      // Calculate pricing
      let packagePrice = selectedPackage.price;
      let discount = 0;

      if (selectedScheme) {
        if (selectedScheme.discount_type === 'percentage') {
          discount = (packagePrice * (selectedScheme.discount_value || 0)) / 100;
        } else {
          discount = selectedScheme.discount_value || 0;
        }
      }

      const subtotal = packagePrice - discount;
      const vatAmount = (subtotal * vatRate) / 100;
      const totalAmount = subtotal + vatAmount;

      // Get next invoice number
      const { data: lastInvoice } = await supabase
        .from('invoices')
        .select('invoice_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextNumber = 1;
      if (lastInvoice?.invoice_number) {
        const lastNumber = parseInt(lastInvoice.invoice_number.replace('INV-', ''));
        nextNumber = lastNumber + 1;
      }
      const invoiceNumber = `INV-${String(nextNumber).padStart(6, '0')}`;

      // Create invoice
      const invoiceData = {
        invoice_number: invoiceNumber,
        branch_id: student.branch_id,
        customer_id: student.id,
        customer_name: student.full_name,
        customer_phone: student.phone1,
        customer_email: student.email,
        subtotal: subtotal,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        payment_method: 'cash' as const,
        payment_status: 'paid' as const,
        amount_paid: totalAmount,
        sold_by: profile?.id || '',
        notes: `New Membership - Package: ${selectedPackage.name}${selectedScheme ? ` | Scheme: ${selectedScheme.name}` : ''} | Start: ${student.package_start} | End: ${student.package_end}`,
        invoice_date: new Date().toISOString(),
      };

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoiceData)
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice item
      if (invoice) {
        const { data: invoiceItem } = await supabase.from('invoice_items').insert({
          invoice_id: invoice.id,
          stock_item_id: null,
          item_name: selectedPackage.name,
          item_description: `Membership Package - ${student.package_start} to ${student.package_end}`,
          quantity: 1,
          unit_price: packagePrice,
          total_price: subtotal,
        }).select().single();

        // Return complete invoice with items and related data
        return {
          ...invoice,
          items: invoiceItem ? [invoiceItem] : [],
          branch: branches.find(b => b.id === student.branch_id),
          customer: student,
        };
      }

      return null;
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  async function handleSaveStudent() {
    if (!formData.full_name || !formData.phone1 || !formData.package_id || !formData.branch_id || !formData.package_start || !formData.package_end) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const photoUrl = await uploadPhoto();

      const studentData = {
        full_name: formData.full_name,
        phone1: formData.phone1,
        whatsapp_number: formData.whatsapp_number,
        email: formData.email,
        gender: formData.gender,
        birthdate: formData.birthdate || null,
        nationality: formData.nationality,
        address: formData.address,
        package_id: formData.package_id,
        branch_id: formData.branch_id,
        scheme_id: formData.scheme_id || null,
        referral_source: formData.referral_source,
        referred_by_student_id: formData.referred_by_student_id || null,
        package_start: formData.package_start,
        package_end: formData.package_end,
        notes: formData.notes,
        photo_url: photoUrl || formData.photo_url,
        trial_student: formData.trial_student,
        is_active: true,
      };

      if (editingStudent) {
        const { error } = await supabase
          .from('students')
          .update(studentData)
          .eq('id', editingStudent.id);

        if (error) throw error;
        alert('Student updated successfully!');
        setShowAddModal(false);
        loadData();
      } else {
        const { data: newStudent, error } = await supabase
          .from('students')
          .insert(studentData)
          .select()
          .single();

        if (error) throw error;

        // Create invoice for new student
        if (newStudent) {
          const invoice = await createStudentInvoice(newStudent);

          // Show invoice modal
          if (invoice) {
            setGeneratedInvoice(invoice);
            setShowInvoiceModal(true);
            setShowAddModal(false);
            loadData();
          }
        }
      }
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Error: ${error?.message || 'Unknown error'}`);
    }
  }

  function calculateDaysRemaining(packageEnd: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(packageEnd);
    endDate.setHours(0, 0, 0, 0);
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  }

  function getStatusBadge(student: StudentWithDetails) {
    const daysRemaining = calculateDaysRemaining(student.package_end);
    const isExpired = daysRemaining < 0;

    if (student.is_frozen) {
      return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">Frozen</span>;
    }
    if (!student.is_active) {
      return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded">Inactive</span>;
    }
    if (isExpired) {
      return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">Expired</span>;
    }
    if (daysRemaining <= 7) {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded">Expiring Soon</span>;
    }
    return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">Active</span>;
  }

  if (loading) return <div className="text-center py-12">{t('common.loading')}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{t('students.title')}</h1>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 font-semibold transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {t('students.add')}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {profile?.role === 'super_admin' && (
            <div>
              <select
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-700"
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
            <select
              value={selectedYearFilter}
              onChange={(e) => setSelectedYearFilter(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-700"
            >
              <option value="all">All Birth Years</option>
              {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={selectedGenderFilter}
              onChange={(e) => setSelectedGenderFilter(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-700"
            >
              <option value="all">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-700"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Package</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Branch</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Days Remaining</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    No students found
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const daysRemaining = calculateDaysRemaining(student.package_end);
                  const isExpired = daysRemaining < 0;
                  const isFrozen = student.is_frozen;

                  return (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{student.full_name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-700">{student.phone1}</div>
                        {student.whatsapp_number && (
                          <div className="text-xs text-gray-500">WA: {student.whatsapp_number}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-700">{student.package?.name || 'N/A'}</div>
                        <div className="text-xs text-gray-500">
                          {formatDate(student.package_end)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-700">{student.branch?.name || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(student)}</td>
                      <td className="px-4 py-3">
                        {student.is_active && !isFrozen && (
                          <div className={`text-sm font-semibold ${isExpired ? 'text-red-600' : daysRemaining <= 7 ? 'text-yellow-600' : 'text-green-600'}`}>
                            {isExpired ? (
                              <>
                                <div>Expired</div>
                                <div className="text-xs">{Math.abs(daysRemaining)}d ago</div>
                              </>
                            ) : (
                              `${daysRemaining} days`
                            )}
                          </div>
                        )}
                        {isFrozen && (
                          <div className="text-sm text-blue-600">
                            {student.freeze_start_date && student.freeze_end_date && (
                              <>Until {formatDate(student.freeze_end_date)}</>
                            )}
                          </div>
                        )}
                        {!student.is_active && (
                          <div className="text-sm text-gray-500">-</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {isFrozen ? (
                            <button
                              onClick={() => unfreezeMembership(student)}
                              className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition"
                              title="Unfreeze"
                            >
                              <Play className="w-3 h-3" />
                              Unfreeze
                            </button>
                          ) : (
                            <>
                              {student.is_active && (
                                <button
                                  onClick={() => openFreezeModal(student)}
                                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition"
                                  title="Freeze"
                                >
                                  <Snowflake className="w-3 h-3" />
                                  Freeze
                                </button>
                              )}
                              {(isExpired || !student.is_active) && (
                                <button
                                  onClick={() => openRenewalModal(student)}
                                  className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition"
                                  title="Renew"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Renew
                                </button>
                              )}
                              {student.is_active && !isExpired && (
                                <button
                                  onClick={() => markAsExpired(student)}
                                  className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition"
                                  title="Mark as Expired"
                                >
                                  Expire
                                </button>
                              )}
                              <button
                                onClick={() => openEditModal(student)}
                                className="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition"
                                title="Edit"
                              >
                                <Edit2 className="w-3 h-3" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(student)}
                                className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showFreezeModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Freeze Membership</h2>
              <button onClick={() => { setShowFreezeModal(false); setSelectedStudent(null); }}>
                <X className="w-6 h-6 text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="font-semibold text-gray-900">{selectedStudent.full_name}</p>
                <p className="text-sm text-gray-600">Package ends: {formatDate(selectedStudent.package_end)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Freeze Start Date *</label>
                <input
                  type="date"
                  value={freezeData.start}
                  onChange={(e) => setFreezeData({ ...freezeData, start: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-700"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Freeze End Date *</label>
                <input
                  type="date"
                  value={freezeData.end}
                  onChange={(e) => setFreezeData({ ...freezeData, end: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-700"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason (optional)</label>
                <textarea
                  value={freezeData.reason}
                  onChange={(e) => setFreezeData({ ...freezeData, reason: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-700"
                  rows={3}
                  placeholder="Reason for freezing..."
                />
              </div>

              <button
                onClick={freezeMembership}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition"
              >
                <Snowflake className="w-5 h-5" />
                Freeze Membership
              </button>
            </div>
          </div>
        </div>
      )}

      {showRenewalModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Renew Package & Generate Invoice</h2>
              <button onClick={() => { setShowRenewalModal(false); setSelectedStudent(null); }}>
                <X className="w-6 h-6 text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="font-semibold text-gray-900">{selectedStudent.full_name}</p>
                <p className="text-sm text-gray-600">Current package: {selectedStudent.package?.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Package *</label>
                <select
                  value={renewalData.package_id}
                  onChange={(e) => {
                    const pkg = packages.find(p => p.id === e.target.value);
                    setRenewalData({
                      ...renewalData,
                      package_id: e.target.value,
                      amount: pkg?.price?.toString() || '0',
                    });
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-700"
                  required
                >
                  <option value="">Select Package</option>
                  {packages.map(pkg => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} - {pkg.price} {pkg.currency}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                <input
                  type="number"
                  value={renewalData.amount}
                  onChange={(e) => setRenewalData({ ...renewalData, amount: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-700"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Discount</label>
                <input
                  type="number"
                  value={renewalData.discount}
                  onChange={(e) => setRenewalData({ ...renewalData, discount: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Final Amount</label>
                <div className="text-2xl font-bold text-green-600">
                  {(parseFloat(renewalData.amount || '0') - parseFloat(renewalData.discount || '0')).toFixed(2)}{' '}
                  {packages.find(p => p.id === renewalData.package_id)?.currency || 'AED'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                <select
                  value={renewalData.payment_method}
                  onChange={(e) => setRenewalData({ ...renewalData, payment_method: e.target.value as any })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-700"
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                <textarea
                  value={renewalData.notes}
                  onChange={(e) => setRenewalData({ ...renewalData, notes: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-700"
                  rows={2}
                  placeholder="Additional notes..."
                />
              </div>

              <button
                onClick={processRenewal}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition"
              >
                <FileText className="w-5 h-5" />
                Renew & Generate Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {showInvoiceModal && generatedInvoice && settings && (
        <InvoiceModal
          invoice={generatedInvoice}
          settings={settings}
          onClose={() => {
            setShowInvoiceModal(false);
            setGeneratedInvoice(null);
          }}
        />
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingStudent ? 'Edit Student' : t('students.add')}
              </h2>
              <button onClick={() => setShowAddModal(false)}>
                <X className="w-6 h-6 text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('students.name')} *
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('students.phone')} *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone1}
                    onChange={(e) => setFormData({ ...formData, phone1: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                    placeholder="student@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    value={formData.whatsapp_number}
                    onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                  >
                    <option value="">Select gender...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Birthdate
                  </label>
                  <input
                    type="date"
                    value={formData.birthdate}
                    onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                  />
                </div>

                <div>
                  <SearchableSelect
                    options={nationalities}
                    value={formData.nationality}
                    onChange={(value) => setFormData({ ...formData, nationality: value })}
                    placeholder="Select nationality..."
                    label={t('students.nationality')}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('students.address')}
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('students.branch')} *
                  </label>
                  <select
                    value={formData.branch_id}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                    required
                    disabled={profile?.role === 'branch_manager'}
                  >
                    <option value="">Select branch...</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('students.package')} *
                  </label>
                  <select
                    value={formData.package_id}
                    onChange={(e) => {
                      const selectedPackage = packages.find(p => p.id === e.target.value);
                      let newEndDate = formData.package_end;

                      if (selectedPackage && formData.package_start) {
                        const startDate = new Date(formData.package_start);
                        const endDate = new Date(startDate);
                        endDate.setMonth(endDate.getMonth() + (selectedPackage.duration_months || 1));
                        newEndDate = endDate.toISOString().split('T')[0];
                      }

                      setFormData({ ...formData, package_id: e.target.value, package_end: newEndDate });
                    }}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                    required
                  >
                    <option value="">Select package...</option>
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Scheme
                  </label>
                  <select
                    value={formData.scheme_id}
                    onChange={(e) => setFormData({ ...formData, scheme_id: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                  >
                    <option value="">Select scheme (optional)...</option>
                    {schemes.map((scheme) => (
                      <option key={scheme.id} value={scheme.id}>
                        {scheme.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    How did you find us? *
                  </label>
                  <select
                    value={formData.referral_source}
                    onChange={(e) => setFormData({ ...formData, referral_source: e.target.value, referred_by_student_id: e.target.value === 'friend' ? formData.referred_by_student_id : '' })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                    required
                  >
                    <option value="other">Other</option>
                    <option value="friend">Friend Referral</option>
                    <option value="google">Google</option>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="walk_in">Walk-in</option>
                  </select>
                </div>

                {formData.referral_source === 'friend' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Referred by Student *
                    </label>
                    <select
                      value={formData.referred_by_student_id}
                      onChange={(e) => setFormData({ ...formData, referred_by_student_id: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                      required
                    >
                      <option value="">Select student...</option>
                      {allStudents.map((student: any) => (
                        <option key={student.id} value={student.id}>
                          {student.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('students.packageStart')} *
                  </label>
                  <input
                    type="date"
                    value={formData.package_start}
                    onChange={(e) => {
                      const newStartDate = e.target.value;
                      let newEndDate = formData.package_end;

                      if (formData.package_id && newStartDate) {
                        const selectedPackage = packages.find(p => p.id === formData.package_id);
                        if (selectedPackage) {
                          const startDate = new Date(newStartDate);
                          const endDate = new Date(startDate);
                          endDate.setMonth(endDate.getMonth() + (selectedPackage.duration_months || 1));
                          newEndDate = endDate.toISOString().split('T')[0];
                        }
                      }

                      setFormData({ ...formData, package_start: newStartDate, package_end: newEndDate });
                    }}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('students.packageEnd')} *
                  </label>
                  <input
                    type="date"
                    value={formData.package_end}
                    onChange={(e) => setFormData({ ...formData, package_end: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Student Photo
                  </label>
                  <div className="flex items-center gap-6">
                    {photoPreview ? (
                      <div className="relative w-32 h-32 border-2 border-gray-300 rounded-lg overflow-hidden shadow-sm">
                        <img
                          src={photoPreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoFile(null);
                            setPhotoPreview('');
                            setFormData({ ...formData, photo_url: '' });
                          }}
                          className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 hover:bg-red-700 shadow-lg transition"
                          title="Remove photo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                        <ImageIcon className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <label htmlFor="photo-upload" className="cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition w-fit">
                          <Upload className="w-4 h-4 text-gray-700" />
                          <span className="text-sm font-medium text-gray-700">
                            {photoPreview ? 'Change Photo' : 'Upload Photo'}
                          </span>
                        </div>
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="hidden"
                        id="photo-upload"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Max 5MB • JPEG, PNG, WebP, GIF
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.trial_student}
                      onChange={(e) => setFormData({ ...formData, trial_student: e.target.checked })}
                      className="w-4 h-4 text-red-700 border-gray-300 rounded focus:ring-red-700"
                    />
                    <span className="text-sm font-semibold text-gray-700">
                      Trial Student
                    </span>
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('students.notes')}
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-700"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveStudent}
                disabled={uploadingPhoto}
                className="flex-1 px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploadingPhoto ? (
                  <>
                    <Upload className="w-4 h-4 animate-pulse" />
                    Uploading...
                  </>
                ) : (
                  t('common.save')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
