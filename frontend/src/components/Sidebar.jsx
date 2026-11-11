import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  CalendarCheck, 
  CalendarDays, 
  User, 
  Database,
  ShieldCheck,
  Briefcase
} from 'lucide-react';
import { Badge } from './Badge';

export function Sidebar({ currentPath, onNavigate, user }) {
  const role = user?.role || 'employee';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'employee'] },
    { id: 'employees', label: 'Employees', icon: Users, roles: ['admin', 'manager', 'employee'] },
    { id: 'departments', label: 'Departments', icon: Building2, roles: ['admin', 'manager', 'employee'] },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck, roles: ['admin', 'manager', 'employee'] },
    { id: 'leaves', label: 'Leaves', icon: CalendarDays, roles: ['admin', 'manager', 'employee'] },
    { id: 'profile', label: 'My Profile', icon: User, roles: ['admin', 'manager', 'employee'] },
    { id: 'data-manager', label: 'Data Manager', icon: Database, roles: ['admin'] },
  ];

  const allowedItems = navItems.filter(item => item.roles.includes(role));

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '6px',
          backgroundColor: '#0A0A0A',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '13px'
        }}>
          HR
        </div>
        <div>
          <div className="sidebar-brand-title">Enterprise HR</div>
          <div className="sidebar-brand-sub">Portal & Directory</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Menu</div>
        {allowedItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPath === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
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
            fontSize: '12px'
          }}>
            {user?.employee?.first_name ? user.employee.first_name[0] : (user?.email?.[0]?.toUpperCase() || 'U')}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ 
              fontSize: '13px', 
              fontWeight: 600, 
              color: '#0A0A0A', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              whiteSpace: 'nowrap' 
            }}>
              {user?.employee ? `${user.employee.first_name} ${user.employee.last_name}` : user?.email}
            </div>
            <div style={{ marginTop: '2px' }}>
              <Badge variant={role}>{role.toUpperCase()}</Badge>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

