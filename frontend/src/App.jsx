import React, { useState, useEffect } from 'react';
import { authApi } from './api/auth';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Employees } from './pages/Employees';
import { EmployeeDetail } from './pages/EmployeeDetail';
import { Departments } from './pages/Departments';
import { Attendance } from './pages/Attendance';
import { Leaves } from './pages/Leaves';
import { Profile } from './pages/Profile';
import { DataManager } from './pages/DataManager';
import { LoadingSkeleton } from './components/LoadingSkeleton';

export function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [currentPath, setCurrentPath] = useState('dashboard');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const user = await authApi.getMe();
      setCurrentUser(user);
    } catch {
      setCurrentUser(null);
    } finally {
      setAuthChecking(false);
    }
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setCurrentPath('dashboard');
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error(err);
    } finally {
      setCurrentUser(null);
      setCurrentPath('dashboard');
    }
  };

  const handleQuickSwitch = async (email, password) => {
    try {
      const user = await authApi.login(email, password);
      setCurrentUser(user);
      // If current path was data-manager and switched user is not admin, reset to dashboard
      if (currentPath === 'data-manager' && user.role !== 'admin') {
        setCurrentPath('dashboard');
      }
    } catch (err) {
      alert(`Quick switch failed: ${err.message}`);
    }
  };

  const handleNavigate = (path) => {
    // Role guard: Data manager is strictly Admin only
    if (path === 'data-manager' && currentUser?.role !== 'admin') {
      alert('Access restricted to administrators.');
      return;
    }
    setCurrentPath(path);
  };

  const handleSelectEmployee = (id) => {
    setSelectedEmployeeId(id);
    setCurrentPath('employee-detail');
  };

  const handleBackToEmployees = () => {
    setSelectedEmployeeId(null);
    setCurrentPath('employees');
  };

  if (authChecking) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAFAFA'
      }}>
        <div style={{ width: '280px' }}>
          <div className="skeleton" style={{ height: '36px', marginBottom: '12px' }} />
          <div className="skeleton" style={{ height: '20px' }} />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Page title mapping
  const pageTitles = {
    'dashboard': 'Enterprise Dashboard',
    'employees': 'Employee Directory',
    'employee-detail': 'Employee Profile',
    'departments': 'Departments & Designations',
    'attendance': 'Attendance Management',
    'leaves': 'Leave Administration',
    'profile': 'My Account',
    'data-manager': 'Data Manager',
  };

  return (
    <Layout
      currentPath={currentPath}
      onNavigate={handleNavigate}
      user={currentUser}
      onLogout={handleLogout}
      onQuickSwitch={handleQuickSwitch}
      pageTitle={pageTitles[currentPath]}
    >
      {currentPath === 'dashboard' && (
        <Dashboard user={currentUser} onNavigate={handleNavigate} />
      )}

      {currentPath === 'employees' && (
        <Employees 
          user={currentUser} 
          onSelectEmployee={handleSelectEmployee} 
        />
      )}

      {currentPath === 'employee-detail' && (
        <EmployeeDetail 
          employeeId={selectedEmployeeId || currentUser?.employee?.id} 
          currentUser={currentUser} 
          onBack={handleBackToEmployees} 
        />
      )}

      {currentPath === 'departments' && (
        <Departments user={currentUser} />
      )}

      {currentPath === 'attendance' && (
        <Attendance user={currentUser} />
      )}

      {currentPath === 'leaves' && (
        <Leaves user={currentUser} />
      )}

      {currentPath === 'profile' && (
        <Profile user={currentUser} onUserUpdated={checkAuth} />
      )}

      {currentPath === 'data-manager' && currentUser.role === 'admin' && (
        <DataManager user={currentUser} />
      )}
    </Layout>
  );
}

export default App;
