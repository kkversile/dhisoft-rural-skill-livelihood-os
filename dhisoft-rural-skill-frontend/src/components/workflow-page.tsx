'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

type Field = { name: string; label: string; type?: string; required?: boolean };
type Row = Record<string, unknown>;
type PageConfig = { title: string; description: string; fields: Field[]; columns: string[]; addLabel?: string; video?: boolean };
type CourseAccess = { title: string; videoAvailable: boolean; subscriptionRequired: boolean; subscribed: boolean; accessGranted: boolean; embedUrl: string | null };

const config: Record<string, PageConfig> = {
  courses: { title: 'Courses', description: 'Publish structured learning with optional subscription-gated YouTube lessons.', fields: [{ name: 'tradeId', label: 'Trade ID', required: true }, { name: 'code', label: 'Course code', required: true }, { name: 'title', label: 'Course title', required: true }, { name: 'durationDays', label: 'Duration days', type: 'number', required: true }, { name: 'theoryHours', label: 'Theory hours', type: 'number', required: true }, { name: 'practicalHours', label: 'Practical hours', type: 'number', required: true }, { name: 'language', label: 'Language', required: true }, { name: 'status', label: 'Status' }, { name: 'youtubeUrl', label: 'YouTube lesson URL', type: 'url' }], columns: ['code', 'title', 'language', 'status', 'youtubeUrl'], video: true },
  counselling: { title: 'Counselling', description: 'Capture interests, aptitude, constraints and follow-up commitments.', fields: [{ name: 'candidateId', label: 'Candidate ID', required: true }, { name: 'counsellorId', label: 'Counsellor ID', required: true }, { name: 'sessionDate', label: 'Session date', type: 'date', required: true }, { name: 'interests', label: 'Interests' }, { name: 'aptitude', label: 'Aptitude' }, { name: 'locationPreference', label: 'Location preference' }, { name: 'notes', label: 'Notes' }], columns: ['candidateId', 'sessionDate', 'status'] },
  recommendations: { title: 'Trade recommendations', description: 'Explainable recommendations connect candidate strengths to employer and service demand.', fields: [], columns: ['candidateId', 'tradeId', 'score', 'status'] },
  partners: { title: 'Training partners', description: 'Verify and monitor organisations delivering approved training.', fields: [{ name: 'name', label: 'Partner name', required: true }, { name: 'registrationNumber', label: 'Registration number' }, { name: 'status', label: 'Status' }], columns: ['name', 'registrationNumber', 'status'] },
  trainers: { title: 'Trainers', description: 'Maintain trainer capability and specialisations.', fields: [{ name: 'name', label: 'Trainer name', required: true }, { name: 'phone', label: 'Phone' }, { name: 'specialisations', label: 'Specialisations (comma separated)' }], columns: ['name', 'phone', 'status'] },
  centres: { title: 'Training centres', description: 'Approved centres, capacity and district coverage.', fields: [{ name: 'name', label: 'Centre name', required: true }, { name: 'district', label: 'District', required: true }, { name: 'capacity', label: 'Capacity', type: 'number', required: true }, { name: 'status', label: 'Status' }], columns: ['name', 'district', 'capacity', 'status'] },
  batches: { title: 'Batches', description: 'Plan cohorts against published curriculum versions and centre capacity.', fields: [{ name: 'name', label: 'Batch name', required: true }, { name: 'courseId', label: 'Course ID', required: true }, { name: 'curriculumVersionId', label: 'Curriculum version ID', required: true }, { name: 'centreId', label: 'Centre ID', required: true }, { name: 'startDate', label: 'Start date', type: 'date', required: true }, { name: 'endDate', label: 'End date', type: 'date', required: true }, { name: 'capacity', label: 'Capacity', type: 'number', required: true }], columns: ['name', 'startDate', 'endDate', 'capacity', 'status'] },
  attendance: { title: 'Attendance', description: 'Record theory and practical attendance with traceable dates and reasons.', fields: [{ name: 'candidateId', label: 'Candidate ID', required: true }, { name: 'batchId', label: 'Batch ID', required: true }, { name: 'enrollmentId', label: 'Enrollment ID', required: true }, { name: 'attendanceDate', label: 'Date', type: 'date', required: true }, { name: 'sessionType', label: 'Session type', required: true }, { name: 'status', label: 'Present / absent', required: true }, { name: 'reason', label: 'Reason' }], columns: ['candidateId', 'attendanceDate', 'sessionType', 'status'] },
  assignments: { title: 'Practical assignments', description: 'Assign practical work, collect evidence and evaluate field readiness.', fields: [{ name: 'candidateId', label: 'Candidate ID', required: true }, { name: 'batchId', label: 'Batch ID', required: true }, { name: 'enrollmentId', label: 'Enrollment ID', required: true }, { name: 'title', label: 'Assignment title', required: true }, { name: 'instructions', label: 'Instructions', required: true }, { name: 'dueDate', label: 'Due date', type: 'date' }], columns: ['title', 'candidateId', 'dueDate', 'status'] },
  assessments: { title: 'Assessments', description: 'Schedule theory and practical assessment events.', fields: [{ name: 'batchId', label: 'Batch ID', required: true }, { name: 'courseId', label: 'Course ID', required: true }, { name: 'name', label: 'Assessment name', required: true }, { name: 'assessmentType', label: 'Theory / practical', required: true }, { name: 'scheduledAt', label: 'Scheduled at', type: 'datetime-local', required: true }], columns: ['name', 'assessmentType', 'scheduledAt', 'status'] },
  apprenticeships: { title: 'Apprenticeships', description: 'Track supervised work, stipend and progression before employment.', fields: [{ name: 'candidateId', label: 'Candidate ID', required: true }, { name: 'tradeId', label: 'Trade ID', required: true }, { name: 'providerName', label: 'Provider name', required: true }, { name: 'startDate', label: 'Start date', type: 'date', required: true }, { name: 'stipend', label: 'Monthly stipend', type: 'number', required: true }], columns: ['providerName', 'candidateId', 'startDate', 'stipend', 'status'] },
  employers: { title: 'Employers', description: 'Verify employers and capture district-level demand.', fields: [{ name: 'name', label: 'Employer name', required: true }, { name: 'district', label: 'District', required: true }, { name: 'phone', label: 'Phone' }, { name: 'email', label: 'Email' }], columns: ['name', 'district', 'status'] },
  vacancies: { title: 'Vacancies', description: 'Publish safe, consent-aware employment demand.', fields: [{ name: 'employerId', label: 'Employer ID', required: true }, { name: 'tradeId', label: 'Trade ID', required: true }, { name: 'title', label: 'Role title', required: true }, { name: 'openings', label: 'Openings', type: 'number', required: true }, { name: 'salaryMin', label: 'Minimum salary', type: 'number', required: true }, { name: 'salaryMax', label: 'Maximum salary', type: 'number', required: true }, { name: 'location', label: 'Location', required: true }, { name: 'risks', label: 'Risks and controls', required: true }], columns: ['title', 'location', 'openings', 'salaryMin', 'status'] },
  serviceAreas: { title: 'Service areas', description: 'Define districts and postal coverage for local service work.', fields: [{ name: 'name', label: 'Area name', required: true }, { name: 'district', label: 'District', required: true }, { name: 'postalCodes', label: 'Postal codes (comma separated)' }], columns: ['name', 'district', 'status'] },
  serviceOpportunities: { title: 'Service opportunities', description: 'Match certified technicians to local service demand.', fields: [{ name: 'serviceAreaId', label: 'Service area ID', required: true }, { name: 'tradeId', label: 'Trade ID', required: true }, { name: 'title', label: 'Opportunity title', required: true }, { name: 'description', label: 'Description', required: true }, { name: 'price', label: 'Price', type: 'number', required: true }], columns: ['title', 'price', 'status'] },
  serviceBookings: { title: 'Service bookings', description: 'Manage customer requests, safety, payment and technician completion.', fields: [{ name: 'opportunityId', label: 'Opportunity ID', required: true }, { name: 'candidateId', label: 'Technician candidate ID', required: true }, { name: 'customerName', label: 'Customer name', required: true }, { name: 'customerMobile', label: 'Customer mobile', required: true }, { name: 'serviceAddress', label: 'Service address', required: true }, { name: 'agreedAmount', label: 'Agreed amount', type: 'number', required: true }], columns: ['customerName', 'scheduledAt', 'agreedAmount', 'status'] },
  complaints: { title: 'Safety and complaints', description: 'Route complaints with severity, ownership, resolution and escalation history.', fields: [{ name: 'candidateId', label: 'Candidate ID' }, { name: 'category', label: 'Category', required: true }, { name: 'description', label: 'Description', required: true }, { name: 'severity', label: 'Severity', required: true }], columns: ['category', 'severity', 'status', 'createdAt'] },
  payments: { title: 'Payments', description: 'Record provider-agnostic customer and employment payment events.', fields: [{ name: 'serviceBookingId', label: 'Service booking ID' }, { name: 'placementId', label: 'Placement ID' }, { name: 'amount', label: 'Amount', type: 'number', required: true }, { name: 'provider', label: 'Provider' }, { name: 'providerReference', label: 'Provider reference' }], columns: ['amount', 'provider', 'status', 'createdAt'] },
  payouts: { title: 'Payouts', description: 'Process idempotent technician payouts with tenant-scoped status.', fields: [{ name: 'paymentId', label: 'Payment ID' }, { name: 'serviceBookingId', label: 'Service booking ID' }, { name: 'candidateId', label: 'Candidate ID' }, { name: 'amount', label: 'Amount', type: 'number', required: true }, { name: 'idempotencyKey', label: 'Idempotency key', required: true }], columns: ['amount', 'status', 'processedAt'] },
  earnings: { title: 'Earnings and income outcomes', description: 'Verify monthly gross and net income to measure livelihood outcomes.', addLabel: 'Add Earning', fields: [{ name: 'candidateId', label: 'Candidate ID', required: true }, { name: 'month', label: 'Month', type: 'date', required: true }, { name: 'gross', label: 'Gross income', type: 'number', required: true }, { name: 'net', label: 'Net income', type: 'number', required: true }, { name: 'source', label: 'Source', required: true }], columns: ['candidateId', 'month', 'net', 'source', 'verified'] },
};

export default function WorkflowPage({ resource }: { resource: string }) {
  const current = config[resource] || { title: resource, description: 'Tenant-scoped workflow records.', fields: [], columns: ['id', 'status', 'createdAt'] };
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const requestSequence = useRef(0);

  const load = () => {
    const sequence = ++requestSequence.current;
    setLoading(true);
    api<{ data: Row[] }>(`/workflow/${resource}?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`)
      .then((result) => { if (sequence === requestSequence.current) setData(result.data); })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load data'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [resource, status]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload: Row = {};
    current.fields.forEach((field) => {
      const value = String(formData.get(field.name) || '').trim();
      if (!value) return;
      if (field.name === 'specialisations' || field.name === 'postalCodes') payload[field.name] = value.split(',').map((item) => item.trim());
      else if (field.type === 'number') payload[field.name] = Number(value);
      else payload[field.name] = field.type?.includes('date') ? new Date(value).toISOString() : value;
    });

    try {
      requestSequence.current += 1;
      const created = await api<Row>(`/workflow/${resource}`, { method: 'POST', body: JSON.stringify({ data: payload }) });
      form.reset();
      setOpen(false);
      setError('');
      setData((currentData) => [created, ...currentData]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save');
    } finally {
      setBusy(false);
    }
  };

  const visible = useMemo(() => data, [data]);
  const singularTitle = current.title.endsWith('ies') ? `${current.title.slice(0, -3)}y` : current.title.endsWith('s') ? current.title.slice(0, -1) : current.title;
  const addLabel = current.addLabel || `Add ${singularTitle}`;

  return <>
    <div className="breadcrumb"><Link href="/">Overview</Link><span>/</span>{current.title}</div>
    <div className="page-heading"><div><p className="eyebrow">TENANT WORKSPACE</p><h1>{current.title}</h1><p className="lede">{current.description}</p></div><button className="primary" onClick={() => setOpen(!open)}>{open ? 'Close form' : addLabel}</button></div>
    {error && <div className="alert error">{error}<button onClick={() => setError('')}>Dismiss</button></div>}
    {open && <form className="card form-card" onSubmit={submit}><div className="form-grid">{current.fields.map((field) => <label key={field.name}>{field.label}{field.type === 'textarea' ? <textarea name={field.name} required={field.required} /> : <input name={field.name} type={field.type || 'text'} required={field.required} />}</label>)}</div><button className="primary" disabled={busy}>{busy ? 'Saving...' : 'Save record'}</button></form>}
    <div className="toolbar"><input className="search" placeholder="Search this workspace" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') load(); }} /><select className="search" aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="OPEN">OPEN</option><option value="VERIFIED">VERIFIED</option><option value="PUBLISHED">PUBLISHED</option><option value="ACTIVE">ACTIVE</option><option value="IN_PROGRESS">IN_PROGRESS</option><option value="RESOLVED">RESOLVED</option><option value="CLOSED">CLOSED</option><option value="COMPLETED">COMPLETED</option><option value="REJECTED">REJECTED</option><option value="CANCELLED">CANCELLED</option></select><button className="secondary" onClick={load}>Refresh</button><span className="record-count">{data.length} records</span></div>
    <div className="card table-card">{loading ? <div className="state">Loading tenant records...</div> : !visible.length ? <div className="state"><strong>No records yet</strong><span>Create the first record to begin this workflow.</span></div> : <div className="table-scroll"><table><thead><tr>{current.columns.map((column) => <th key={column}>{column.replace(/[A-Z]/g, (match) => ` ${match}`).replace(/^./, (match) => match.toUpperCase())}</th>)}<th>Action</th></tr></thead><tbody>{visible.map((row) => <tr key={String(row.id)}>{current.columns.map((column) => <td key={column}>{column === 'status' ? <span className="status">{String(row[column] ?? '—')}</span> : String(row[column] ?? '—')}</td>)}<td><button className="link-button" onClick={() => setSelected(row)}>View</button></td></tr>)}</tbody></table></div>}</div>
    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><div className="modal card" onClick={(event) => event.stopPropagation()}><div className="modal-heading"><div><p className="eyebrow">RECORD DETAIL</p><h2>{current.title}</h2></div><button className="icon-button" onClick={() => setSelected(null)}>×</button></div>{Object.entries(selected).filter(([key]) => key !== 'tenantId').map(([key, value]) => <div className="detail-row" key={key}><span>{key}</span><strong>{typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—')}</strong></div>)}</div></div>}
  </>;
}
