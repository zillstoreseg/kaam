import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase, Student, Branch, Package as PackageType, Settings as SettingsType } from '../lib/supabase';
import { Search, Plus, X, Snowflake, Play, RefreshCw, FileText } from 'lucide-react';
import InvoiceModal from '../components/InvoiceModal';

interface StudentWithDetails extends Student {
  branch?: Branch;
  package?: PackageType;
}

export default function Students() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [students, setStudents] = useState<StudentWithDetails[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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

  useEffect(() => {
    loadData();
  }, [profile]);

  async function loadData() {
    try {
      let studentsQuery = supabase.from('students').select('*, branch:branches(*), package:packages(*)').order('created_at', { ascending: false });

      if (profile?.role !== 'super_admin' && profile?.branch_id) {
        studentsQuery = studentsQuery.eq('branch_id', profile.branch_id);
      }

      const [studentsRes, branchesRes, packagesRes, settingsRes] = await Promise.all([
        studentsQuery,
        supabase.from('branches').select('*').order('name'),
        supabase.from('packages').select('*').order('name'),
        supabase.from('settings').select('*').maybeSingle(),
      ]);

      if (studentsRes.data) setStudents(studentsRes.data as StudentWithDetails[]);
      if (branchesRes.data) setBranches(branchesRes.data as Branch[]);
      if (packagesRes.data) setPackages(packagesRes.data as PackageType[]);
      if (settingsRes.data) setSettings(settingsRes.data as SettingsType);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredStudents = students.filter((student) =>
    student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.phone1.includes(searchTerm)
  );

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
        customer_email: selectedStudent.email || '',
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
        customer_email: selectedStudent.email || '',
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
    } catch (error) {
      console.error('Error:', error);
      alert(`Error processing renewal: ${error.message || 'Unknown error'}`);
    }
  }

  function calculateDaysRemaining(packageEnd: string): number {
    const today = new Date();
    const endDate = new Date(packageEnd);
    return Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
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
                          {new Date(student.package_end).toLocaleDateString()}
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
                              <>Until {new Date(student.freeze_end_date).toLocaleDateString()}</>
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
                <p className="text-sm text-gray-600">Package ends: {new Date(selectedStudent.package_end).toLocaleDateString()}</p>
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
    </div>
  );
}
