'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

type Course = {
  id: string;
  tradeId: string;
  code: string;
  title: string;
  status: string;
  durationDays: number;
  theoryHours: number;
  practicalHours: number;
  language: string;
  youtubeUrl?: string | null;
  videoAvailable?: boolean;
};

type CourseAccess = {
  courseId: string;
  title: string;
  lessonTitle?: string | null;
  lessonAuthor?: string | null;
  lessonAuthorUrl?: string | null;
  lessonThumbnailUrl?: string | null;
  videoAvailable: boolean;
  subscriptionRequired: boolean;
  subscribed: boolean;
  accessGranted: boolean;
  embedUrl: string | null;
};

const emptyForm = { tradeId: '', code: '', title: '', durationDays: '90', theoryHours: '120', practicalHours: '240', language: 'en', status: 'PUBLISHED', youtubeUrl: '' };

export default function CourseCatalog() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Course | null>(null);
  const [access, setAccess] = useState<CourseAccess | null>(null);
  const [accessLoading, setAccessLoading] = useState(false);
  const [subscribeBusy, setSubscribeBusy] = useState(false);
  const requestSequence = useRef(0);

  const load = () => {
    const sequence = ++requestSequence.current;
    setLoading(true);
    api<{ data: Course[] }>(`/workflow/courses?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`)
      .then((result) => { if (sequence === requestSequence.current) setCourses(result.data); })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load courses'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [status]);

  useEffect(() => {
    if (!selected) {
      setAccess(null);
      return;
    }
    setAccessLoading(true);
    api<CourseAccess>(`/workflow/courses/${selected.id}/access`)
      .then(setAccess)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to check course access'))
      .finally(() => setAccessLoading(false));
  }, [selected]);

  const filteredCourses = useMemo(() => courses, [courses]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    requestSequence.current += 1;
    try {
      const payload = {
        tradeId: form.tradeId.trim(),
        code: form.code.trim(),
        title: form.title.trim(),
        durationDays: Number(form.durationDays),
        theoryHours: Number(form.theoryHours),
        practicalHours: Number(form.practicalHours),
        language: form.language,
        status: form.status,
        youtubeUrl: form.youtubeUrl.trim() || undefined,
      };
      const created = await api<Course>('/workflow/courses', { method: 'POST', body: JSON.stringify({ data: payload }) });
      setForm(emptyForm);
      setFormOpen(false);
      setError('');
      setCourses((currentCourses) => [created, ...currentCourses]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create course');
    } finally {
      setBusy(false);
    }
  };

  const subscribe = async () => {
    if (!selected) return;
    setSubscribeBusy(true);
    try {
      const result = await api<CourseAccess>(`/workflow/courses/${selected.id}/subscribe`, { method: 'POST', body: '{}' });
      setAccess(result);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to subscribe to course');
    } finally {
      setSubscribeBusy(false);
    }
  };

  return <>
    <div className="breadcrumb"><Link href="/">Overview</Link><span>/</span>Courses</div>
    <div className="page-heading course-page-heading"><div><p className="eyebrow">LEARNING CATALOG</p><h1>Courses</h1><p className="lede">A learner-friendly catalog for structured rural skills training, practical learning and subscription-gated video lessons.</p></div><button className="primary" onClick={() => setFormOpen(!formOpen)}>{formOpen ? 'Close form' : 'Add Course'}</button></div>
    {error && <div className="alert error">{error}<button onClick={() => setError('')}>Dismiss</button></div>}
    {formOpen && <form className="card course-form" onSubmit={submit}><div className="course-form-heading"><div><p className="eyebrow">COURSE AUTHORING</p><h2>Create a course</h2></div><span>Paste a YouTube lesson URL now; uploaded video storage can replace it later.</span></div><div className="form-grid"><label>Trade ID<input required value={form.tradeId} onChange={(event) => setForm({ ...form, tradeId: event.target.value })} /></label><label>Course code<input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label><label>Course title<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label>Duration days<input required type="number" min="1" value={form.durationDays} onChange={(event) => setForm({ ...form, durationDays: event.target.value })} /></label><label>Theory hours<input required type="number" min="0" value={form.theoryHours} onChange={(event) => setForm({ ...form, theoryHours: event.target.value })} /></label><label>Practical hours<input required type="number" min="0" value={form.practicalHours} onChange={(event) => setForm({ ...form, practicalHours: event.target.value })} /></label><label>Language<select value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value })}><option value="en">English</option><option value="te">తెలుగు</option><option value="hi">हिन्दी</option></select></label><label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="DRAFT">DRAFT</option><option value="PUBLISHED">PUBLISHED</option></select></label><label className="course-url-field">YouTube lesson URL <span className="optional-label">optional</span><input type="url" placeholder="https://www.youtube.com/watch?v=..." value={form.youtubeUrl} onChange={(event) => setForm({ ...form, youtubeUrl: event.target.value })} /></label></div><div className="course-form-footer"><span>Lessons require subscription by default.</span><button className="primary" disabled={busy}>{busy ? 'Saving...' : 'Save course'}</button></div></form>}
    <div className="course-toolbar"><div className="course-search-wrap"><span>⌕</span><input aria-label="Search courses" placeholder="Search this workspace" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') load(); }} /></div><select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All courses</option><option value="OPEN">Open</option><option value="PUBLISHED">Published</option><option value="DRAFT">Draft</option></select><button className="secondary" onClick={load}>Refresh</button><span className="record-count">{filteredCourses.length} courses</span></div>
    {loading ? <div className="card state">Loading learning catalog...</div> : !filteredCourses.length ? <div className="card state"><strong>No courses yet</strong><span>Create the first course and add a lesson URL when it is ready.</span></div> : <div className="course-grid">{filteredCourses.map((course) => <article className="course-card card" key={course.id}><div className="course-card-cover"><span className="course-cover-mark">{course.code.slice(0, 2).toUpperCase()}</span><span className="course-level">{course.status}</span></div><div className="course-card-body"><p className="course-code">{course.code} · {course.language.toUpperCase()}</p><h2>{course.title}</h2><p className="course-description">Structured theory and practical training for livelihood-ready skills.</p><div className="course-meta"><span>{course.durationDays} days</span><span>{course.theoryHours + course.practicalHours} learning hours</span></div><div className="course-card-footer"><span className={course.videoAvailable ? 'video-ready' : 'video-pending'}>{course.videoAvailable ? '▶ Video lesson' : 'Video coming soon'}</span><button className="link-button" onClick={() => setSelected(course)}>View course</button></div></div></article>)}</div>}
    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><div className="course-detail-modal card" onClick={(event) => event.stopPropagation()}><div className="course-detail-hero"><div><p className="eyebrow">COURSE DETAIL</p><h2>{selected.title}</h2><p>{selected.code} · {selected.durationDays} days · {selected.language.toUpperCase()}</p></div><button className="icon-button" onClick={() => setSelected(null)}>×</button></div><div className="course-detail-content"><div className="course-detail-main"><h3>About this course</h3><p>Build practical knowledge through structured lessons, supervised assignments and assessment preparation.</p><div className="course-outcomes"><div><strong>{selected.theoryHours}</strong><span>Theory hours</span></div><div><strong>{selected.practicalHours}</strong><span>Practical hours</span></div><div><strong>{selected.durationDays}</strong><span>Days</span></div></div><h3>Curriculum</h3><div className="curriculum-list"><div><span>01</span><strong>Safety, tools and foundations</strong><small>Core theory and safe work preparation</small></div><div><span>02</span><strong>Practical skills and field methods</strong><small>Demonstration, assignment and practice</small></div><div><span>03</span><strong>Assessment and livelihood readiness</strong><small>Preparation for certification and work</small></div></div></div><aside className="course-player-panel"><div className="course-player-heading"><strong>Lesson preview</strong><span>{access?.subscribed ? 'Your subscription' : 'Subscription required'}</span></div>{accessLoading && <div className="course-video-state">Checking access...</div>}{access && access.videoAvailable && <div className="course-lesson-meta">{access.lessonThumbnailUrl && <img src={access.lessonThumbnailUrl} alt="" />}<div><strong>{access.lessonTitle || 'Course lesson'}</strong>{access.lessonAuthor && <span>By {access.lessonAuthor}</span>}</div></div>}{access && !access.videoAvailable && <div className="course-video-state"><strong>Video coming soon</strong><span>The trainer has not added a YouTube lesson yet.</span></div>}{access && access.videoAvailable && !access.accessGranted && <div className="course-video-locked"><span className="lock-mark">🔒</span><strong>Subscribe to start learning</strong><span>Get access to the course lesson and continue your learning journey.</span><button className="primary" onClick={subscribe} disabled={subscribeBusy}>{subscribeBusy ? 'Subscribing...' : 'Subscribe to course'}</button></div>}{access?.accessGranted && access.embedUrl && <div className="course-video-player"><iframe title={`${selected.title} lesson`} src={access.embedUrl} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>}<p className="course-player-note">YouTube is the temporary video source. The course record is ready to support uploaded lessons later.</p></aside></div></div></div>}
  </>;
}
