import React from 'react';

export function DepartmentChart({ data = [] }) {
  if (!data || data.length === 0) {
    return <p className="muted" style={{ padding: '20px 0' }}>No department statistics available.</p>;
  }

  const maxVal = Math.max(...data.map(d => d.count), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {data.map((item, idx) => {
        const pct = Math.round((item.count / maxVal) * 100);
        return (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ fontWeight: 500, color: '#0A0A0A' }}>{item.department}</span>
              <span style={{ fontWeight: 600, color: '#525252' }}>
                {item.count} {item.count === 1 ? 'employee' : 'employees'}
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '18px',
              backgroundColor: '#F5F5F5',
              border: '1px solid #E5E5E5',
              borderRadius: '4px',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <div 
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  backgroundColor: '#0A0A0A',
                  transition: 'width 0.3s ease',
                  borderRadius: '3px'
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

