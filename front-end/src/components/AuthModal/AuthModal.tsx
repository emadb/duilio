import React, { useState } from 'react';
import { login, register } from '../../services/api';

interface AuthModalProps {
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'register') {
        await register(email, password);
        setMode('login');
        setPassword('');
        return;
      }
      await login(email, password);
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--eui-page-background)',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'var(--eui-bg-plain)',
          border: '1px solid var(--eui-border-color)',
          borderRadius: 'var(--eui-border-radius-large)',
          padding: 32,
        }}
      >
        {/* Logo + title */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <svg
            width={40}
            height={40}
            viewBox="0 0 16 16"
            fill="var(--eui-color-primary)"
            style={{ marginBottom: 12 }}
          >
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
            <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z" />
          </svg>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--eui-title-color)',
              fontFamily: 'var(--eui-font-family)',
            }}
          >
            Duilio
          </h1>
          <p
            style={{
              margin: '6px 0 0',
              fontSize: 13,
              color: 'var(--eui-text-subdued)',
              fontFamily: 'var(--eui-font-family)',
            }}
          >
            {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              marginBottom: 16,
              background: 'var(--eui-bg-base-danger)',
              border: '1px solid var(--eui-border-color-danger)',
              borderRadius: 6,
              fontSize: 13,
              color: 'var(--eui-text-danger)',
              fontFamily: 'var(--eui-font-family)',
            }}
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@example.com"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>
          <button type="submit" disabled={loading} style={primaryButtonStyle}>
            {loading
              ? 'Please wait…'
              : mode === 'login'
              ? 'Sign in'
              : 'Create account'}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
            style={linkButtonStyle}
          >
            {mode === 'login'
              ? "Don't have an account? Register"
              : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--eui-text-color)',
  fontFamily: 'var(--eui-font-family)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 36,
  padding: '0 12px',
  border: '1px solid var(--eui-form-border-color)',
  borderRadius: 'var(--eui-border-radius-medium)',
  fontFamily: 'var(--eui-font-family)',
  fontSize: 13,
  color: 'var(--eui-text-color)',
  background: 'var(--eui-form-background)',
  outline: 'none',
  boxSizing: 'border-box',
};

const primaryButtonStyle: React.CSSProperties = {
  width: '100%',
  height: 38,
  padding: '0 16px',
  border: 'none',
  borderRadius: 6,
  background: 'var(--eui-color-primary)',
  color: '#fff',
  fontFamily: 'var(--eui-font-family)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
};

const linkButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--eui-color-primary)',
  fontFamily: 'var(--eui-font-family)',
  fontSize: 13,
  cursor: 'pointer',
  textDecoration: 'underline',
};
