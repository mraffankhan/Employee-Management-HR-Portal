import { api } from './client';

export const dataManagerApi = {
  getTables: () => api.get('/data-manager/tables'),
  queryTable: (queryData) => api.post('/data-manager/query', queryData),
  addRow: (tableName, data) => api.post(`/data-manager/rows/${tableName}`, { data }),
  updateRow: (tableName, pk, data) => api.put(`/data-manager/rows/${tableName}/${pk}`, { data }),
  deleteRow: (tableName, pk) => api.delete(`/data-manager/rows/${tableName}/${pk}`),
  
  exportTable: (tableName, format = 'csv') => 
    api.get(`/data-manager/export/${tableName}?format=${format}`),
    
  importTable: (tableName, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.upload(`/data-manager/import/${tableName}`, formData);
  },
  
  downloadBackup: () => api.get('/data-manager/backup'),
  
  restoreDatabase: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.upload('/data-manager/restore', formData);
  },
  
  resetToSampleData: () => api.post('/data-manager/reset'),
  
  getAuditLogs: (params = {}) => {
    const query = new URLSearchParams();
    if (params.limit) query.append('limit', params.limit);
    if (params.offset) query.append('offset', params.offset);
    if (params.action) query.append('action', params.action);
    if (params.table_name) query.append('table_name', params.table_name);
    const qs = query.toString();
    return api.get(`/data-manager/audit-logs${qs ? '?' + qs : ''}`);
  },
};

