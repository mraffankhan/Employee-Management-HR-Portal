import { api } from './client';

export const departmentsApi = {
  list: () => api.get('/departments'),
  createDepartment: (data) => api.post('/departments', data),
  updateDepartment: (id, data) => api.put(`/departments/${id}`, data),
  deleteDepartment: (id) => api.delete(`/departments/${id}`),
  
  createDesignation: (deptId, data) => api.post(`/departments/${deptId}/designations`, data),
  updateDesignation: (id, data) => api.put(`/departments/designations/${id}`, data),
  deleteDesignation: (id) => api.delete(`/departments/designations/${id}`),
};

