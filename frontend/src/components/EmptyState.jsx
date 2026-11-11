import React from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({
  icon: Icon = Inbox,
  title = "No records found",
  description = "There are no entries matching your current filters or query.",
  actionLabel,
  onAction,
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon size={36} strokeWidth={1.5} />
      </div>
      <h4 className="empty-title">{title}</h4>
      <p className="empty-desc">{description}</p>
      {actionLabel && onAction && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

