import { useAuth } from '../contexts/AuthContext';
import { X, Shield } from 'lucide-react';

export default function ImpersonationBanner() {
  const { impersonation, tenant, exitImpersonation } = useAuth();

  if (!impersonation || !tenant) return null;

  async function handleExit() {
    await exitImpersonation();
    window.location.href = '/admin/tenants';
  }

  return (
    <div className="bg-purple-600 text-white px-4 py-3 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-3">
        <Shield className="h-5 w-5" />
        <div>
          <p className="font-medium">Support Mode: Viewing {tenant.name}</p>
          <p className="text-xs text-purple-200">
            You are impersonating this tenant. All actions are performed in their context.
          </p>
        </div>
      </div>
      <button
        onClick={handleExit}
        className="flex items-center gap-2 px-4 py-2 bg-purple-700 hover:bg-purple-800 rounded-lg transition-colors"
      >
        <X className="h-4 w-4" />
        Exit Support Mode
      </button>
    </div>
  );
}
