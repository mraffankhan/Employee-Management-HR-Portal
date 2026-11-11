import React, { useEffect, useState } from 'react';
import { dashboardApi } from '../api/dashboard';
import { Badge } from '../components/Badge';
import { DepartmentChart } from '../components/DepartmentChart';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Users, UserCheck, CalendarOff, Clock, ArrowRight } from 'lucide-react';

export function Dashboard({ user, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await dashboardApi.getStats();
      setStats(data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton type="cards" />;
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
        <p style={{ color: '#0A0A0A', fontWeight: 500 }}>{error}</p>
        <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: '12px' }} onClick={loadDashboard}>
          Retry
        </button>
      </div>
    );
  }

  const role = user?.role || 'employee';

  return (
    <div>
      {/* Stat Metrics Grid */}
      <div className="grid-4" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">
              {role === 'manager' ? 'Team Headcount' : 'Total Headcount'}
            </span>
            <Users size={16} color="#737373" />
          </div>
          <div className="stat-value">{stats?.headcount ?? 0}</div>
          <div className="stat-sub">Active full-time members</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Present Today</span>
            <UserCheck size={16} color="#737373" />
          </div>
          <div className="stat-value">{stats?.present_today ?? 0}</div>
          <div className="stat-sub">Checked-in employees</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">On Leave Today</span>
            <CalendarOff size={16} color="#737373" />
          </div>
          <div className="stat-value">{stats?.on_leave_today ?? 0}</div>
          <div className="stat-sub">Approved time off</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">
              {role === 'employee' ? 'My Pending Leaves' : 'Pending Approvals'}
            </span>
            <Clock size={16} color="#737373" />
          </div>
          <div className="stat-value">{stats?.pending_approvals ?? 0}</div>
          <div className="stat-sub">Awaiting action</div>
        </div>
      </div>

      {/* Main split: Department Chart + Recent Activity */}
      <div className="grid-2">
        {/* Department Split Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Department Distribution</h2>
              <p className="muted" style={{ marginTop: '2px' }}>Headcount across functional divisions</p>
            </div>
          </div>
          <DepartmentChart data={stats?.department_split || []} />
        </div>

        {/* Recent Leaves Stream */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Recent Leave Requests</h2>
              <p className="muted" style={{ marginTop: '2px' }}>Latest submissions requiring oversight</p>
            </div>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate('leaves')}
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {(!stats?.recent_leaves || stats.recent_leaves.length === 0) ? (
            <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>
              No recent leave requests recorded.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {stats.recent_leaves.map((item) => (
                <div 
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    border: '1px solid #E5E5E5',
                    borderRadius: '6px',
                    backgroundColor: '#FAFAFA'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0A0A0A' }}>
                      {item.employee_name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#737373', marginTop: '2px' }}>
                      {item.leave_type} · {item.total_days} {item.total_days === 1 ? 'day' : 'days'} ({item.start_date})
                    </div>
                  </div>
                  <Badge variant={item.status}>{item.status.toUpperCase()}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

