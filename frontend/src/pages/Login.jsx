import React, { useState } from 'react';
import { authApi } from '../api/auth';
import { Badge } from '../components/Badge';
import { ArrowRight, Lock, Mail, Shield } from 'lucide-react';

export function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const demoAccounts = [
    { role: 'Admin / HR', email: 'admin@company.com', pass: 'Admin@1234', desc: 'Full portal access & Data Manager' },
    { role: 'Manager', email: 'rajesh.kumar@company.com', pass: 'Manager@1234', desc: 'Team approvals & team attendance' },
    { role: 'Employee', email: 'vikram.aditya@company.com', pass: 'Employee@1234', desc: 'Attendance, leaves & profile' },
    { role: 'Probation', email: 'rohit.verma@company.com', pass: 'Employee@1234', desc: 'Probation leave policy rule check' },
  ];

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const user = await authApi.login(email.trim(), password);
      onLoginSuccess(user);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDemo = (accEmail, accPass) => {
    setEmail(accEmail);
    setPassword(accPass);
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      backgroundColor: '#FAFAFA'
    }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            backgroundColor: '#0A0A0A',
            color: '#FFFFFF',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '16px',
            marginBottom: '12px'
          }}>
            HR
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#0A0A0A', letterSpacing: '-0.02em' }}>
            Enterprise HR Portal
          </h1>
          <p style={{ fontSize: '13px', color: '#737373', marginTop: '4px' }}>
            Sign in to access employee management and records
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '28px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          {error && (
            <div style={{
              padding: '10px 14px',
              border: '1px solid #0A0A0A',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#0A0A0A',
              backgroundColor: '#FAFAFA',
              marginBottom: '20px',
              fontWeight: 500
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                className="form-input"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '8px', height: '40px' }}
              disabled={isLoading || !email || !password}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Demo quick picker */}
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #E5E5E5' }}>
            <div style={{ 
              fontSize: '11px', 
              fontWeight: 600, 
              color: '#737373', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em',
              marginBottom: '10px'
            }}>
              Quick Demo Accounts
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {demoAccounts.map((acc, idx) => (
                <button
                  key={idx}
                  type="button"
                  style={{
                    padding: '8px 10px',
                    textAlign: 'left',
                    border: '1px solid #E5E5E5',
                    borderRadius: '6px',
                    backgroundColor: email === acc.email ? '#0A0A0A' : '#FFFFFF',
                    color: email === acc.email ? '#FFFFFF' : '#0A0A0A',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => handleSelectDemo(acc.email, acc.pass)}
                >
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>{acc.role}</div>
                  <div style={{ 
                    fontSize: '10px', 
                    color: email === acc.email ? '#D4D4D4' : '#737373',
                    marginTop: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {acc.email}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

