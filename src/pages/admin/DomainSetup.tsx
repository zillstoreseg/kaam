import React, { useState, useEffect } from 'react';
import { ArrowLeft, Globe, CheckCircle, XCircle, AlertTriangle, Copy, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export function DomainSetup() {
  const navigate = useNavigate();
  const [brandDomain, setBrandDomain] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [dnsStatus, setDnsStatus] = useState<{
    root: 'checking' | 'success' | 'error' | 'pending';
    www: 'checking' | 'success' | 'error' | 'pending';
    wildcard: 'checking' | 'success' | 'error' | 'pending';
  }>({
    root: 'pending',
    www: 'pending',
    wildcard: 'pending',
  });

  useEffect(() => {
    loadBrandDomain();
  }, []);

  const loadBrandDomain = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('brand_domain')
        .limit(1)
        .maybeSingle();

      if (data?.brand_domain) {
        setBrandDomain(data.brand_domain);
      }
    } catch (err) {
      console.error('Error loading brand domain:', err);
    }
  };

  const handleSave = async () => {
    if (!brandDomain) {
      alert('Please enter a domain');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('settings')
        .update({ brand_domain: brandDomain })
        .eq('id', (await supabase.from('settings').select('id').limit(1).single()).data?.id);

      if (error) throw error;

      alert('Brand domain saved successfully!');
    } catch (err: any) {
      console.error('Error saving domain:', err);
      alert(`Failed to save: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const checkDNS = async () => {
    if (!brandDomain) {
      alert('Please enter and save a domain first');
      return;
    }

    setIsChecking(true);
    setDnsStatus({ root: 'checking', www: 'checking', wildcard: 'checking' });

    try {
      const checkDomain = async (subdomain: string) => {
        try {
          const response = await fetch(`https://${subdomain}${subdomain ? '.' : ''}${brandDomain}`, {
            method: 'HEAD',
            mode: 'no-cors',
          });
          return 'success';
        } catch (err) {
          return 'error';
        }
      };

      const [rootStatus, wwwStatus, wildcardStatus] = await Promise.all([
        checkDomain(''),
        checkDomain('www'),
        checkDomain('test'),
      ]);

      setDnsStatus({
        root: rootStatus,
        www: wwwStatus,
        wildcard: wildcardStatus,
      });
    } catch (err) {
      console.error('DNS check error:', err);
    } finally {
      setIsChecking(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const StatusIcon = ({ status }: { status: typeof dnsStatus.root }) => {
    switch (status) {
      case 'checking':
        return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/tenants')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Tenants
        </button>

        <div className="flex items-center gap-3">
          <Globe className="h-8 w-8 text-red-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Domain Setup</h1>
            <p className="text-sm text-gray-500 mt-1">Configure your brand domain and DNS settings</p>
          </div>
        </div>
      </div>

      {/* Brand Domain Configuration */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Brand Domain</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Domain
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={brandDomain}
                onChange={(e) => setBrandDomain(e.target.value)}
                placeholder="example.com"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Enter your domain without https:// (e.g., myacademy.com)
            </p>
          </div>

          {brandDomain && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 font-medium mb-2">Tenant URLs will be:</p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Main domain: https://{brandDomain}</li>
                <li>• Tenant subdomains: https://[subdomain].{brandDomain}</li>
                <li>• Example: https://elite-karate.{brandDomain}</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* DNS Configuration Guide */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">DNS Configuration</h2>

        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-900 font-medium mb-2">Required DNS Records</p>
            <p className="text-sm text-yellow-700">
              Add these DNS records in your domain registrar (Hostinger, GoDaddy, Namecheap, etc.)
            </p>
          </div>

          {/* DNS Records Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name/Host</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value/Points To</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">CNAME</td>
                  <td className="px-4 py-3 text-sm text-gray-700">@</td>
                  <td className="px-4 py-3 text-sm text-gray-700 font-mono">your-bolt-app.bolt.new</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => copyToClipboard('your-bolt-app.bolt.new')}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">CNAME</td>
                  <td className="px-4 py-3 text-sm text-gray-700">www</td>
                  <td className="px-4 py-3 text-sm text-gray-700 font-mono">your-bolt-app.bolt.new</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => copyToClipboard('your-bolt-app.bolt.new')}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">CNAME</td>
                  <td className="px-4 py-3 text-sm text-gray-700">*</td>
                  <td className="px-4 py-3 text-sm text-gray-700 font-mono">your-bolt-app.bolt.new</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => copyToClipboard('your-bolt-app.bolt.new')}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Note:</strong> Replace "your-bolt-app.bolt.new" with your actual Bolt deployment URL.
            </p>
            <p className="text-sm text-gray-600">
              DNS changes can take 1-48 hours to propagate globally. Once configured, all tenant subdomains will work automatically.
            </p>
          </div>
        </div>
      </div>

      {/* DNS Check */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">DNS Status Check</h2>

        <div className="space-y-4">
          <button
            onClick={checkDNS}
            disabled={isChecking || !brandDomain}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isChecking && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            {isChecking ? 'Checking DNS...' : 'Check DNS Configuration'}
          </button>

          {(dnsStatus.root !== 'pending' || dnsStatus.www !== 'pending' || dnsStatus.wildcard !== 'pending') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <StatusIcon status={dnsStatus.root} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Root Domain</p>
                    <p className="text-xs text-gray-500">{brandDomain}</p>
                  </div>
                </div>
                {dnsStatus.root === 'success' && <span className="text-xs text-green-600 font-medium">Connected</span>}
                {dnsStatus.root === 'error' && <span className="text-xs text-red-600 font-medium">Not Connected</span>}
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <StatusIcon status={dnsStatus.www} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">WWW Subdomain</p>
                    <p className="text-xs text-gray-500">www.{brandDomain}</p>
                  </div>
                </div>
                {dnsStatus.www === 'success' && <span className="text-xs text-green-600 font-medium">Connected</span>}
                {dnsStatus.www === 'error' && <span className="text-xs text-red-600 font-medium">Not Connected</span>}
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <StatusIcon status={dnsStatus.wildcard} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Wildcard Subdomain</p>
                    <p className="text-xs text-gray-500">*.{brandDomain}</p>
                  </div>
                </div>
                {dnsStatus.wildcard === 'success' && <span className="text-xs text-green-600 font-medium">Connected</span>}
                {dnsStatus.wildcard === 'error' && <span className="text-xs text-red-600 font-medium">Not Connected</span>}
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 font-medium mb-2">DNS Check Limitations</p>
            <p className="text-sm text-blue-700">
              This is a best-effort check from your browser. False negatives may occur due to CORS restrictions.
              For accurate DNS verification, use external tools like dnschecker.org or your registrar's DNS management panel.
            </p>
          </div>
        </div>
      </div>

      {/* Help Links */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Need Help?</h3>
        <div className="space-y-2">
          <a
            href="https://hpanel.hostinger.com/domains"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-900"
          >
            <ExternalLink className="h-4 w-4" />
            Hostinger DNS Management
          </a>
          <a
            href="https://dnschecker.org"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-900"
          >
            <ExternalLink className="h-4 w-4" />
            Check DNS Propagation
          </a>
        </div>
      </div>
    </div>
  );
}
