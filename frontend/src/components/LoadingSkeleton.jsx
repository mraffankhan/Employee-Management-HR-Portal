import React from 'react';

export function LoadingSkeleton({ type = 'table', rows = 5 }) {
  if (type === 'cards') {
    return (
      <div className="grid-4" style={{ marginBottom: '24px' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="stat-card" style={{ height: '96px' }}>
            <div className="skeleton" style={{ width: '40%', height: '14px', marginBottom: '8px' }} />
            <div className="skeleton" style={{ width: '60%', height: '28px' }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="table-container" style={{ padding: '16px' }}>
      <div className="skeleton" style={{ width: '100%', height: '36px', marginBottom: '12px' }} />
      {[...Array(rows)].map((_, i) => (
        <div 
          key={i} 
          className="skeleton" 
          style={{ width: '100%', height: '44px', marginBottom: '8px' }} 
        />
      ))}
    </div>
  );
}

