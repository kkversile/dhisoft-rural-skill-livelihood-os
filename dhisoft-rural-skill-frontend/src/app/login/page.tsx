'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const prefillLocalLogin = process.env.NEXT_PUBLIC_ENABLE_LOCAL_LOGIN_PREFILL === 'true';
  const defaultTenantSlug = prefillLocalLogin ? process.env.NEXT_PUBLIC_LOCAL_LOGIN_TENANT_SLUG || '' : '';
  const defaultEmail = prefillLocalLogin ? process.env.NEXT_PUBLIC_LOCAL_LOGIN_EMAIL || '' : '';
  const defaultPassword = prefillLocalLogin ? process.env.NEXT_PUBLIC_LOCAL_LOGIN_PASSWORD || '' : '';

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          tenantSlug: form.get('tenantSlug'),
          email: form.get('email'),
          password: form.get('password'),
        }),
      });
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Check tenant, email and password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 470, margin: '50px auto', padding: 30 }}>
      <p className="eyebrow">SECURE TENANT ACCESS</p>
      <h1 style={{ fontSize: 27, margin: '0 0 10px' }}>Tenant login</h1>
      <p className="lede" style={{ marginBottom: 25 }}>
        Sign in to your DHISOFT tenant workspace. Sessions use HTTP-only cookies and rotating refresh tokens.
      </p>
      <form onSubmit={submit} style={{ display: 'grid', gap: 13 }}>
        <label>Tenant slug<input className="search" style={{ maxWidth: 'none', marginTop: 6 }} name="tenantSlug" defaultValue={defaultTenantSlug} required /></label>
        <label>Email<input className="search" style={{ maxWidth: 'none', marginTop: 6 }} name="email" type="email" defaultValue={defaultEmail} required /></label>
        <label>Password<input className="search" style={{ maxWidth: 'none', marginTop: 6 }} type="password" name="password" defaultValue={defaultPassword} required /></label>
        {error && <div className="alert error">{error}</div>}
        <button className="primary" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
      </form>
      <p style={{ fontSize: 11, color: '#8290a1', lineHeight: 1.6, marginTop: 23 }}>
        Seed accounts are documented for local development only. Change all passwords before shared use.
      </p>
    </div>
  );
}
