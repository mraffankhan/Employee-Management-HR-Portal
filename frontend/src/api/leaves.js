import { api } from './client';

export const leavesApi = {
  getTypes: () => api.get('/leaves/types'),
  getBalances: (year, employeeId) => {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (employeeId) params.append('employee_id', employeeId);
    const qs = params.toString();
    return api.get(`/leaves/balances${qs ? '?' + qs : ''}`);
  },
  apply: (data) => api.post('/leaves/apply', data),
  getMyLeaves: () => api.get('/leaves/my'),
  getPendingLeaves: () => api.get('/leaves/pending'),
  getAllLeaves: (statusFilter) => {
    const params = new URLSearchParams();
    if (statusFilter) params.append('status_filter', statusFilter);
    const qs = params.toString();
    return api.get(`/leaves/all${qs ? '?' + qs : ''}`);
  },
  actOnLeave: (leaveId, status, comments) => 
    api.post(`/leaves/${leaveId}/action`, { status, manager_comments: comments }),
};

