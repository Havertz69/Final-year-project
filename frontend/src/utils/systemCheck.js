import api from '../api/axiosInstance';
import adminService from '../services/adminService';
import tenantService from '../services/tenantService';
import authService from '../services/authService';

export const runSystemCheck = async () => {
  console.log('🔍 Starting comprehensive system check...');
  
  const results = {
    authentication: { status: 'pending', details: null },
    adminEndpoints: { status: 'pending', details: {} },
    tenantEndpoints: { status: 'pending', details: {} },
    database: { status: 'pending', details: null }
  };

  // 1. Test Authentication
  console.log('📝 Testing authentication...');
  try {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    if (!token) {
      results.authentication = { status: 'error', details: 'No token found in localStorage' };
    } else {
      const res = await authService.getMe();
      results.authentication = { 
        status: 'success', 
        details: { user: res.data, token: token.substring(0, 20) + '...', role }
      };
    }
  } catch (error) {
    results.authentication = { 
      status: 'error', 
      details: error.response?.data?.message || error.message 
    };
  }

  // 2. Test Admin Endpoints
  console.log('👨‍💼 Testing admin endpoints...');
  const adminTests = [
    { name: 'Dashboard', test: () => adminService.getDashboard() },
    { name: 'Properties', test: () => adminService.getProperties() },
    { name: 'Units', test: () => adminService.getUnits() },
    { name: 'Tenants', test: () => adminService.getTenants() },
    { name: 'Payments', test: () => adminService.getPayments() },
    { name: 'Reports', test: () => adminService.getReports() },
    { name: 'Maintenance', test: () => adminService.getMaintenance() },
    { name: 'Payment Evidence', test: () => adminService.getPaymentEvidence() },
  ];

  for (const endpoint of adminTests) {
    try {
      const res = await endpoint.test();
      results.adminEndpoints.details[endpoint.name] = {
        status: 'success',
        data: Array.isArray(res.data) ? `${res.data.length} items` : 'Data received'
      };
    } catch (error) {
      results.adminEndpoints.details[endpoint.name] = {
        status: 'error',
        error: error.response?.data?.message || error.message
      };
    }
  }
  
  results.adminEndpoints.status = Object.values(results.adminEndpoints.details)
    .every(result => result.status === 'success') ? 'success' : 'partial';

  // 3. Test Tenant Endpoints (if tenant role)
  const userRole = localStorage.getItem('role');
  if (userRole === 'tenant') {
    console.log('👤 Testing tenant endpoints...');
    const tenantTests = [
      { name: 'Dashboard', test: () => tenantService.getDashboard() },
      { name: 'Profile', test: () => tenantService.getProfile() },
      { name: 'Payments', test: () => tenantService.getPayments() },
      { name: 'Maintenance', test: () => tenantService.getMaintenance() },
      { name: 'Payment Evidence', test: () => tenantService.getPaymentEvidence() },
      { name: 'Notifications', test: () => tenantService.getNotifications() },
      { name: 'Lease Document', test: () => tenantService.getLeaseDocument() },
    ];

    for (const endpoint of tenantTests) {
      try {
        const res = await endpoint.test();
        results.tenantEndpoints.details[endpoint.name] = {
          status: 'success',
          data: Array.isArray(res.data) ? `${res.data.length} items` : 'Data received'
        };
      } catch (error) {
        results.tenantEndpoints.details[endpoint.name] = {
          status: 'error',
          error: error.response?.data?.message || error.message
        };
      }
    }
    
    results.tenantEndpoints.status = Object.values(results.tenantEndpoints.details)
      .every(result => result.status === 'success') ? 'success' : 'partial';
  } else {
    results.tenantEndpoints.status = 'skipped';
    results.tenantEndpoints.details = 'Not a tenant user';
  }

  // 4. Test Database Connectivity (via a simple endpoint)
  console.log('🗄️ Testing database connectivity...');
  try {
    const res = await api.get('/smart/health-check/');
    results.database = { 
      status: 'success', 
      details: res.data 
    };
  } catch (error) {
    results.database = { 
      status: 'error', 
      details: error.response?.data?.message || error.message 
    };
  }

  console.log('✅ System check complete:', results);
  return results;
};

export const displaySystemHealth = (results) => {
  console.table({
    'Authentication': results.authentication.status,
    'Admin Endpoints': results.adminEndpoints.status,
    'Tenant Endpoints': results.tenantEndpoints.status,
    'Database': results.database.status
  });

  if (results.adminEndpoints.status !== 'success') {
    console.group('🚨 Admin Endpoint Issues:');
    Object.entries(results.adminEndpoints.details).forEach(([name, result]) => {
      if (result.status === 'error') {
        console.error(`❌ ${name}:`, result.error);
      }
    });
    console.groupEnd();
  }

  if (results.tenantEndpoints.status !== 'success' && results.tenantEndpoints.status !== 'skipped') {
    console.group('🚨 Tenant Endpoint Issues:');
    Object.entries(results.tenantEndpoints.details).forEach(([name, result]) => {
      if (result.status === 'error') {
        console.error(`❌ ${name}:`, result.error);
      }
    });
    console.groupEnd();
  }

  const overallStatus = [
    results.authentication.status,
    results.adminEndpoints.status,
    results.database.status
  ].every(status => status === 'success') ? '✅ HEALTHY' : '⚠️ NEEDS ATTENTION';

  console.log(`🏥 Overall System Status: ${overallStatus}`);
  return overallStatus;
};
