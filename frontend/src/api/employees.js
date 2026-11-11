import { api } from './client';

export const employeesApi = {
  list: (params = {}) => {
    const query = new URLSearchParams();
    if (params.department_id) query.append('department_id', params.department_id);
    if (params.employment_status) query.append('employment_status', params.employment_status);
    if (params.role) query.append('role', params.role);
    if (params.search) query.append('search', params.search);
    const qs = query.toString();
    return api.get(`/employees${qs ? '?' + qs : ''}`);
  },
  get: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  deactivate: (id) => api.delete(`/employees/${id}`),
  
  uploadAvatar: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.upload(`/employees/${id}/avatar`, formData);
  },
  
  uploadDocument: (id, docType, file) => {
    const formData = new FormData();
    formData.append('document_type', docType);
    formData.append('file', file);
    return api.upload(`/employees/${id}/documents`, formData);
  },
  
  downloadDocument: (docId) => api.get(`/employees/documents/${docId}/download`),
  deleteDocument: (docId) => api.delete(`/employees/documents/${docId}`),
};

