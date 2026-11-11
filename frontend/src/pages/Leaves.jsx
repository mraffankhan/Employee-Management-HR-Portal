import React, { useEffect, useState } from 'react';
import { leavesApi } from '../api/leaves';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { 
  CalendarDays, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  MessageSquare
} from 'lucide-react';

export function Leaves({ user }) {
  const [activeTab, setActiveTab] = useState('my-leaves'); // 'my-leaves' or 'approvals' or 'all-history'
  const [types, setTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Apply Modal
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [applyForm, setApplyForm] = useState({
    leave_type_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    is_half_day: false,
    half_day_session: 'first_half',
    reason: '',
  });

  // Action (Approve/Reject) Modal
  const [actionModal, setActionModal] = useState(null); // { id, applicant_name, action: 'approved' | 'rejected' }
  const [actionComments, setActionComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const isManagerOrAdmin = ['admin', 'manager'].includes(user?.role);
  const isProbation = user?.employee?.employment_status === 'probation';

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'approvals' && isManagerOrAdmin) {
      loadPendingApprovals();
    } else if (activeTab === 'all-history' && isManagerOrAdmin) {
      loadAllLeaves();
    }
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [typeList, balList, myReqs] = await Promise.all([
        leavesApi.getTypes(),
        leavesApi.getBalances(),
        leavesApi.getMyLeaves(),
      ]);
      setTypes(typeList);
      setBalances(balList);
      setMyLeaves(myReqs);
      if (typeList.length > 0 && !applyForm.leave_type_id) {
        setApplyForm(prev => ({ ...prev, leave_type_id: String(typeList[0].id) }));
      }
    } catch (err) {
      setError(err.message || 'Failed to load leave records.');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingApprovals = async () => {
    try {
      const pending = await leavesApi.getPendingLeaves();
      setPendingApprovals(pending);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAllLeaves = async () => {
    try {
      const all = await leavesApi.getAllLeaves();
      setAllLeaves(all);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    setApplyLoading(true);
    setApplyError('');
    try {
      const payload = {
        leave_type_id: Number(applyForm.leave_type_id),
        start_date: applyForm.start_date,
        end_date: applyForm.is_half_day ? applyForm.start_date : applyForm.end_date,
        is_half_day: applyForm.is_half_day,
        half_day_session: applyForm.is_half_day ? applyForm.half_day_session : null,
        reason: applyForm.reason.trim(),
      };
      await leavesApi.apply(payload);
      setIsApplyOpen(false);
      setApplyForm({
        leave_type_id: types[0]?.id ? String(types[0].id) : '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        is_half_day: false,
        half_day_session: 'first_half',
        reason: '',
      });
      loadData();
    } catch (err) {
      setApplyError(err.message || 'Failed to submit leave request.');
    } finally {
      setApplyLoading(false);
    }
  };

  const handleOpenActionModal = (req, action) => {
    setActionModal({
      id: req.id,
      applicant_name: req.employee_name,
      action: action,
    });
    setActionComments(action === 'approved' ? 'Approved.' : '');
  };

  const handleConfirmAction = async () => {
    if (!actionModal) return;
    setActionLoading(true);
    try {
      await leavesApi.actOnLeave(actionModal.id, actionModal.action, actionComments);
      setActionModal(null);
      setActionComments('');
      loadPendingApprovals();
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to process leave action.');
    } finally {
      setActionLoading(false);
    }
  };

  const selectedTypeObj = types.find(t => String(t.id) === String(applyForm.leave_type_id));
  const isSelectedTypeBlockedByProbation = isProbation && selectedTypeObj && !selectedTypeObj.probation_allowed;

  return (
    <div>
      {/* Balances Overview Cards */}
      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {balances.map(b => (
          <div key={b.id} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className="stat-label">{b.leave_type_name}</span>
              <CalendarDays size={16} color="#737373" />
            </div>
            <div className="stat-value">{b.remaining}</div>
            <div className="stat-sub">
              {b.used} used of {b.total_allocated} days allocated
            </div>
          </div>
        ))}
      </div>

      {/* Navigation & Action Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div className="tab-nav" style={{ margin: 0, border: 'none' }}>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'my-leaves' ? 'active' : ''}`}
              onClick={() => setActiveTab('my-leaves')}
            >
              My Leave Requests
            </button>
            {isManagerOrAdmin && (
              <>
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'approvals' ? 'active' : ''}`}
                  onClick={() => setActiveTab('approvals')}
                >
                  Pending Approvals
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'all-history' ? 'active' : ''}`}
                  onClick={() => setActiveTab('all-history')}
                >
                  Team Leave History
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setIsApplyOpen(true)}
          >
            <Plus size={14} />
            <span>Apply for Leave</span>
          </button>
        </div>
      </div>

      {/* Content depending on active tab */}
      {activeTab === 'my-leaves' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">My Application History</h3>
          </div>

          {loading ? (
            <LoadingSkeleton type="table" rows={4} />
          ) : myLeaves.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No leave applications"
              description="You haven't submitted any leave requests yet."
              actionLabel="Apply Now"
              onAction={() => setIsApplyOpen(true)}
            />
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Leave Type</th>
                    <th>Dates</th>
                    <th>Duration</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Approver / Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {myLeaves.map(l => (
                    <tr key={l.id}>
                      <td style={{ fontWeight: 600 }}>{l.leave_type_name}</td>
                      <td>
                        {l.start_date === l.end_date ? l.start_date : `${l.start_date} to ${l.end_date}`}
                        {l.is_half_day && (
                          <span style={{ fontSize: '11px', color: '#737373', display: 'block' }}>
                            Half-day ({l.half_day_session?.replace('_', ' ')})
                          </span>
                        )}
                      </td>
                      <td className="num-col">{l.total_days} {l.total_days === 1 ? 'day' : 'days'}</td>
                      <td style={{ maxWidth: '280px', fontSize: '13px', color: '#525252' }}>{l.reason}</td>
                      <td>
                        <Badge variant={l.status}>{l.status.toUpperCase()}</Badge>
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        {l.manager_comments ? (
                          <div>
                            <span style={{ fontWeight: 500, color: '#0A0A0A' }}>
                              {l.approver_name || 'Manager'}:
                            </span>{' '}
                            <span style={{ color: '#525252' }}>{l.manager_comments}</span>
                          </div>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pending Approvals Tab */}
      {activeTab === 'approvals' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Pending Leave Requests</h3>
              <p className="muted" style={{ marginTop: '2px' }}>Review and decide on time-off submissions</p>
            </div>
          </div>

          {pendingApprovals.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="All caught up"
              description="There are no pending leave requests awaiting your action."
            />
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>Leave Type</th>
                    <th>Date Range</th>
                    <th>Duration</th>
                    <th>Reason</th>
                    <th style={{ textAlign: 'right' }}>Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApprovals.map(req => (
                    <tr key={req.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0A0A0A' }}>{req.employee_name}</div>
                        <div style={{ fontSize: '12px', color: '#737373' }}>{req.department_name}</div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{req.leave_type_name}</td>
                      <td>
                        {req.start_date === req.end_date ? req.start_date : `${req.start_date} to ${req.end_date}`}
                        {req.is_half_day && (
                          <span style={{ fontSize: '11px', color: '#737373', display: 'block' }}>
                            Half-day ({req.half_day_session?.replace('_', ' ')})
                          </span>
                        )}
                      </td>
                      <td className="num-col">{req.total_days} {req.total_days === 1 ? 'day' : 'days'}</td>
                      <td style={{ maxWidth: '240px', fontSize: '13px', color: '#525252' }}>
                        {req.reason}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleOpenActionModal(req, 'approved')}
                          >
                            <CheckCircle size={13} />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenActionModal(req, 'rejected')}
                          >
                            <XCircle size={13} />
                            <span>Reject</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Team Leave History Tab */}
      {activeTab === 'all-history' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Team Leave Records</h3>
          </div>

          {allLeaves.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No records found"
              description="No historical leave applications recorded for team members."
            />
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Approver Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {allLeaves.map(l => (
                    <tr key={l.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{l.employee_name}</div>
                        <div style={{ fontSize: '12px', color: '#737373' }}>{l.department_name}</div>
                      </td>
                      <td>{l.leave_type_name}</td>
                      <td>{l.start_date === l.end_date ? l.start_date : `${l.start_date} to ${l.end_date}`}</td>
                      <td className="num-col">{l.total_days} days</td>
                      <td>
                        <Badge variant={l.status}>{l.status.toUpperCase()}</Badge>
                      </td>
                      <td style={{ fontSize: '12px', color: '#525252' }}>
                        {l.manager_comments || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Apply Leave Modal */}
      <Modal
        isOpen={isApplyOpen}
        onClose={() => setIsApplyOpen(false)}
        title="Apply for Leave"
        maxWidth={520}
      >
        {applyError && (
          <div style={{
            padding: '10px 14px',
            border: '1px solid #0A0A0A',
            borderRadius: '6px',
            fontSize: '13px',
            backgroundColor: '#FAFAFA',
            marginBottom: '16px',
            fontWeight: 500
          }}>
            {applyError}
          </div>
        )}

        {isProbation && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 12px',
            backgroundColor: '#FAFAFA',
            border: '1px solid #E5E5E5',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#525252',
            marginBottom: '16px'
          }}>
            <AlertCircle size={16} color="#0A0A0A" />
            <span>
              <strong>Probation Policy:</strong> You are currently on probation. Earned Leave cannot be applied during this period.
            </span>
          </div>
        )}

        <form onSubmit={handleApply}>
          <div className="form-group">
            <label className="form-label">Leave Category *</label>
            <select
              className="form-select"
              value={applyForm.leave_type_id}
              onChange={(e) => setApplyForm({ ...applyForm, leave_type_id: e.target.value })}
              required
            >
              {types.map(t => (
                <option 
                  key={t.id} 
                  value={t.id}
                  disabled={isProbation && !t.probation_allowed}
                >
                  {t.name} {isProbation && !t.probation_allowed ? '(Not allowed in probation)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Start Date *</label>
              <input
                type="date"
                className="form-input"
                required
                value={applyForm.start_date}
                onChange={(e) => setApplyForm({ ...applyForm, start_date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">End Date *</label>
              <input
                type="date"
                className="form-input"
                required
                disabled={applyForm.is_half_day}
                value={applyForm.is_half_day ? applyForm.start_date : applyForm.end_date}
                onChange={(e) => setApplyForm({ ...applyForm, end_date: e.target.value })}
              />
            </div>
          </div>

          {/* Half-Day Option */}
          <div style={{
            padding: '12px',
            backgroundColor: '#FAFAFA',
            border: '1px solid #E5E5E5',
            borderRadius: '6px',
            marginBottom: '16px'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
              <input
                type="checkbox"
                checked={applyForm.is_half_day}
                onChange={(e) => setApplyForm({ ...applyForm, is_half_day: e.target.checked })}
              />
              <span>This is a Half-Day Leave (0.5 Days)</span>
            </label>

            {applyForm.is_half_day && (
              <div style={{ marginTop: '10px', display: 'flex', gap: '16px', fontSize: '13px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="session"
                    value="first_half"
                    checked={applyForm.half_day_session === 'first_half'}
                    onChange={(e) => setApplyForm({ ...applyForm, half_day_session: e.target.value })}
                  />
                  <span>First Half (Morning)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="session"
                    value="second_half"
                    checked={applyForm.half_day_session === 'second_half'}
                    onChange={(e) => setApplyForm({ ...applyForm, half_day_session: e.target.value })}
                  />
                  <span>Second Half (Afternoon)</span>
                </label>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Reason *</label>
            <textarea
              className="form-textarea"
              rows={3}
              required
              minLength={3}
              value={applyForm.reason}
              onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
              placeholder="State clear purpose for leave request..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsApplyOpen(false)}
              disabled={applyLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={applyLoading || isSelectedTypeBlockedByProbation}
            >
              {applyLoading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Approve / Reject Decision Modal */}
      <Modal
        isOpen={Boolean(actionModal)}
        onClose={() => setActionModal(null)}
        title={`${actionModal?.action === 'approved' ? 'Approve' : 'Reject'} Leave Request`}
        maxWidth={480}
      >
        <div style={{ marginBottom: '16px', fontSize: '13px', color: '#525252' }}>
          Applicant: <strong style={{ color: '#0A0A0A' }}>{actionModal?.applicant_name}</strong>
        </div>

        <div className="form-group">
          <label className="form-label">Manager Comments (Optional)</label>
          <textarea
            className="form-textarea"
            rows={3}
            value={actionComments}
            onChange={(e) => setActionComments(e.target.value)}
            placeholder={actionModal?.action === 'approved' ? 'e.g. Approved. Please handover tasks.' : 'State reason for rejecting request...'}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setActionModal(null)}
            disabled={actionLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`btn ${actionModal?.action === 'approved' ? 'btn-primary' : 'btn-danger'}`}
            onClick={handleConfirmAction}
            disabled={actionLoading}
          >
            {actionLoading ? 'Saving...' : `Confirm ${actionModal?.action === 'approved' ? 'Approval' : 'Rejection'}`}
          </button>
        </div>
      </Modal>
    </div>
  );
}

