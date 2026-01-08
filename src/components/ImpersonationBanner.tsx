import React, { useState } from 'react';
import { Shield, X } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';

export function ImpersonationBanner() {
  const { isImpersonating, currentTenant, exitImpersonation } = useTenant();
  const [isExiting, setIsExiting] = useState(false);

  if (!isImpersonating) return null;

  const handleExit = async () => {
    if (isExiting) return;

    setIsExiting(true);
    try {
      await exitImpersonation();
    } catch (err) {
      console.error('Failed to exit impersonation:', err);
      alert('Failed to exit support mode. Please try again.');
      setIsExiting(false);
    }
  };

  return (
    <div className="bg-yellow-500 text-yellow-900 px-4 py-2 flex items-center justify-between shadow-md sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5" />
        <span className="font-semibold">
          Support Mode: Viewing {currentTenant?.name || 'Unknown Academy'}
        </span>
      </div>
      <button
        onClick={handleExit}
        disabled={isExiting}
        className="flex items-center gap-1 bg-yellow-900 text-yellow-100 px-3 py-1 rounded hover:bg-yellow-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExiting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-100"></div>
            <span>Exiting...</span>
          </>
        ) : (
          <>
            <X className="h-4 w-4" />
            <span>Exit Support Mode</span>
          </>
        )}
      </button>
    </div>
  );
}
