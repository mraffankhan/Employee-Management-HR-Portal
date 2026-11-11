import React, { useState } from 'react';
import { LogOut, ArrowRightLeft, UserCheck } from 'lucide-react';
import { Badge } from './Badge';

export function Topbar({ title, user, onLogout, onQuickSwitch }) {
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);

  const demoAccounts = [
    { label: 'Admin (HR Lead)', email: 'admin@company.com', role: 'admin' },
    { label: 'Manager (Engineering)', email: 'rajesh.kumar@company.com', role: 'manager' },
    { label: 'Employee (Active)', email: 'vikram.aditya@company.com', role: 'employee' },
    { label: 'Employee (Probation)', email: 'rohit.verma@company.com', role: 'employee' },
  ];

  return (
    <header className="topbar">
      <div>
        <h1 className="topbar-title">{title}</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Quick Persona Switcher for pair-programming and demo convenience */}
        <div style={{ position: 'relative' }}>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => setShowSwitchMenu(!showSwitchMenu)}
            title="Switch demo persona"
          >
            <ArrowRightLeft size={14} />
            <span>Switch Role</span>
          </button>

          {showSwitchMenu && (
            <div 
              style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                marginTop: '6px',
                width: '260px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E5E5',
                borderRadius: '6px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                zIndex: 60,
                padding: '6px'
              }}
            >
              <div style={{ 
                padding: '6px 8px', 
                fontSize: '11px', 
                fontWeight: 600, 
                color: '#737373', 
                textTransform: 'uppercase',
                borderBottom: '1px solid #F5F5F5'
              }}>
                Instant Persona Switch
              </div>
              {demoAccounts.map((acc, i) => (
                <button
                  key={i}
                  type="button"
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    fontSize: '13px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: user?.email === acc.email ? '#F5F5F5' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    marginTop: '2px'
                  }}
                  onClick={() => {
                    setShowSwitchMenu(false);
                    onQuickSwitch(acc.email, acc.role === 'admin' ? 'Admin@1234' : (acc.role === 'manager' ? 'Manager@1234' : 'Employee@1234'));
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: '#0A0A0A' }}>{acc.label}</span>
                    <Badge variant={acc.role}>{acc.role}</Badge>
                  </div>
                  <span style={{ fontSize: '11px', color: '#737373' }}>{acc.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button 
          type="button" 
          className="btn btn-secondary btn-sm" 
          onClick={onLogout}
          title="Sign out of current account"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}

