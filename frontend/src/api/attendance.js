import { api } from './client';

export const attendanceApi = {
  checkIn: (notes) => api.post('/attendance/check-in', { notes }),
  checkOut: (notes) => api.post('/attendance/check-out', { notes }),
  getToday: () => api.get('/attendance/today'),
  getMonthly: (year, month, employeeId) => {
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (month) params.append('month', month);
    if (employeeId) params.append('employee_id', employeeId);
    return api.get(`/attendance/monthly?${params.toString()}`);
  },
  getTeam: (targetDate) => {
    const params = new URLSearchParams();
    if (targetDate) params.append('target_date', targetDate);
    return api.get(`/attendance/team?${params.toString()}`);
  },
};

