# Karate Academy Management System - Upgrade Guide

## ✅ COMPLETED: Database Infrastructure (100% Non-Breaking)

All database migrations have been successfully applied and are **LIVE**. All changes are backward-compatible and safe for production.

### 1. Belt System ✅
**Database Table:** `belt_ranks`
- Contains all 11 belt levels from 10th Kyu (White) to 1st Dan (Black)
- Each belt has: `belt_key` (stable ID), `belt_name`, `belt_order` (for sorting/promotion), `color`

**Student Table Updates:**
- Added `belt_key` (text, nullable, default: '10th_kyu_white')
- Added `belt_order` (int, nullable, default: 1)
- Existing students are NOT modified (safe)
- New students get default white belt

**Indexes Created:**
- `idx_students_belt_key`
- `idx_students_belt_order`

### 2. Medical Information ✅
**Student Table Updates:**
- Added `has_chronic_condition` (boolean, default: false)
- Added `condition_details` (text, nullable)
- Added `current_treatment` (text, nullable)

**Index Created:**
- `idx_students_has_chronic_condition` (conditional index for performance)

### 3. Exam Participation & Promotions ✅
**New Tables:**

**`exam_participation`**
- Tracks attendance and results for each student per exam
- Fields: attended, result (pass/fail), previous_belt, promoted_to_belt, notes, recorded_by, timestamps
- Links to existing `exam_invitations` table
- Full RLS with branch scoping

**`promotion_log`** (Immutable)
- Permanent record of all belt promotions
- Fields: student_id, from_belt, to_belt, promotion_date, promoted_by, notes
- Append-only (no updates or deletes in application logic)
- Full RLS with branch scoping

**Indexes Created:**
- `idx_exam_participation_student_id`
- `idx_exam_participation_exam_invitation_id`
- `idx_exam_participation_branch_id`
- `idx_promotion_log_student_id`
- `idx_promotion_log_promotion_date`

### 4. Expenses Module ✅
**New Table:** `expenses`
- Fields: expense_date, branch_id, category, amount, payment_method, notes, created_by, timestamps
- Categories: rent, salaries, utilities, equipment, maintenance, marketing, other
- Payment methods: cash, card, bank_transfer
- Full RLS with branch scoping (super admins see all, managers see their branch)

**Indexes Created:**
- `idx_expenses_expense_date`
- `idx_expenses_branch_id`
- `idx_expenses_category`
- `idx_expenses_created_by`

### 5. Settings Update ✅
**Settings Table Update:**
- Added `enable_data_reset` (boolean, default: false)
- Controls access to optional data reset feature (disabled by default)

### 6. TypeScript Types ✅
**Updated in `src/lib/supabase.ts`:**
- Updated `Student` interface with all new fields
- Updated `Settings` interface
- Added `BeltRank` interface
- Added `ExamParticipation` interface
- Added `PromotionLog` interface
- Added `Expense` interface

### 7. Expenses Page ✅
**Created:** `src/pages/Expenses.tsx`
- Full CRUD operations for expenses
- Month/branch/category filters
- Category breakdown analytics
- Total expenses statistics
- Branch-scoped display
- Ready to use once added to routing

---

## 📋 TODO: UI Implementation

The database is ready. Now the UI needs to be updated to use these new features. Below is a detailed guide for each component.

### 1. Update Students Page (`src/pages/Students.tsx`)

#### Add Belt Selection to Form:

```typescript
// In formData state, add:
belt_key: '10th_kyu_white',

// Load belt ranks:
const [beltRanks, setBeltRanks] = useState<BeltRank[]>([]);

// In loadData():
const beltRanksRes = await supabase
  .from('belt_ranks')
  .select('*')
  .order('belt_order');
if (beltRanksRes.data) setBeltRanks(beltRanksRes.data as BeltRank[]);

// In the modal form, add after nationality:
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Belt Rank *
  </label>
  <select
    required
    value={formData.belt_key}
    onChange={(e) => {
      const belt = beltRanks.find(b => b.belt_key === e.target.value);
      setFormData({
        ...formData,
        belt_key: e.target.value,
        belt_order: belt?.belt_order || 1
      });
    }}
    className="w-full px-4 py-2 border rounded-lg"
  >
    {beltRanks.map((belt) => (
      <option key={belt.belt_key} value={belt.belt_key}>
        {belt.belt_name}
      </option>
    ))}
  </select>
</div>
```

#### Add Medical Information to Form:

```typescript
// In formData state, add:
has_chronic_condition: false,
condition_details: '',
current_treatment: '',

// In the modal form, add a new section:
<div className="border-t pt-4 mt-4">
  <h3 className="font-semibold mb-3">Medical Information</h3>

  <div className="mb-4">
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={formData.has_chronic_condition}
        onChange={(e) => {
          setFormData({
            ...formData,
            has_chronic_condition: e.target.checked,
            condition_details: e.target.checked ? formData.condition_details : '',
            current_treatment: e.target.checked ? formData.current_treatment : '',
          });
        }}
        className="rounded"
      />
      <span className="text-sm font-medium text-gray-700">
        Has Chronic Medical Condition
      </span>
    </label>
  </div>

  {formData.has_chronic_condition && (
    <>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Condition Details *
        </label>
        <textarea
          required={formData.has_chronic_condition}
          value={formData.condition_details}
          onChange={(e) => setFormData({ ...formData, condition_details: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg"
          rows={3}
          placeholder="Describe the condition..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Current Treatment / Management *
        </label>
        <textarea
          required={formData.has_chronic_condition}
          value={formData.current_treatment}
          onChange={(e) => setFormData({ ...formData, current_treatment: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg"
          rows={3}
          placeholder="Describe current treatment or management plan..."
        />
      </div>
    </>
  )}
</div>
```

#### Add Belt Filter:

```typescript
// Add state:
const [selectedBeltFilter, setSelectedBeltFilter] = useState<string>('all');

// Add filter UI (after existing filters):
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">Belt</label>
  <select
    value={selectedBeltFilter}
    onChange={(e) => setSelectedBeltFilter(e.target.value)}
    className="px-4 py-2 border rounded-lg"
  >
    <option value="all">All Belts</option>
    {beltRanks.map((belt) => (
      <option key={belt.belt_key} value={belt.belt_key}>
        {belt.belt_name}
      </option>
    ))}
  </select>
</div>

// Apply filter in filteredStudents useMemo:
if (selectedBeltFilter !== 'all') {
  filtered = filtered.filter(s => s.belt_key === selectedBeltFilter);
}
```

#### Add Belt Statistics Panel:

```typescript
// Calculate statistics:
const beltStats = beltRanks.map((belt) => ({
  ...belt,
  count: students.filter((s) => s.belt_key === belt.belt_key).length,
})).filter((stat) => stat.count > 0);

// Add UI (before the table):
<div className="bg-white rounded-lg shadow p-6 mb-6">
  <h2 className="text-xl font-bold mb-4">Belt Distribution</h2>
  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
    {beltStats.map((stat) => (
      <button
        key={stat.belt_key}
        onClick={() => setSelectedBeltFilter(stat.belt_key)}
        className="p-4 border rounded-lg hover:bg-gray-50 transition text-center"
      >
        <div
          className="w-8 h-8 rounded-full mx-auto mb-2"
          style={{ backgroundColor: stat.color, border: '2px solid #ccc' }}
        />
        <p className="text-xs text-gray-600 mb-1">{stat.belt_name}</p>
        <p className="text-2xl font-bold">{stat.count}</p>
      </button>
    ))}
  </div>
</div>
```

#### Add Medical Statistics:

```typescript
const medicalStats = {
  withCondition: students.filter((s) => s.has_chronic_condition).length,
  withoutCondition: students.filter((s) => !s.has_chronic_condition).length,
  total: students.length,
};

// Add UI card:
<div className="bg-white rounded-lg shadow p-6">
  <h3 className="font-semibold mb-4">Medical Information Summary</h3>
  <div className="grid grid-cols-2 gap-4">
    <div>
      <p className="text-sm text-gray-600">With Chronic Condition</p>
      <p className="text-2xl font-bold text-red-600">{medicalStats.withCondition}</p>
      <p className="text-xs text-gray-500">
        {((medicalStats.withCondition / medicalStats.total) * 100).toFixed(1)}%
      </p>
    </div>
    <div>
      <p className="text-sm text-gray-600">Without Condition</p>
      <p className="text-2xl font-bold text-green-600">{medicalStats.withoutCondition}</p>
      <p className="text-xs text-gray-500">
        {((medicalStats.withoutCondition / medicalStats.total) * 100).toFixed(1)}%
      </p>
    </div>
  </div>
</div>
```

#### Display Belt in Table:

```typescript
// Add column in table header:
<th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Belt</th>

// Add cell in table body:
<td className="px-4 py-3">
  <div className="flex items-center gap-2">
    <div
      className="w-4 h-4 rounded-full"
      style={{ backgroundColor: beltRanks.find(b => b.belt_key === student.belt_key)?.color }}
    />
    <span className="text-sm">
      {beltRanks.find(b => b.belt_key === student.belt_key)?.belt_name || 'N/A'}
    </span>
  </div>
</td>
```

---

### 2. Update Exam Eligibility Page (`src/pages/ExamEligibility.tsx`)

#### Add Confirmation Tab:

```typescript
// Add state:
const [activeTab, setActiveTab] = useState<'invitations' | 'confirmation'>('invitations');
const [participations, setParticipations] = useState<ExamParticipation[]>([]);
const [selectedInvitation, setSelectedInvitation] = useState<string | null>(null);

// Load participations when invitation selected:
async function loadParticipations(invitationId: string) {
  const { data } = await supabase
    .from('exam_participation')
    .select(`
      *,
      student:students(*),
      recorded_by_profile:profiles!recorded_by(full_name)
    `)
    .eq('exam_invitation_id', invitationId);

  if (data) setParticipations(data);
}

// Add tab UI:
<div className="flex gap-4 mb-6">
  <button
    onClick={() => setActiveTab('invitations')}
    className={`px-6 py-2 rounded-lg ${
      activeTab === 'invitations'
        ? 'bg-red-700 text-white'
        : 'bg-gray-200 text-gray-700'
    }`}
  >
    Invitations
  </button>
  <button
    onClick={() => setActiveTab('confirmation')}
    className={`px-6 py-2 rounded-lg ${
      activeTab === 'confirmation'
        ? 'bg-red-700 text-white'
        : 'bg-gray-200 text-gray-700'
    }`}
  >
    Confirmation
  </button>
</div>

// Add confirmation tab content:
{activeTab === 'confirmation' && (
  <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-xl font-bold mb-4">Exam Confirmation</h2>

    {/* Select exam invitation */}
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Exam
      </label>
      <select
        value={selectedInvitation || ''}
        onChange={(e) => {
          setSelectedInvitation(e.target.value);
          loadParticipations(e.target.value);
        }}
        className="px-4 py-2 border rounded-lg"
      >
        <option value="">Choose an exam...</option>
        {/* Map through exam invitations grouped by date */}
      </select>
    </div>

    {selectedInvitation && (
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th>Player</th>
            <th>Current Belt</th>
            <th>Attended?</th>
            <th>Result</th>
            <th>Next Belt</th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {participations.map((p) => (
            <ParticipationRow
              key={p.id}
              participation={p}
              onUpdate={loadParticipations}
            />
          ))}
        </tbody>
      </table>
    )}
  </div>
)}
```

#### Add Participation Row Component:

```typescript
function ParticipationRow({ participation, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    attended: participation.attended,
    result: participation.result,
    promoted_to_belt_key: participation.promoted_to_belt_key,
    notes: participation.notes || '',
  });

  async function handleSave() {
    const { error } = await supabase
      .from('exam_participation')
      .update(formData)
      .eq('id', participation.id);

    if (!error) {
      // If promoted, update student belt and create promotion log
      if (formData.result === 'pass' && formData.promoted_to_belt_key) {
        const belt = await supabase
          .from('belt_ranks')
          .select('*')
          .eq('belt_key', formData.promoted_to_belt_key)
          .single();

        await supabase
          .from('students')
          .update({
            belt_key: formData.promoted_to_belt_key,
            belt_order: belt.data.belt_order,
          })
          .eq('id', participation.student_id);

        await supabase.from('promotion_log').insert({
          student_id: participation.student_id,
          exam_participation_id: participation.id,
          from_belt_key: participation.previous_belt_key,
          from_belt_order: participation.previous_belt_order,
          to_belt_key: formData.promoted_to_belt_key,
          to_belt_order: belt.data.belt_order,
          promoted_by: profile?.id,
        });
      }

      setEditing(false);
      onUpdate();
    }
  }

  return editing ? (
    <tr>
      {/* Edit form cells */}
    </tr>
  ) : (
    <tr>
      {/* Display cells */}
    </tr>
  );
}
```

---

### 3. Add Expenses to Navigation

#### Update `src/App.tsx`:

```typescript
import Expenses from './pages/Expenses';

// Add route:
<Route path="/expenses" element={<Expenses />} />
```

#### Update `src/components/Layout.tsx`:

```typescript
import { DollarSign } from 'lucide-react';

// Add to navigation array:
{
  path: '/expenses',
  icon: DollarSign,
  label: 'Expenses',
  roles: ['super_admin', 'branch_manager'],
},
```

---

### 4. Update Dashboard (`src/pages/Dashboard.tsx`)

#### Add Belt Distribution Widget:

```typescript
const [beltStats, setBeltStats] = useState([]);

// Load belt statistics:
const beltStatsRes = await supabase
  .from('students')
  .select('belt_key, belt_order')
  .not('belt_key', 'is', null);

// Group by belt and count
const statsMap = {};
beltStatsRes.data.forEach((s) => {
  statsMap[s.belt_key] = (statsMap[s.belt_key] || 0) + 1;
});

setBeltStats(Object.entries(statsMap).map(([key, count]) => ({
  belt_key: key,
  count,
})));

// Add widget:
<div className="bg-white rounded-lg shadow p-6">
  <h3 className="font-semibold mb-4">Belt Distribution</h3>
  <div className="space-y-2">
    {beltStats.slice(0, 5).map((stat) => (
      <div key={stat.belt_key} className="flex justify-between">
        <span>{stat.belt_key}</span>
        <span className="font-semibold">{stat.count}</span>
      </div>
    ))}
  </div>
</div>
```

#### Add Medical Summary Widget:

```typescript
const medicalSummary = {
  with: await supabase
    .from('students')
    .select('id', { count: 'exact' })
    .eq('has_chronic_condition', true),
  without: await supabase
    .from('students')
    .select('id', { count: 'exact' })
    .eq('has_chronic_condition', false),
};

// Add widget (similar pattern)
```

#### Add Current Month Expenses Widget:

```typescript
const currentMonth = new Date().toISOString().slice(0, 7);
const { data: expenses } = await supabase
  .from('expenses')
  .select('amount')
  .gte('expense_date', `${currentMonth}-01`)
  .lt('expense_date', `${currentMonth}-32`);

const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;

// Add widget showing totalExpenses
```

---

### 5. Add Safe Reset to Settings (`src/pages/Settings.tsx`)

#### Add Danger Zone Tab:

```typescript
// Add state:
const [showResetModal, setShowResetModal] = useState(false);
const [resetConfirmation, setResetConfirmation] = useState('');

// Add tab:
<button
  onClick={() => setActiveTab('danger')}
  className={`px-6 py-2 rounded-lg ${
    activeTab === 'danger'
      ? 'bg-red-700 text-white'
      : 'bg-gray-200'
  }`}
>
  Danger Zone
</button>

// Add danger zone content:
{activeTab === 'danger' && profile?.role === 'super_admin' && (
  <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
    <div className="border-l-4 border-red-600 bg-red-50 p-4 mb-6">
      <h3 className="font-bold text-red-800 mb-2">Danger Zone</h3>
      <p className="text-sm text-red-700">
        Actions in this section are destructive and cannot be undone.
        Use with extreme caution.
      </p>
    </div>

    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <h4 className="font-semibold">Enable Data Reset Feature</h4>
          <p className="text-sm text-gray-600">
            Allow access to reset transactional data (disabled by default)
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings?.enable_data_reset}
            onChange={async (e) => {
              await supabase
                .from('settings')
                .update({ enable_data_reset: e.target.checked })
                .eq('id', settings.id);
              loadSettings();
            }}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
        </label>
      </div>

      {settings?.enable_data_reset && (
        <div className="p-4 border-2 border-red-600 rounded-lg bg-red-50">
          <h4 className="font-bold text-red-800 mb-2">Reset All Data</h4>
          <p className="text-sm text-red-700 mb-4">
            This will permanently delete all transactional data including:
            students, exams, attendance, expenses, logs. Configuration
            data (users, branches, settings) will be preserved.
          </p>
          <button
            onClick={() => setShowResetModal(true)}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
          >
            Reset Data
          </button>
        </div>
      )}
    </div>
  </div>
)}

// Add reset modal with confirmation (type "RESET") and execute reset
```

---

## 🌐 Translation Keys Needed

Add these keys to your translation files (`src/contexts/LanguageContext.tsx` or wherever translations are managed):

```typescript
// Belt System
'belt_rank': 'Belt Rank',
'belt_distribution': 'Belt Distribution',
'10th_kyu_white': '10th Kyu (White)',
'9th_kyu_yellow': '9th Kyu (Yellow)',
// ... etc for all belts

// Medical
'medical_information': 'Medical Information',
'has_chronic_condition': 'Has Chronic Medical Condition',
'condition_details': 'Condition Details',
'current_treatment': 'Current Treatment / Management',
'medical_summary': 'Medical Summary',
'with_condition': 'With Chronic Condition',
'without_condition': 'Without Condition',

// Exams
'exam_confirmation': 'Exam Confirmation',
'attended': 'Attended',
'result': 'Result',
'pass': 'Pass',
'fail': 'Fail',
'promoted_to': 'Promoted To',
'promotion_history': 'Promotion History',

// Expenses
'expenses': 'Expenses',
'expense_date': 'Expense Date',
'category': 'Category',
'rent': 'Rent',
'salaries': 'Salaries',
'utilities': 'Utilities',
'equipment': 'Equipment',
'maintenance': 'Maintenance',
'marketing': 'Marketing',
'other': 'Other',
'payment_method': 'Payment Method',
'cash': 'Cash',
'card': 'Card',
'bank_transfer': 'Bank Transfer',
'total_expenses': 'Total Expenses',
'category_breakdown': 'Category Breakdown',

// Settings
'danger_zone': 'Danger Zone',
'enable_data_reset': 'Enable Data Reset Feature',
'reset_all_data': 'Reset All Data',
'type_reset_to_confirm': 'Type RESET to confirm',
```

---

## 🔒 Security Notes

1. **All RLS policies are in place** - Branch scoping works automatically
2. **Medical data** - Only admins should see medical information (enforce in UI)
3. **Promotion log** - Immutable by design, don't allow edits in UI
4. **Data reset** - Requires explicit enablement AND confirmation

---

## 📊 Testing Checklist

- [ ] Belt selection works in student registration
- [ ] Belt filter works on students page
- [ ] Belt statistics display correctly
- [ ] Medical fields show/hide based on checkbox
- [ ] Medical fields required when condition = true
- [ ] Medical statistics calculate correctly
- [ ] Exam confirmation tab loads invitations
- [ ] Attendance/result recording works
- [ ] Belt promotion updates student record
- [ ] Promotion log entry created
- [ ] Expenses CRUD operations work
- [ ] Expenses respect branch scoping
- [ ] Expense filters work (month/branch/category)
- [ ] Category breakdown displays correctly
- [ ] Dashboard widgets show correct data
- [ ] Data reset feature disabled by default
- [ ] Data reset requires typing "RESET"

---

## 🚀 Deployment Notes

1. **Database migrations are already applied** - No additional DB work needed
2. **No breaking changes** - Existing functionality unaffected
3. **Backward compatible** - Old data works with new system
4. **Progressive rollout** - Can release features one at a time
5. **All nullable fields** - No data required for existing records

---

## 📞 Support

If you need help implementing any of these features, refer to:
- The completed `Expenses.tsx` page as a reference pattern
- Existing pages for UI patterns and structure
- Database migration files for schema details
- TypeScript interfaces in `supabase.ts` for data types
