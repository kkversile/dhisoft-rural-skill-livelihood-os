'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type NavItem = { label: string; href: string };
type NavGroup = { code: string; label: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    code: '01',
    label: 'Candidate journey',
    items: [
      { label: 'Candidates', href: '/candidates' },
      { label: 'Counselling', href: '/counselling' },
      { label: 'Trade recommendations', href: '/recommendations' },
    ],
  },
  {
    code: '02',
    label: 'Training delivery',
    items: [
      { label: 'Trades and skills', href: '/trades-and-skills' },
      { label: 'Courses', href: '/courses' },
      { label: 'Training partners', href: '/partners' },
      { label: 'Training centres', href: '/centres' },
      { label: 'Trainers', href: '/trainers' },
      { label: 'Batches', href: '/batches' },
      { label: 'Attendance', href: '/attendance' },
      { label: 'Assignments', href: '/assignments' },
      { label: 'Assessments', href: '/assessments' },
      { label: 'Certificates', href: '/certificates' },
    ],
  },
  {
    code: '03',
    label: 'Employment outcomes',
    items: [
      { label: 'Employers', href: '/employers' },
      { label: 'Vacancies', href: '/vacancies' },
      { label: 'Applications', href: '/applications' },
      { label: 'Interviews', href: '/interviews' },
      { label: 'Offers', href: '/offers' },
      { label: 'Apprenticeships', href: '/apprenticeships' },
      { label: 'Placements', href: '/placements' },
      { label: 'Retention', href: '/retention' },
      { label: 'Earnings', href: '/earnings' },
    ],
  },
  {
    code: '04',
    label: 'Local work & safety',
    items: [
      { label: 'Service areas', href: '/service-areas' },
      { label: 'Service opportunities', href: '/service-opportunities' },
      { label: 'Service bookings', href: '/service-bookings' },
      { label: 'Complaints', href: '/complaints' },
      { label: 'Payments', href: '/payments' },
      { label: 'Payouts', href: '/payouts' },
    ],
  },
  {
    code: '05',
    label: 'Governance',
    items: [
      { label: 'Reports', href: '/reports' },
      { label: 'Audit history', href: '/audit' },
      { label: 'Documents', href: '/documents' },
    ],
  },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const [lang, setLang] = useState('en');
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setLang(document.cookie.match(/(?:^|; )dhisoft_lang=([^;]+)/)?.[1] || 'en');
  }, []);

  const choose = (value: string) => {
    document.cookie = `dhisoft_lang=${value};path=/;max-age=31536000`;
    setLang(value);
  };

  async function logout() {
    setLoggingOut(true);
    try {
      await api('/auth/logout', { method: 'POST', body: '{}' });
    } finally {
      router.push('/login');
      router.refresh();
      setLoggingOut(false);
    }
  }

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">D</span>
          <div className="brand-copy">
            <strong>DHISOFT</strong>
            <small>Rural Skill OS</small>
          </div>
        </div>

        <div className="tenant-card">
          <span className="tenant-label">ACTIVE TENANT</span>
          <strong>Telangana Rural Pilot</strong>
          <span className="tenant-meta"><span className="tenant-status" /> Tenant workspace</span>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <span className="nav-kicker">Workspace</span>
          <Link className={`nav-home ${isActive('/') ? 'active' : ''}`} href="/" aria-current={isActive('/') ? 'page' : undefined}>
            <span className="nav-home-icon">⌂</span>
            <span>Overview</span>
            <span className="nav-link-arrow">›</span>
          </Link>

          <div className="nav-groups">
            {groups.map((group) => (
              <div className="nav-group" key={group.label}>
                <div className="nav-group-heading">
                  <span className="nav-number">{group.code}</span>
                  <span>{group.label}</span>
                  <span className="nav-count">{group.items.length}</span>
                </div>
                <div className="nav-links">
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link className={`nav-link ${active ? 'active' : ''}`} key={item.href} href={item.href} aria-current={active ? 'page' : undefined}>
                        <span className="nav-link-dot" />
                        <span className="nav-link-label">{item.label}</span>
                        {active && <span className="nav-link-arrow">›</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className="sidebar-footer">
          <strong>Adult pilot · v1.0</strong>
          <span>Secure, tenant-scoped workspace</span>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div className="mobile-brand">DHISOFT <span>Rural Skill OS</span></div>
          <div className="topbar-actions">
            <label className="language">
              Language
              <select value={lang} onChange={(event) => choose(event.target.value)}>
                <option value="en">English</option>
                <option value="te">తెలుగు</option>
                <option value="hi">हिन्दी</option>
              </select>
            </label>
            {pathname === '/login' ? <Link className="user-chip" href="/login">Sign in</Link> : <><div className="user-chip"><span className="avatar">RP</span><span>Rural Pilot</span></div><button className="logout-button" type="button" onClick={logout} disabled={loggingOut}>{loggingOut ? 'Signing out...' : 'Log out'}</button></>}
          </div>
        </header>
        <div className="page-wrap">{children}</div>
      </main>
    </div>
  );
}
