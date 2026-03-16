import { useState } from 'react';
import { Send, Sparkles, X, Minimize2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIAssistant() {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. I can help you with insights about your academy data. Ask me questions about students, attendance, and revenue.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const academyId = profile?.academy_id;
      if (!academyId) {
        throw new Error('No academy found');
      }

      const [academyRes, studentsRes, attendanceRes, revenueRes] = await Promise.all([
        supabase.from('academies').select('*, subscription_plan:subscription_plans(name)').eq('id', academyId).single(),
        supabase.from('students').select('id, is_active').eq('academy_id', academyId),
        supabase.from('attendance').select('attendance_date').eq('academy_id', academyId).gte('attendance_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('subscription_payments').select('amount').eq('academy_id', academyId).eq('status', 'approved')
      ]);

      const activeStudents = studentsRes.data?.filter(s => s.is_active).length || 0;
      const totalStudents = studentsRes.data?.length || 0;
      const attendanceThisMonth = attendanceRes.data?.length || 0;
      const totalRevenue = revenueRes.data?.reduce((sum, p) => sum + p.amount, 0) || 0;

      const contextData = {
        academy_name: academyRes.data?.name,
        plan: academyRes.data?.subscription_plan?.name,
        active_students: activeStudents,
        total_students: totalStudents,
        attendance_last_30_days: attendanceThisMonth,
        total_revenue: totalRevenue,
        avg_attendance_per_student: totalStudents > 0 ? (attendanceThisMonth / totalStudents).toFixed(1) : 0,
      };

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer YOUR_OPENAI_API_KEY_HERE`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are an AI assistant for DOJO CLOUD, a martial arts academy management platform.

Academy Data:
- Name: ${contextData.academy_name}
- Plan: ${contextData.plan}
- Active Students: ${contextData.active_students}
- Total Students: ${contextData.total_students}
- Attendance (last 30 days): ${contextData.attendance_last_30_days} sessions
- Average attendance per student: ${contextData.avg_attendance_per_student}
- Total Revenue: $${contextData.total_revenue}

Provide helpful, actionable insights about student engagement, attendance trends, revenue, and growth opportunities. Be conversational and supportive. When appropriate, suggest specific actions the academy owner can take.`
            },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: input }
          ],
          temperature: 0.7,
          max_tokens: 500,
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.choices[0].message.content
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Assistant error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please make sure the OpenAI API key is configured in platform settings.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 z-50"
      >
        <Sparkles className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center">
          <Sparkles className="w-5 h-5 mr-2" />
          <h3 className="font-semibold">AI Assistant</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="hover:bg-white/20 p-1 rounded transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 p-3 rounded-lg">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Powered by OpenAI
        </p>
      </div>
    </div>
  );
}
