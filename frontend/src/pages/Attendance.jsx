import React, { useEffect, useState } from 'react';
import { attendanceApi } from '../api/attendance';
import { employeesApi } from '../api/employees';
import { Badge } from '../components/Badge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { 
  CalendarCheck, 
  LogIn, 
  LogOut, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export function Attendance({ user }) {
  const [activeTab, setActiveTab] = useState('my-attendance'); // 'my-attendance' or 'team-attendance'

  // Today's Check-in/out State
  const [todayRecord, setTodayRecord] = useState(null);
  const [checkNotes, setCheckNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Monthly Calendar State
  const today = new Date();
  const [calendarYear, setCalendarYear] = useState(2026);
  const [calendarMonth, setCalendarMonth] = useState(11); // November
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [monthLoading, setMonthLoading] = useState(true);

  // Team Attendance State (Manager / Admin)
  const [teamDate, setTeamDate] = useState(new Date().toISOString().split('T')[0]);
  const [teamRecords, setTeamRecords] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);

  const isManagerOrAdmin = ['admin', 'manager'].includes(user?.role);

  useEffect(() => {
    loadTodayStatus();
    loadMonthlyAttendance(calendarYear, calendarMonth);
  }, []);

  useEffect(() => {
    loadMonthlyAttendance(calendarYear, calendarMonth);
  }, [calendarYear, calendarMonth]);

  useEffect(() => {
    if (activeTab === 'team-attendance' && isManagerOrAdmin) {
      loadTeamAttendance(teamDate);
    }
  }, [activeTab, teamDate]);

  const loadTodayStatus = async () => {
    try {
      const data = await attendanceApi.getToday();
      setTodayRecord(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMonthlyAttendance = async (yr, mo) => {
    setMonthLoading(true);
    try {
      const data = await attendanceApi.getMonthly(yr, mo);
      setMonthlySummary(data);
    } catch (err) {
      console.error(err);
    } finally {
      setMonthLoading(false);
    }
  };

  const loadTeamAttendance = async (dateStr) => {
    setTeamLoading(true);
    try {
      const data = await attendanceApi.getTeam(dateStr);
      setTeamRecords(data);
    } catch (err) {
      console.error(err);
    } finally {
      setTeamLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const data = await attendanceApi.checkIn(checkNotes);
      setTodayRecord(data);
      setCheckNotes('');
      loadMonthlyAttendance(calendarYear, calendarMonth);
    } catch (err) {
      alert(err.message || 'Check-in failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      const data = await attendanceApi.checkOut(checkNotes);
      setTodayRecord(data);
      setCheckNotes('');
      loadMonthlyAttendance(calendarYear, calendarMonth);
    } catch (err) {
      alert(err.message || 'Check-out failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrevMonth = () => {
    if (calendarMonth === 1) {
      setCalendarMonth(12);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 12) {
      setCalendarMonth(1);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div>
      {/* Navigation Tabs if Manager/Admin */}
      {isManagerOrAdmin && (
        <div className="tab-nav">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'my-attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-attendance')}
          >
            My Attendance & Calendar
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'team-attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('team-attendance')}
          >
            Team Attendance Log
          </button>
        </div>
      )}

      {activeTab === 'my-attendance' ? (
        <>
          {/* Daily Check-In / Check-Out Widget */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Daily Attendance
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0A0A0A', marginTop: '4px' }}>
                  Today: {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h2>
                <div style={{ fontSize: '13px', color: '#525252', marginTop: '4px' }}>
                  Standard office threshold: check-in by 09:30 AM · Min 4.5 hours for full-day credit
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {todayRecord ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: '#737373' }}>
                        In: <strong style={{ color: '#0A0A0A' }}>{todayRecord.check_in?.slice(0, 5) || '—'}</strong>
                        {todayRecord.check_out && (
                          <> · Out: <strong style={{ color: '#0A0A0A' }}>{todayRecord.check_out.slice(0, 5)}</strong></>
                        )}
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        <Badge variant={todayRecord.status}>{todayRecord.status.toUpperCase()}</Badge>
                        {todayRecord.total_hours > 0 && (
                          <span style={{ fontSize: '12px', fontWeight: 600, marginLeft: '6px' }}>
                            ({todayRecord.total_hours} hrs)
                          </span>
                        )}
                      </div>
                    </div>

                    {!todayRecord.check_out && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleCheckOut}
                        disabled={actionLoading}
                      >
                        <LogOut size={14} />
                        <span>{actionLoading ? 'Saving...' : 'Check Out'}</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleCheckIn}
                      disabled={actionLoading}
                    >
                      <LogIn size={14} />
                      <span>{actionLoading ? 'Recording...' : 'Check In Now'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Monthly Attendance Calendar */}
          <div className="card">
            {/* Calendar Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h3 className="card-title">
                  {monthNames[calendarMonth - 1]} {calendarYear}
                </h3>
                <p className="muted" style={{ marginTop: '2px' }}>Monthly record and activity summary</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handlePrevMonth}>
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: '13px', fontWeight: 600, padding: '0 8px' }}>
                  {monthNames[calendarMonth - 1]} {calendarYear}
                </span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleNextMonth}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Monthly Metrics Summary Bar */}
            {monthlySummary && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '8px',
                padding: '12px',
                backgroundColor: '#FAFAFA',
                border: '1px solid #E5E5E5',
                borderRadius: '6px',
                marginBottom: '20px',
                textAlign: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#737373', textTransform: 'uppercase' }}>Present</div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: '#0A0A0A' }}>{monthlySummary.present_days}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#737373', textTransform: 'uppercase' }}>Late</div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: '#0A0A0A' }}>{monthlySummary.late_days}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#737373', textTransform: 'uppercase' }}>Half Day</div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: '#0A0A0A' }}>{monthlySummary.half_days}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#737373', textTransform: 'uppercase' }}>Leaves</div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: '#0A0A0A' }}>{monthlySummary.leave_days}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#737373', textTransform: 'uppercase' }}>Absences</div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: '#0A0A0A' }}>{monthlySummary.absent_days}</div>
                </div>
              </div>
            )}

            {/* Calendar Grid */}
            {monthLoading ? (
              <LoadingSkeleton type="table" rows={5} />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, i) => (
                  <div 
                    key={i} 
                    style={{ 
                      textAlign: 'center', 
                      fontSize: '11px', 
                      fontWeight: 600, 
                      color: '#737373', 
                      textTransform: 'uppercase',
                      padding: '6px 0'
                    }}
                  >
                    {dayName}
                  </div>
                ))}

                {/* Offset padding for 1st day of month */}
                {(() => {
                  const firstDayWeekday = new Date(calendarYear, calendarMonth - 1, 1).getDay();
                  return [...Array(firstDayWeekday)].map((_, i) => (
                    <div key={`empty-${i}`} style={{ height: '76px', backgroundColor: '#FAFAFA', borderRadius: '4px' }} />
                  ));
                })()}

                {monthlySummary?.days.map((d, idx) => {
                  const dayNum = new Date(d.date).getDate();
                  const isToday = new Date().toDateString() === new Date(d.date).toDateString();
                  return (
                    <div
                      key={idx}
                      style={{
                        height: '76px',
                        padding: '6px',
                        border: isToday ? '2px solid #0A0A0A' : '1px solid #E5E5E5',
                        borderRadius: '4px',
                        backgroundColor: d.status === 'weekend' ? '#FAFAFA' : '#FFFFFF',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: isToday ? 700 : 500, color: '#0A0A0A' }}>
                          {dayNum}
                        </span>
                        {d.total_hours > 0 && (
                          <span style={{ fontSize: '10px', color: '#737373' }}>
                            {d.total_hours}h
                          </span>
                        )}
                      </div>

                      <div style={{ marginTop: 'auto' }}>
                        {d.status !== 'upcoming' && d.status !== 'weekend' && (
                          <Badge variant={d.status} style={{ fontSize: '10px', padding: '1px 4px' }}>
                            {d.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        )}
                        {d.status === 'weekend' && (
                          <span style={{ fontSize: '10px', color: '#A3A3A3' }}>Weekend</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Team Attendance Log for Managers/Admin */
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h3 className="card-title">Direct Reports Attendance</h3>
              <p className="muted" style={{ marginTop: '2px' }}>Review daily attendance, check-in timestamps, and work hours</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label className="form-label" style={{ margin: 0 }}>Date:</label>
              <input
                type="date"
                className="form-input"
                style={{ width: 'auto', padding: '6px 10px', fontSize: '13px' }}
                value={teamDate}
                onChange={(e) => setTeamDate(e.target.value)}
              />
            </div>
          </div>

          {teamLoading ? (
            <LoadingSkeleton type="table" rows={5} />
          ) : teamRecords.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No attendance records"
              description={`No members have checked in or recorded attendance for ${teamDate}.`}
            />
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Employee Name</th>
                    <th>Department</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Total Hours</th>
                    <th>Status</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {teamRecords.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600, color: '#525252' }}>{r.employee_code}</td>
                      <td style={{ fontWeight: 600 }}>{r.employee_name}</td>
                      <td>{r.department_name || '—'}</td>
                      <td>{r.check_in ? r.check_in.slice(0, 5) : '—'}</td>
                      <td>{r.check_out ? r.check_out.slice(0, 5) : '—'}</td>
                      <td className="num-col">{r.total_hours > 0 ? `${r.total_hours} hrs` : '—'}</td>
                      <td>
                        <Badge variant={r.status}>{r.status.toUpperCase()}</Badge>
                      </td>
                      <td style={{ fontSize: '12px', color: '#525252' }}>{r.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

