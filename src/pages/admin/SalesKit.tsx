import React, { useState } from 'react';
import { ArrowLeft, DollarSign, FileText, MessageCircle, Copy, Check, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function SalesKit() {
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const pricingPlans = [
    {
      name: 'Single Branch',
      price: 'Contact for pricing',
      features: [
        'One academy location',
        'Unlimited students',
        'Attendance tracking',
        'Payment management',
        'Reports & analytics',
        'WhatsApp integration',
        'Belt rank system',
        'Exam management',
      ],
    },
    {
      name: 'Multi Branch',
      price: 'Contact for pricing',
      popular: true,
      features: [
        'Multiple academy locations',
        'All Single Branch features',
        'Branch-specific dashboards',
        'Cross-branch reports',
        'Branch manager roles',
        'Consolidated analytics',
        'Multi-location inventory',
      ],
    },
    {
      name: 'Enterprise',
      price: 'Contact for pricing',
      features: [
        'Unlimited branches',
        'All Multi Branch features',
        'Custom integrations',
        'Dedicated support',
        'Custom features',
        'API access',
        'Advanced analytics',
        'White-label options',
      ],
    },
  ];

  const whatsappScriptsArabic = [
    {
      title: 'Opening Message',
      text: `السلام عليكم،

أنا [اسمك] من شركة [اسم الشركة]. نقدم نظام إدارة متكامل للأكاديميات الرياضية وخاصة أكاديميات الكاراتيه.

هل لديك دقيقتين لأشرح لك كيف يمكن لنظامنا أن يساعد في:
• تتبع الطلاب والحضور تلقائياً
• إدارة المدفوعات والفواتير
• إرسال تذكيرات WhatsApp تلقائية
• تقارير مفصلة لإدارة أفضل

هل أنت مهتم بمعرفة المزيد؟`,
    },
    {
      title: 'Features Highlight',
      text: `ميزات نظامنا الأساسية:

📊 لوحة تحكم شاملة
• متابعة جميع الطلاب في مكان واحد
• تقارير فورية وإحصائيات مفصلة

💰 إدارة المدفوعات
• تسجيل المدفوعات والاشتراكات
• تذكيرات تلقائية بانتهاء الاشتراكات
• فواتير احترافية

✅ الحضور والغياب
• تسجيل حضور سريع
• تقارير الحضور الشهرية
• تنبيهات للطلاب غير النشطين

🥋 نظام الأحزمة والامتحانات
• تتبع مستوى كل طالب
• إدارة الامتحانات والترقيات

💬 WhatsApp التلقائي
• رسائل الترحيب للطلاب الجدد
• تذكيرات التجديد
• تنبيهات الحضور

هل تريد تجربة مجانية؟`,
    },
    {
      title: 'Pricing Discussion',
      text: `بالنسبة للأسعار، لدينا ثلاث خطط:

🏢 فرع واحد
• لأكاديمية بفرع واحد
• جميع الميزات الأساسية

🏢🏢 عدة فروع
• لأكاديميات متعددة الفروع
• إدارة مركزية لجميع الفروع

🏢🏢🏢 Enterprise
• لشبكات الأكاديميات الكبيرة
• ميزات مخصصة حسب احتياجك

دعنا نحدد موعداً لعرض توضيحي مجاني حتى ترى النظام بنفسك؟`,
    },
    {
      title: 'Follow-up',
      text: `مرحباً [اسم العميل]،

أتابع معك بخصوص نظام إدارة الأكاديمية.

هل لديك أي أسئلة؟ يسعدني أن أقوم بعرض توضيحي سريع (10 دقائق) يوضح كيف سيوفر النظام وقتك ويحسن إدارة أكاديميتك.

متى يكون الوقت مناسباً لك؟`,
    },
  ];

  const whatsappScriptsEnglish = [
    {
      title: 'Opening Message',
      text: `Hello,

I'm [Your Name] from [Company Name]. We provide a comprehensive management system for sports academies, specifically karate academies.

Do you have 2 minutes for me to explain how our system can help you:
• Track students and attendance automatically
• Manage payments and invoices
• Send automatic WhatsApp reminders
• Get detailed reports for better management

Are you interested in learning more?`,
    },
    {
      title: 'Features Highlight',
      text: `Our Key Features:

📊 Comprehensive Dashboard
• Track all students in one place
• Real-time reports and detailed statistics

💰 Payment Management
• Record payments and subscriptions
• Automatic renewal reminders
• Professional invoices

✅ Attendance Tracking
• Quick attendance logging
• Monthly attendance reports
• Inactive student alerts

🥋 Belt & Exam System
• Track each student's level
• Manage exams and promotions

💬 Automatic WhatsApp
• Welcome messages for new students
• Renewal reminders
• Attendance alerts

Would you like a free trial?`,
    },
    {
      title: 'Pricing Discussion',
      text: `Regarding pricing, we have three plans:

🏢 Single Branch
• For one academy location
• All core features included

🏢🏢 Multi Branch
• For multi-location academies
• Centralized management for all branches

🏢🏢🏢 Enterprise
• For large academy networks
• Custom features for your needs

Shall we schedule a free demo so you can see the system yourself?`,
    },
    {
      title: 'Follow-up',
      text: `Hi [Client Name],

Following up regarding the academy management system.

Do you have any questions? I'd be happy to give you a quick demo (10 minutes) showing how the system will save your time and improve your academy management.

When would be a good time for you?`,
    },
  ];

  const demoChecklist = [
    'Login and show the dashboard with live data',
    'Register a new student (show the form and data entry)',
    'Mark attendance for students',
    'Create a payment/invoice',
    'Show reports (student list, attendance report)',
    'Demonstrate WhatsApp message sending (if configured)',
    'Show belt rank tracking',
    'Explain multi-branch capabilities (if applicable)',
    'Show mobile responsiveness',
    'Answer questions and address concerns',
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/tenants')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Tenants
        </button>

        <div className="flex items-center gap-3">
          <DollarSign className="h-8 w-8 text-red-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sales Kit</h1>
            <p className="text-sm text-gray-500 mt-1">Everything you need to sell the platform</p>
          </div>
        </div>
      </div>

      {/* Pricing Table */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-red-600" />
          Pricing Plans
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pricingPlans.map((plan, index) => (
            <div
              key={index}
              className={`border rounded-lg p-6 relative ${
                plan.popular ? 'border-red-500 shadow-lg' : 'border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-red-600 text-white text-xs px-3 py-1 rounded-full">Popular</span>
                </div>
              )}
              <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <p className="text-2xl font-bold text-red-600 mb-4">{plan.price}</p>
              <ul className="space-y-2">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-900 font-medium">Note:</p>
          <p className="text-sm text-yellow-700">
            Pricing is customized based on number of branches, students, and specific requirements. Contact sales for exact quotes.
          </p>
        </div>
      </div>

      {/* WhatsApp Scripts - Arabic */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-green-600" />
          WhatsApp Scripts - Arabic
        </h2>

        <div className="space-y-4">
          {whatsappScriptsArabic.map((script, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{script.title}</h3>
                <button
                  onClick={() => copyToClipboard(script.text, `ar-${index}`)}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-900"
                >
                  {copiedId === `ar-${index}` ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans bg-gray-50 p-3 rounded">
                {script.text}
              </pre>
            </div>
          ))}
        </div>
      </div>

      {/* WhatsApp Scripts - English */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-green-600" />
          WhatsApp Scripts - English
        </h2>

        <div className="space-y-4">
          {whatsappScriptsEnglish.map((script, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{script.title}</h3>
                <button
                  onClick={() => copyToClipboard(script.text, `en-${index}`)}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-900"
                >
                  {copiedId === `en-${index}` ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans bg-gray-50 p-3 rounded">
                {script.text}
              </pre>
            </div>
          ))}
        </div>
      </div>

      {/* Demo Checklist */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-red-600" />
          Demo Checklist
        </h2>

        <p className="text-sm text-gray-600 mb-4">
          Follow this checklist when demonstrating the system to potential clients:
        </p>

        <div className="space-y-2">
          {demoChecklist.map((item, index) => (
            <div key={index} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs flex items-center justify-center font-semibold">
                {index + 1}
              </span>
              <span className="text-sm text-gray-700">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Downloadable Assets */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Download className="h-5 w-5 text-red-600" />
          Downloadable Assets
        </h2>

        <div className="space-y-3">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-1">Pitch Deck (English)</h3>
            <p className="text-sm text-gray-600 mb-3">
              Comprehensive presentation covering features, benefits, and pricing
            </p>
            <button className="text-sm text-blue-600 hover:text-blue-900 flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download PDF (Coming Soon)
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-1">Pitch Deck (Arabic)</h3>
            <p className="text-sm text-gray-600 mb-3">
              نفس العرض التقديمي باللغة العربية
            </p>
            <button className="text-sm text-blue-600 hover:text-blue-900 flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download PDF (Coming Soon)
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-1">Feature Comparison Sheet</h3>
            <p className="text-sm text-gray-600 mb-3">
              Single vs Multi vs Enterprise plan comparison
            </p>
            <button className="text-sm text-blue-600 hover:text-blue-900 flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download PDF (Coming Soon)
            </button>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Tip:</strong> Upload your actual pitch decks to a cloud storage (Google Drive, Dropbox) and update these links to point to the real files.
          </p>
        </div>
      </div>
    </div>
  );
}
