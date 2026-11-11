import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function Layout({ currentPath, onNavigate, user, onLogout, onQuickSwitch, children, pageTitle }) {
  return (
    <div className="app-container">
      <Sidebar currentPath={currentPath} onNavigate={onNavigate} user={user} />
      <div className="main-wrapper">
        <Topbar 
          title={pageTitle || 'HR Portal'} 
          user={user} 
          onLogout={onLogout} 
          onQuickSwitch={onQuickSwitch} 
        />
        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
}

