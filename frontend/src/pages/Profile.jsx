import React, { useEffect, useState } from 'react';
import { authApi } from '../api/auth';
import { employeesApi } from '../api/employees';
import { leavesApi } from '../api/leaves';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { 
  User, 
  Lock, 
  Phone, 
  Mail, 
  Building, 
  Calendar, 
  FileText, 
  Download, 
  CheckCircle,
  Key
} from 'lucide-react';

export function Profile({ user, onUserUpdated }) {
  const [profile, setProfile] = useState(null);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);

  // Change Password Modal
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  // Edit Phone Modal
  const [isPhoneOpen, setIsPhoneOpen] = useState(false);
  const [phoneVal, setPhoneVal] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, [user]);

  const loadProfileData = async () => {
    if (!user?.employee?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [emp, balList] = await Promise.all([
        employeesApi.get(user.employee.id),
        leavesApi.getBalances(undefined, user.employee.id),
      ]);
      setProfile(emp);
      setBalances(balList);
      setPhoneVal(emp.phone || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdLoading(true);
    setPwdError('');
    setPwdMsg('');
    try {
      await authApi.changePassword(currentPwd, newPwd);
      setPwdMsg('Password updated successfully.');
      setCurrentPwd('');
      setNewPwd('');
      setTimeout(() => {
        setIsPasswordOpen(false);
        setPwdMsg('');
      }, 1500);
    } catch (err) {
      setPwdError(err.message || 'Failed to update password.');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleUpdatePhone = async (e) => {
    e.preventDefault();
    setPhoneLoading(true);
    try {
      await employeesApi.update(user.employee.id, { phone: phoneVal });
      setIsPhoneOpen(false);
      loadProfileData();
    } catch (err) {
      alert(err.message || 'Failed to update phone number.');
    } finally {
      setPhoneLoading(false);
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

  if (loading) return <LoadingSkeleton type="table" rows={4} />;

  return (
    <div>
      {/* Profile Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#0A0A0A',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              fontWeight: 600
            }}>
              {profile?.first_name ? profile.first_name[0] : user?.email[0].toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#0A0A0A' }}>
                  {profile ? `${profile.first_name} ${profile.last_name}` : user?.email}
                </h2>
                <Badge variant={user?.role}>{user?.role.toUpperCase()}</Badge>
                {profile && (
                  <Badge variant={profile.employment_status}>
                    {profile.employment_status.toUpperCase()}
                  </Badge>
                )}
              </div>
              <div style={{ fontSize: '13px', color: '#525252', marginTop: '4px' }}>
                {profile?.employee_code && <span>{profile.employee_code} · </span>}
                {profile?.department_name} · {profile?.designation_title}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsPhoneOpen(true)}
            >
              <Phone size={13} />
              <span>Update Phone</span>
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsPasswordOpen(true)}
            >
              <Key size={13} />
              <span>Change Password</span>
            </button>
          </div>
        </div>
      </div>

      {/* Profile Details Grid */}
      <div className="grid-2">
        {/* Contact & Hierarchy */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Personal & Employment Details</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #F5F5F5' }}>
              <span className="muted">Email</span>
              <span style={{ fontWeight: 600 }}>{user?.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #F5F5F5' }}>
              <span className="muted">Phone</span>
              <span style={{ fontWeight: 600 }}>{profile?.phone || 'Not provided'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #F5F5F5' }}>
              <span className="muted">Reporting Manager</span>
              <span style={{ fontWeight: 600 }}>{profile?.reporting_manager_name || 'None'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #F5F5F5' }}>
              <span className="muted">Joining Date</span>
              <span style={{ fontWeight: 600 }}>{profile?.joining_date || '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #F5F5F5' }}>
              <span className="muted">Status</span>
              <span style={{ fontWeight: 600 }}>{profile?.employment_status || 'Active'}</span>
            </div>
          </div>
        </div>

        {/* Leave Balances */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Available Leave Days</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {balances.map(b => (
              <div
                key={b.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  backgroundColor: '#FAFAFA',
                  border: '1px solid #E5E5E5',
                  borderRadius: '6px'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{b.leave_type_name}</div>
                  <div style={{ fontSize: '11px', color: '#737373' }}>
                    Allocated: {b.total_allocated} · Used: {b.used}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: 700 }}>{b.remaining}</div>
                  <div style={{ fontSize: '10px', color: '#737373' }}>remaining</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Uploaded Documents */}
      {profile?.documents && profile.documents.length > 0 && (
        <div className="card" style={{ marginTop: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">My Uploaded Documents</h3>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>File Name</th>
                  <th>Size</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Download</th>
                </tr>
              </thead>
              <tbody>
                {profile.documents.map(d => (
                  <tr key={d.id}>
                    <td>
                      <Badge variant="outline">{d.document_type.replace('_', ' ').toUpperCase()}</Badge>
                    </td>
                    <td style={{ fontWeight: 500 }}>{d.file_name}</td>
                    <td style={{ fontSize: '12px', color: '#737373' }}>{(d.file_size / 1024).toFixed(1)} KB</td>
                    <td style={{ fontSize: '12px' }}>{new Date(d.uploaded_at).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDownloadDoc(d.id, d.file_name)}
                      >
                        <Download size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      <Modal
        isOpen={isPasswordOpen}
        onClose={() => setIsPasswordOpen(false)}
        title="Change Account Password"
        maxWidth={440}
      >
        {pwdError && (
          <div style={{
            padding: '8px 12px',
            backgroundColor: '#FAFAFA',
            border: '1px solid #0A0A0A',
            borderRadius: '6px',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            {pwdError}
          </div>
        )}

        {pwdMsg && (
          <div style={{
            padding: '8px 12px',
            backgroundColor: '#0A0A0A',
            color: '#FFFFFF',
            borderRadius: '6px',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            {pwdMsg}
          </div>
        )}

        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label className="form-label">Current Password *</label>
            <input
              type="password"
              className="form-input"
              required
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">New Password (Min 6 Characters) *</label>
            <input
              type="password"
              className="form-input"
              required
              minLength={6}
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsPasswordOpen(false)}
              disabled={pwdLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={pwdLoading || !currentPwd || !newPwd}
            >
              {pwdLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Phone Modal */}
      <Modal
        isOpen={isPhoneOpen}
        onClose={() => setIsPhoneOpen(false)}
        title="Update Contact Phone"
        maxWidth={400}
      >
        <form onSubmit={handleUpdatePhone}>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              type="text"
              className="form-input"
              value={phoneVal}
              onChange={(e) => setPhoneVal(e.target.value)}
              placeholder="+91 98000 00000"
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsPhoneOpen(false)}
              disabled={phoneLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={phoneLoading}
            >
              {phoneLoading ? 'Saving...' : 'Save Phone'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

