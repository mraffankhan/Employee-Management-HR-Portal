import React, { useEffect, useState } from 'react';
import { employeesApi } from '../api/employees';
import { departmentsApi } from '../api/departments';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { Search, Plus, Filter, Users, ArrowRight } from 'lucide-react';

export function Employees({ user, onSelectEmployee }) {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: 'Employee@1234',
    phone: '',
    department_id: '',
    designation_id: '',
    reporting_manager_id: '',
    joining_date: new Date().toISOString().split('T')[0],
    employment_status: 'active',
    role: 'employee',
    probation_end_date: '',
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadData();
  }, [deptFilter, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [empList, deptList] = await Promise.all([
        employeesApi.list({
          department_id: deptFilter || undefined,
          employment_status: statusFilter || undefined,
          search: searchTerm || undefined,
        }),
        departmentsApi.list(),
      ]);
      setEmployees(empList);
      setDepartments(deptList);
    } catch (err) {
      setError(err.message || 'Failed to load employee directory.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');
    try {
      const payload = {
        ...formData,
        department_id: formData.department_id ? Number(formData.department_id) : null,
        designation_id: formData.designation_id ? Number(formData.designation_id) : null,
        reporting_manager_id: formData.reporting_manager_id ? Number(formData.reporting_manager_id) : null,
        probation_end_date: formData.employment_status === 'probation' && formData.probation_end_date ? formData.probation_end_date : null,
      };
      await employeesApi.create(payload);
      setIsCreateOpen(false);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        password: 'Employee@1234',
        phone: '',
        department_id: '',
        designation_id: '',
        reporting_manager_id: '',
        joining_date: new Date().toISOString().split('T')[0],
        employment_status: 'active',
        role: 'employee',
        probation_end_date: '',
      });
      loadData();
    } catch (err) {
      setCreateError(err.message || 'Failed to create employee profile.');
    } finally {
      setCreateLoading(false);
    }
  };

  // Available designations for selected department in form
  const selectedDeptObj = departments.find(d => String(d.id) === String(formData.department_id));
  const availableDesignations = selectedDeptObj ? selectedDeptObj.designations : [];

  return (
    <div>
      {/* Action and Filter Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: '1', minWidth: '240px', maxWidth: '400px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search by name, code, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '32px' }}
              />
              <Search size={15} color="#737373" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm">Search</button>
          </form>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select 
              className="form-select" 
              style={{ width: 'auto', fontSize: '13px', height: '34px' }}
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            <select 
              className="form-select" 
              style={{ width: 'auto', fontSize: '13px', height: '34px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="probation">Probation</option>
              <option value="notice">Notice</option>
              <option value="deactivated">Deactivated</option>
            </select>

            {isAdmin && (
              <button 
                type="button" 
                className="btn btn-primary btn-sm"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus size={14} />
                <span>Add Employee</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Directory Table */}
      {loading ? (
        <LoadingSkeleton type="table" rows={6} />
      ) : error ? (
        <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
          <p style={{ color: '#0A0A0A' }}>{error}</p>
          <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: '12px' }} onClick={loadData}>
            Retry
          </button>
        </div>
      ) : employees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No employees found"
          description="Try adjusting your search terms or department filters."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchTerm('');
            setDeptFilter('');
            setStatusFilter('');
            loadData();
          }}
        />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '90px' }}>Code</th>
                <th>Employee</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Reporting Manager</th>
                <th>Joining Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr 
                  key={emp.id} 
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelectEmployee(emp.id)}
                >
                  <td style={{ fontWeight: 600, color: '#525252', fontSize: '13px' }}>
                    {emp.employee_code}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#0A0A0A',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                        fontSize: '12px',
                        flexShrink: 0
                      }}>
                        {emp.first_name[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0A0A0A' }}>
                          {emp.first_name} {emp.last_name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#737373' }}>
                          {emp.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: '13px' }}>
                    {emp.department_name || '—'}
                  </td>
                  <td style={{ fontSize: '13px' }}>
                    {emp.designation_title || '—'}
                  </td>
                  <td style={{ fontSize: '13px', color: '#525252' }}>
                    {emp.reporting_manager_name || '—'}
                  </td>
                  <td style={{ fontSize: '13px' }}>
                    {emp.joining_date}
                  </td>
                  <td>
                    <Badge variant={emp.employment_status}>
                      {emp.employment_status.toUpperCase()}
                    </Badge>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEmployee(emp.id);
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Employee Modal (Admin Only) */}
      {isAdmin && (
        <Modal 
          isOpen={isCreateOpen} 
          onClose={() => setIsCreateOpen(false)} 
          title="Add New Employee"
          maxWidth={600}
        >
          {createError && (
            <div style={{
              padding: '10px 14px',
              border: '1px solid #0A0A0A',
              borderRadius: '6px',
              fontSize: '13px',
              backgroundColor: '#FAFAFA',
              marginBottom: '16px',
              fontWeight: 500
            }}>
              {createError}
            </div>
          )}

          <form onSubmit={handleCreateEmployee}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  className="form-input"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Temporary Password *</label>
                <input
                  type="password"
                  className="form-input"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="+91 98000 00000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Joining Date *</label>
                <input
                  type="date"
                  className="form-input"
                  required
                  value={formData.joining_date}
                  onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Department</label>
                <select
                  className="form-select"
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value, designation_id: '' })}
                >
                  <option value="">Select Department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Designation</label>
                <select
                  className="form-select"
                  value={formData.designation_id}
                  onChange={(e) => setFormData({ ...formData, designation_id: e.target.value })}
                  disabled={!formData.department_id}
                >
                  <option value="">Select Designation</option>
                  {availableDesignations.map(des => (
                    <option key={des.id} value={des.id}>{des.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Reporting Manager</label>
                <select
                  className="form-select"
                  value={formData.reporting_manager_id}
                  onChange={(e) => setFormData({ ...formData, reporting_manager_id: e.target.value })}
                >
                  <option value="">None (Top-Level)</option>
                  {employees.filter(e => e.role !== 'employee').map(mgr => (
                    <option key={mgr.id} value={mgr.id}>
                      {mgr.first_name} {mgr.last_name} ({mgr.department_name || 'HR'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Access Role</label>
                <select
                  className="form-select"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin / HR</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Employment Status</label>
                <select
                  className="form-select"
                  value={formData.employment_status}
                  onChange={(e) => setFormData({ ...formData, employment_status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="probation">Probation</option>
                  <option value="notice">Notice</option>
                </select>
              </div>

              {formData.employment_status === 'probation' && (
                <div className="form-group">
                  <label className="form-label">Probation End Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.probation_end_date}
                    onChange={(e) => setFormData({ ...formData, probation_end_date: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setIsCreateOpen(false)}
                disabled={createLoading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={createLoading}
              >
                {createLoading ? 'Saving...' : 'Create Employee'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

