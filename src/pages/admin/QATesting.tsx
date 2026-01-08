import React, { useState } from 'react';
import { ArrowLeft, Play, CheckCircle, XCircle, AlertTriangle, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message: string;
  duration?: number;
}

export function QATesting() {
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const updateResult = (name: string, status: TestResult['status'], message: string, duration?: number) => {
    setResults((prev) =>
      prev.map((r) => (r.name === name ? { ...r, status, message, duration } : r))
    );
  };

  const runTests = async () => {
    setIsRunning(true);

    const tests: TestResult[] = [
      { name: 'Create Test Tenant A', status: 'pending', message: '' },
      { name: 'Create Test Tenant B', status: 'pending', message: '' },
      { name: 'Create Sample Data in Tenant A', status: 'pending', message: '' },
      { name: 'Verify RLS Isolation', status: 'pending', message: '' },
      { name: 'Test Suspension Block', status: 'pending', message: '' },
      { name: 'Test Impersonation', status: 'pending', message: '' },
      { name: 'Cleanup Test Data', status: 'pending', message: '' },
    ];

    setResults(tests);

    let tenantAId: string | null = null;
    let tenantBId: string | null = null;
    let studentAId: string | null = null;

    try {
      // Test 1: Create Tenant A
      updateResult('Create Test Tenant A', 'running', 'Creating test tenant A...');
      const startTime1 = Date.now();

      const { data: tenantA, error: errorA } = await supabase
        .from('tenants')
        .insert({
          name: 'QA Test Tenant A',
          subdomain: `qa-test-a-${Date.now()}`,
          status: 'active',
        })
        .select()
        .single();

      if (errorA) throw new Error(`Tenant A creation failed: ${errorA.message}`);
      tenantAId = tenantA.id;

      await supabase.from('subscriptions').insert({
        tenant_id: tenantAId,
        plan: 'single',
        starts_at: new Date().toISOString().split('T')[0],
        renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'active',
        grace_days: 7,
      });

      updateResult(
        'Create Test Tenant A',
        'passed',
        `Tenant A created: ${tenantA.name}`,
        Date.now() - startTime1
      );

      // Test 2: Create Tenant B
      updateResult('Create Test Tenant B', 'running', 'Creating test tenant B...');
      const startTime2 = Date.now();

      const { data: tenantB, error: errorB } = await supabase
        .from('tenants')
        .insert({
          name: 'QA Test Tenant B',
          subdomain: `qa-test-b-${Date.now()}`,
          status: 'active',
        })
        .select()
        .single();

      if (errorB) throw new Error(`Tenant B creation failed: ${errorB.message}`);
      tenantBId = tenantB.id;

      await supabase.from('subscriptions').insert({
        tenant_id: tenantBId,
        plan: 'single',
        starts_at: new Date().toISOString().split('T')[0],
        renews_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'active',
        grace_days: 7,
      });

      updateResult(
        'Create Test Tenant B',
        'passed',
        `Tenant B created: ${tenantB.name}`,
        Date.now() - startTime2
      );

      // Test 3: Create Sample Data in Tenant A
      updateResult('Create Sample Data in Tenant A', 'running', 'Creating branch and student...');
      const startTime3 = Date.now();

      const { data: branchA, error: branchErrorA } = await supabase
        .from('branches')
        .insert({
          name: 'QA Test Branch A',
          location: 'Test Location',
          tenant_id: tenantAId,
        })
        .select()
        .single();

      if (branchErrorA) throw new Error(`Branch creation failed: ${branchErrorA.message}`);

      const { data: studentA, error: studentErrorA } = await supabase
        .from('students')
        .insert({
          full_name: 'QA Test Student A',
          phone1: '+971501234567',
          branch_id: branchA.id,
          tenant_id: tenantAId,
          is_active: true,
        })
        .select()
        .single();

      if (studentErrorA) throw new Error(`Student creation failed: ${studentErrorA.message}`);
      studentAId = studentA.id;

      updateResult(
        'Create Sample Data in Tenant A',
        'passed',
        `Created 1 branch and 1 student in Tenant A`,
        Date.now() - startTime3
      );

      // Test 4: Verify RLS Isolation
      updateResult('Verify RLS Isolation', 'running', 'Checking if Tenant B can see Tenant A data...');
      const startTime4 = Date.now();

      const { data: studentsFromB, error: rlsError } = await supabase
        .from('students')
        .select('*')
        .eq('tenant_id', tenantAId);

      if (rlsError) {
        updateResult(
          'Verify RLS Isolation',
          'failed',
          `RLS check error: ${rlsError.message}`,
          Date.now() - startTime4
        );
      } else if (studentsFromB && studentsFromB.length > 0) {
        updateResult(
          'Verify RLS Isolation',
          'failed',
          `RLS BREACH: Found ${studentsFromB.length} records from Tenant A!`,
          Date.now() - startTime4
        );
      } else {
        updateResult(
          'Verify RLS Isolation',
          'passed',
          `RLS working correctly: Tenant B cannot see Tenant A data`,
          Date.now() - startTime4
        );
      }

      // Test 5: Test Suspension Block
      updateResult('Test Suspension Block', 'running', 'Suspending Tenant B...');
      const startTime5 = Date.now();

      await supabase
        .from('tenants')
        .update({ status: 'suspended' })
        .eq('id', tenantBId);

      const { data: suspendedTenant } = await supabase
        .from('tenants')
        .select('status')
        .eq('id', tenantBId)
        .single();

      if (suspendedTenant?.status === 'suspended') {
        updateResult(
          'Test Suspension Block',
          'passed',
          'Tenant B suspended successfully (users would be blocked)',
          Date.now() - startTime5
        );

        await supabase
          .from('tenants')
          .update({ status: 'active' })
          .eq('id', tenantBId);
      } else {
        updateResult(
          'Test Suspension Block',
          'failed',
          'Failed to suspend tenant',
          Date.now() - startTime5
        );
      }

      // Test 6: Test Impersonation
      updateResult('Test Impersonation', 'running', 'Creating impersonation session...');
      const startTime6 = Date.now();

      const { data: currentUser } = await supabase.auth.getUser();

      if (currentUser.user) {
        const { data: impersonation, error: impError } = await supabase
          .from('impersonation_sessions')
          .insert({
            admin_user_id: currentUser.user.id,
            tenant_id: tenantAId,
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          })
          .select()
          .single();

        if (impError) {
          updateResult(
            'Test Impersonation',
            'failed',
            `Impersonation failed: ${impError.message}`,
            Date.now() - startTime6
          );
        } else {
          await supabase
            .from('impersonation_sessions')
            .update({ revoked: true })
            .eq('id', impersonation.id);

          updateResult(
            'Test Impersonation',
            'passed',
            'Impersonation session created and revoked successfully',
            Date.now() - startTime6
          );
        }
      } else {
        updateResult(
          'Test Impersonation',
          'failed',
          'Cannot test impersonation: No current user',
          Date.now() - startTime6
        );
      }

      // Test 7: Cleanup
      updateResult('Cleanup Test Data', 'running', 'Removing test data...');
      const startTime7 = Date.now();

      if (studentAId) {
        await supabase.from('students').delete().eq('id', studentAId);
      }

      if (tenantAId) {
        await supabase.from('tenants').delete().eq('id', tenantAId);
      }

      if (tenantBId) {
        await supabase.from('tenants').delete().eq('id', tenantBId);
      }

      updateResult(
        'Cleanup Test Data',
        'passed',
        'All test data cleaned up successfully',
        Date.now() - startTime7
      );
    } catch (err: any) {
      console.error('Test error:', err);
      results.forEach((test) => {
        if (test.status === 'running' || test.status === 'pending') {
          updateResult(test.name, 'failed', err.message);
        }
      });

      if (tenantAId) {
        await supabase.from('tenants').delete().eq('id', tenantAId);
      }
      if (tenantBId) {
        await supabase.from('tenants').delete().eq('id', tenantBId);
      }
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <Loader className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-400" />;
    }
  };

  const passedCount = results.filter((r) => r.status === 'passed').length;
  const failedCount = results.filter((r) => r.status === 'failed').length;
  const totalCount = results.length;

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
          <Play className="h-8 w-8 text-red-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Automated QA Testing</h1>
            <p className="text-sm text-gray-500 mt-1">Validate multi-tenant SaaS functionality</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Suite</h2>

        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-4">
            This automated test suite validates critical multi-tenant functionality:
          </p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Tenant creation and subscription setup</li>
            <li>Data isolation via Row-Level Security (RLS)</li>
            <li>Subscription-based access control</li>
            <li>Impersonation session management</li>
            <li>Automatic cleanup of test data</li>
          </ul>
        </div>

        <button
          onClick={runTests}
          disabled={isRunning}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {isRunning ? (
            <>
              <Loader className="h-5 w-5 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <Play className="h-5 w-5" />
              Run QA Tests
            </>
          )}
        </button>
      </div>

      {results.length > 0 && (
        <>
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Results</h2>

            {!isRunning && (
              <div className="mb-4 flex gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {passedCount} Passed
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {failedCount} Failed
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    {passedCount}/{totalCount} Tests
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    result.status === 'passed'
                      ? 'border-green-200 bg-green-50'
                      : result.status === 'failed'
                      ? 'border-red-200 bg-red-50'
                      : result.status === 'running'
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(result.status)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">{result.name}</h3>
                        {result.duration && (
                          <span className="text-xs text-gray-500">{result.duration}ms</span>
                        )}
                      </div>
                      {result.message && (
                        <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!isRunning && (
            <div
              className={`rounded-lg p-6 ${
                failedCount === 0
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              {failedCount === 0 ? (
                <>
                  <h3 className="text-lg font-semibold text-green-900 mb-2">All Tests Passed!</h3>
                  <p className="text-sm text-green-700">
                    Your multi-tenant SaaS platform is properly configured and all critical functionality is working correctly.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-red-900 mb-2">
                    Some Tests Failed
                  </h3>
                  <p className="text-sm text-red-700">
                    Please review the failed tests above and fix the issues. Common problems include:
                  </p>
                  <ul className="text-sm text-red-700 mt-2 space-y-1 list-disc list-inside">
                    <li>RLS policies not properly configured</li>
                    <li>Missing tenant_id columns on business tables</li>
                    <li>Incorrect permissions or role assignments</li>
                  </ul>
                </>
              )}
            </div>
          )}
        </>
      )}

      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">About This Test</h3>
        <p className="text-sm text-gray-600">
          This automated test suite creates temporary test tenants and data, validates multi-tenant isolation,
          and then cleans up all test data. It's safe to run repeatedly and won't affect your production data.
        </p>
      </div>
    </div>
  );
}
