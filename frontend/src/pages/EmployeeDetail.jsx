import React, { useEffect, useState } from 'react';
import { employeesApi } from '../api/employees';
import { departmentsApi } from '../api/departments';
import { leavesApi } from '../api/leaves';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  Download, 
  Trash2, 
  Edit3, 
  UserX, 
  UserCheck, 
  Calendar, 
  Building, 
  Phone, 
  Mail, 
  CheckCircle 
} from 'lucide-react';

export function EmployeeDetail({ employeeId, currentUser, onBack }) {
  const [employee, setEmployee] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [docType, setDocType] = useState('id_proof');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const isSelf = currentUser?.employee?.id === employeeId;

  useEffect(() => {
    loadEmployeeData();
  }, [employeeId]);

  const loadEmployeeData = async () => {
    setLoading(true);
    setError('');
    try {
      const [emp, deptList, leaveBals] = await Promise.all([
        employeesApi.get(employeeId),
        departmentsApi.list(),
        leavesApi.getBalances(undefined, employeeId).catch(() => []),
      ]);
      setEmployee(emp);
      setDepartments(deptList);
      setBalances(leaveBals);
      setEditFormData({
        first_name: emp.first_name,
        last_name: emp.last_name,
        phone: emp.phone || '',
        department_id: emp.department_id || '',
        designation_id: emp.designation_id || '',
        reporting_manager_id: emp.reporting_manager_id || '',
        employment_status: emp.employment_status,
        probation_end_date: emp.probation_end_date || '',
        is_active: emp.is_active,
      });
    } catch (err) {
      setError(err.message || 'Failed to load employee details.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const payload = {
        ...editFormData,
        department_id: editFormData.department_id ? Number(editFormData.department_id) : null,
        designation_id: editFormData.designation_id ? Number(editFormData.designation_id) : null,
        reporting_manager_id: editFormData.reporting_manager_id ? Number(editFormData.reporting_manager_id) : null,
      };
      await employeesApi.update(employeeId, payload);
      setIsEditOpen(false);
      loadEmployeeData();
    } catch (err) {
      alert(err.message || 'Failed to update profile.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeactivate = async () => {
    setDeactivateLoading(true);
    try {
      await employeesApi.deactivate(employeeId);
      setIsDeactivateOpen(false);
      loadEmployeeData();
    } catch (err) {
      alert(err.message || 'Failed to deactivate employee.');
    } finally {
      setDeactivateLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await employeesApi.uploadAvatar(employeeId, file);
      loadEmployeeData();
    } catch (err) {
      alert(err.message || 'Failed to upload photo.');
    }
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please select a file.');
      return;
    }
    setUploadLoading(true);
    try {
      await employeesApi.uploadDocument(employeeId, docType, selectedFile);
      setIsUploadDocOpen(false);
      setSelectedFile(null);
      loadEmployeeData();
    } catch (err) {
      alert(err.message || 'Failed to upload document.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDownloadDoc = async (docId, fileName) => {
    try {
      const blob = await employeesApi.downloadDocument(docId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Failed to download document.');
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await employeesApi.deleteDocument(docId);
      loadEmployeeData();
    } catch (err) {
      alert(err.message || 'Failed to delete document.');
    }
  };

  if (loading) return <LoadingSkeleton type="table" rows={4} />;
  if (error || !employee) {
    return (
      <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
        <p style={{ color: '#0A0A0A' }}>{error || 'Employee record not found.'}</p>
        <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: '12px' }} onClick={onBack}>
          Back to Directory
        </button>
      </div>
    );
  }

  const selectedDeptObj = departments.find(d => String(d.id) === String(editFormData.department_id));
  const availableDesignations = selectedDeptObj ? selectedDeptObj.designations : [];

  return (
    <div>
      {/* Top Bar with Back Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onBack}>
          <ArrowLeft size={14} />
          <span>Back to Directory</span>
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          {(isAdmin || isSelf) && (
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={() => setIsEditOpen(true)}
            >
              <Edit3 size={14} />
              <span>Edit Profile</span>
            </button>
          )}

          {isAdmin && employee.employment_status !== 'deactivated' && (
            <button 
              type="button" 
              className="btn btn-danger btn-sm"
              onClick={() => setIsDeactivateOpen(true)}
            >
              <UserX size={14} />
              <span>Deactivate</span>
            </button>
          )}
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
          {/* Avatar with upload hover */}
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: '#0A0A0A',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 600,
              overflow: 'hidden',
              border: '1px solid #E5E5E5'
            }}>
              {employee.avatar_url ? (
                <img 
                  src={employee.avatar_url} 
                  alt={employee.first_name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                employee.first_name[0]
              )}
            </div>
            {(isAdmin || isSelf) && (
              <label 
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #0A0A0A',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="Update profile photo"
              >
                <Upload size={12} color="#0A0A0A" />
                <input 
                  type="file" 
                  accept="image/png,image/jpeg,image/webp" 
                  style={{ display: 'none' }} 
                  onChange={handleAvatarChange} 
                />
              </label>
            )}
          </div>

          {/* Details */}
          <div style={{ flex: '1', minWidth: '220px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#0A0A0A' }}>
                {employee.first_name} {employee.last_name}
              </h2>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#525252' }}>
                {employee.employee_code}
              </span>
              <Badge variant={employee.employment_status}>
                {employee.employment_status.toUpperCase()}
              </Badge>
              <Badge variant={employee.role}>
                {employee.role.toUpperCase()}
              </Badge>
            </div>

            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '16px', 
              marginTop: '10px', 
              fontSize: '13px', 
              color: '#525252' 
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Building size={14} color="#737373" />
                {employee.department_name || 'No Department'} · {employee.designation_title || 'No Designation'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Mail size={14} color="#737373" />
                {employee.email}
              </span>
              {employee.phone && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Phone size={14} color="#737373" />
                  {employee.phone}
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Calendar size={14} color="#737373" />
                Joined: {employee.joining_date}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Details */}
      <div className="grid-2">
        {/* Left: Organization & Reporting Structure */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Employment & Hierarchy</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #F5F5F5' }}>
              <span className="muted">Reporting Manager</span>
              <span style={{ fontWeight: 600 }}>{employee.reporting_manager_name || 'None (Top Level)'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #F5F5F5' }}>
              <span className="muted">Department Code</span>
              <span style={{ fontWeight: 600 }}>{employee.department_name || '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #F5F5F5' }}>
              <span className="muted">Probation End Date</span>
              <span style={{ fontWeight: 600 }}>{employee.probation_end_date || 'N/A (Confirmed)'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #F5F5F5' }}>
              <span className="muted">Account Status</span>
              <span style={{ fontWeight: 600 }}>{employee.is_active ? 'Active' : 'Inactive'}</span>
            </div>

            {/* Direct Reports */}
            {employee.direct_reports && employee.direct_reports.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <span className="muted" style={{ display: 'block', marginBottom: '8px' }}>
                  Direct Reports ({employee.direct_reports.length})
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {employee.direct_reports.map(rep => (
                    <span 
                      key={rep.id} 
                      className="badge badge-outline"
                    >
                      {rep.first_name} {rep.last_name} ({rep.employee_code})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Leave Balances for 2026 */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Annual Leave Balances</h3>
          </div>
          {balances.length === 0 ? (
            <p className="muted">No leave balance records found for this year.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {balances.map(b => (
                <div 
                  key={b.id}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #E5E5E5',
                    borderRadius: '6px',
                    backgroundColor: '#FAFAFA',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0A0A0A' }}>
                      {b.leave_type_name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#737373' }}>
                      Allocated: {b.total_allocated} · Used: {b.used}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#0A0A0A' }}>
                      {b.remaining}
                    </div>
                    <div style={{ fontSize: '11px', color: '#737373' }}>days remaining</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Documents Section */}
      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">Employee Documents</h3>
            <p className="muted" style={{ marginTop: '2px' }}>Verified identity, academic, and employment records</p>
          </div>
          {(isAdmin || isSelf) && (
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={() => setIsUploadDocOpen(true)}
            >
              <Upload size={14} />
              <span>Upload Document</span>
            </button>
          )}
        </div>

        {(!employee.documents || employee.documents.length === 0) ? (
          <p className="muted" style={{ padding: '20px 0', textAlign: 'center' }}>
            No documents uploaded yet.
          </p>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Filename</th>
                  <th>File Size</th>
                  <th>Uploaded Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employee.documents.map(doc => (
                  <tr key={doc.id}>
                    <td>
                      <Badge variant="outline">{doc.document_type.replace('_', ' ').toUpperCase()}</Badge>
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={15} color="#525252" />
                        <span>{doc.file_name}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '12px', color: '#737373' }}>
                      {(doc.file_size / 1024).toFixed(1)} KB
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleDownloadDoc(doc.id, doc.file_name)}
                          title="Download"
                        >
                          <Download size={13} />
                        </button>
                        {(isAdmin || isSelf) && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleDeleteDoc(doc.id)}
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Employee Profile"
        maxWidth={580}
      >
        <form onSubmit={handleUpdateProfile}>
          {isAdmin ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editFormData.first_name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editFormData.last_name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editFormData.phone || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select
                    className="form-select"
                    value={editFormData.department_id || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, department_id: e.target.value, designation_id: '' })}
                  >
                    <option value="">None</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Designation</label>
                  <select
                    className="form-select"
                    value={editFormData.designation_id || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, designation_id: e.target.value })}
                  >
                    <option value="">None</option>
                    {availableDesignations.map(des => (
                      <option key={des.id} value={des.id}>{des.title}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Employment Status</label>
                  <select
                    className="form-select"
                    value={editFormData.employment_status || 'active'}
                    onChange={(e) => setEditFormData({ ...editFormData, employment_status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="probation">Probation</option>
                    <option value="notice">Notice</option>
                    <option value="deactivated">Deactivated</option>
                  </select>
                </div>
              </div>

              {editFormData.employment_status === 'probation' && (
                <div className="form-group">
                  <label className="form-label">Probation End Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editFormData.probation_end_date || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, probation_end_date: e.target.value })}
                  />
                </div>
              )}
            </>
          ) : (
            // Self-edit: phone number only
            <div className="form-group">
              <label className="form-label">Contact Phone</label>
              <input
                type="text"
                className="form-input"
                value={editFormData.phone || ''}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                placeholder="+91 98000 00000"
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsEditOpen(false)}
              disabled={editLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={editLoading}
            >
              {editLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Upload Document Modal */}
      <Modal
        isOpen={isUploadDocOpen}
        onClose={() => setIsUploadDocOpen(false)}
        title="Upload Verification Document"
      >
        <form onSubmit={handleUploadDocument}>
          <div className="form-group">
            <label className="form-label">Document Category</label>
            <select
              className="form-select"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
            >
              <option value="id_proof">ID Proof (Aadhaar / Passport / Voter ID)</option>
              <option value="address_proof">Address Proof (Utility Bill / Rent Agreement)</option>
              <option value="resume">Resume / Curriculum Vitae</option>
              <option value="offer_letter">Signed Offer Letter</option>
              <option value="education">Educational Certificate / Degree</option>
              <option value="other">Other Document</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Select File (PDF, PNG, JPG - Max 10MB)</label>
            <input
              type="file"
              className="form-input"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsUploadDocOpen(false)}
              disabled={uploadLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={uploadLoading || !selectedFile}
            >
              {uploadLoading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Deactivate Confirm Dialog */}
      <ConfirmDialog
        isOpen={isDeactivateOpen}
        onClose={() => setIsDeactivateOpen(false)}
        onConfirm={handleDeactivate}
        title="Deactivate Employee"
        message={`Are you sure you want to deactivate ${employee.first_name} ${employee.last_name}? Their portal login will be disabled.`}
        confirmLabel="Deactivate"
        isDanger={true}
        isLoading={deactivateLoading}
      />
    </div>
  );
}

