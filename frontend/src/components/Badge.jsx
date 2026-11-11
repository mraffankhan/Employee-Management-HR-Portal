import React from 'react';

export function Badge({ children, variant = 'default', className = '' }) {
  // Normalize variant strings like "present", "pending", "approved", "rejected", "half_day", "late", "absent"
  const cleanVar = String(variant).toLowerCase().replace(/\s+/g, '_');
  let variantClass = 'badge-outline';

  if (['approved', 'present', 'active'].includes(cleanVar)) {
    variantClass = 'badge-status-approved';
  } else if (['pending', 'late', 'probation'].includes(cleanVar)) {
    variantClass = 'badge-status-pending';
  } else if (['rejected', 'absent', 'deactivated'].includes(cleanVar)) {
    variantClass = 'badge-status-rejected';
  } else if (['half_day', 'notice'].includes(cleanVar)) {
    variantClass = 'badge-status-half_day';
  } else if (['admin', 'manager'].includes(cleanVar)) {
    variantClass = 'badge-solid';
  } else if (cleanVar === 'employee') {
    variantClass = 'badge-outline';
  }

  return (
    <span className={`badge ${variantClass} ${className}`}>
      {children}
    </span>
  );
}

