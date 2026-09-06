import { useEffect, useState } from 'react';
import { Search, MapPin, Clock, Briefcase } from 'lucide-react';
import { fetchAppliedJobs } from '../jobseekerApi/api';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface Employer {
  name: string;
  email?: string;
  companyLogo?: string;
}

interface AppliedJob {
  _id: string;
  title: string;
  employer?: Employer;
  location: string;
  jobtype: string;
  createdAt: string;
  applicationStatus: 'Pending' | 'Reviewed' | 'Accepted' | 'Rejected' | 'Interview Scheduled';
  appliedAt: string;
}

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || '';

// Maps each backend status to a badge color + friendlier label, so
// jobseekers get a clear, at-a-glance read on where they stand —
// this is the whole point of this page. "Interview Scheduled" was missing
// here (Application.js's status enum has 5 values, this only covered 4),
// so a scheduled interview silently showed as "Applied" — wrong.
const STATUS_STYLES: Record<AppliedJob['applicationStatus'], { label: string; className: string }> = {
  Pending: { label: 'Applied', className: 'bg-slate-100 text-slate-700' },
  Reviewed: { label: 'Under Review', className: 'bg-blue-100 text-blue-700' },
  'Interview Scheduled': { label: 'Interview Scheduled', className: 'bg-purple-100 text-purple-700' },
  Accepted: { label: 'Accepted', className: 'bg-green-100 text-green-700' },
  Rejected: { label: 'Not Selected', className: 'bg-red-100 text-red-700' },
};

const CompanyAvatar = ({ app }: { app: AppliedJob }) =>
  app.employer?.companyLogo ? (
    <img
      src={`${MEDIA_URL.replace(/\/$/, '')}/${app.employer.companyLogo.replace(/^\//, '')}`}
      alt={app.employer.name}
      className="h-10 w-10 shrink-0 rounded-lg object-cover"
    />
  ) : (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-500">
      {app.employer?.name?.[0] || 'C'}
    </div>
  );

const StatusBadge = ({ status }: { status: AppliedJob['applicationStatus'] }) => {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.Pending;
  return <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${s.className}`}>{s.label}</span>;
};

const UserMyApplications = () => {
  const [applications, setApplications] = useState<AppliedJob[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AppliedJob['applicationStatus']>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadApplications = async () => {
      try {
        const jobs = await fetchAppliedJobs();
        setApplications(jobs as unknown as AppliedJob[]);
      } catch (err) {
        console.error('Error loading applications:', err);
        setError('Could not load your applications. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    loadApplications();
  }, []);

  const filteredApplications = applications
    .filter((app) => statusFilter === 'all' || app.applicationStatus === statusFilter)
    .filter(
      (app) =>
        app.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.employer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());

  return (
    <div className="min-h-screen overflow-auto bg-gray-50 p-4 sm:p-6" style={{ maxHeight: 'calc(100vh - 50px)' }}>
      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">My Applications</h1>
              <p className="mt-1 text-sm text-gray-500">Track the status of every job you've applied to.</p>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search applications…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:w-64"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              </div>
              <select
                className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Applied</option>
                <option value="Reviewed">Under Review</option>
                <option value="Interview Scheduled">Interview Scheduled</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Not Selected</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4 rounded-xl border border-gray-100 p-4">
                  <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-40 animate-pulse rounded bg-gray-200" />
                    <div className="h-3 w-56 animate-pulse rounded bg-gray-100" />
                  </div>
                  <div className="h-6 w-20 shrink-0 animate-pulse rounded-full bg-gray-200" />
                </div>
              ))}
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="flex flex-col items-center py-14 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Briefcase size={24} className="text-primary" />
              </div>
              <p className="text-sm font-semibold text-gray-700">
                {applications.length === 0 ? "You haven't applied to any jobs yet." : 'No applications match your search or filter.'}
              </p>
              {applications.length === 0 && (
                <button onClick={() => navigate('/jobs')} className="mt-3 text-sm font-semibold text-primary hover:underline">
                  Find Jobs →
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop/tablet: table. Below md: card list — a table this
                  dense either overflows horizontally or gets crushed
                  unreadable on a phone; a stacked card repeats the same
                  data in a layout that actually fits. */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead>
                    <tr className="bg-primary text-white">
                      <th className="px-6 py-3 text-left">Job Title</th>
                      <th className="px-6 py-3 text-left">Company Detail</th>
                      <th className="px-6 py-3 text-left">Applied On</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplications.map((app) => (
                      <tr key={app._id} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <CompanyAvatar app={app} />
                            <div className="ml-3">
                              <div className="font-medium">{app.title}</div>
                              <div className="text-sm text-gray-500">{app.employer?.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-gray-500">
                            <MapPin size={16} className="mr-2 shrink-0" />
                            <span>{app.location}</span>
                            <span className="mx-2">•</span>
                            <Clock size={16} className="mr-2 shrink-0" />
                            <span>{app.jobtype}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">{app.appliedAt ? format(new Date(app.appliedAt), 'MMM dd, yyyy') : '—'}</td>
                        <td className="px-6 py-4">
                          <StatusBadge status={app.applicationStatus} />
                        </td>
                        <td className="px-6 py-4">
                          <button className="font-medium text-primary hover:text-primary/80" onClick={() => navigate(`/jobs/${app._id}`)}>
                            View Job
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {filteredApplications.map((app) => (
                  <div key={app._id} className="rounded-xl border border-gray-100 p-4">
                    <div className="flex items-start gap-3">
                      <CompanyAvatar app={app} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-gray-900">{app.title}</p>
                            <p className="truncate text-sm text-gray-500">{app.employer?.name}</p>
                          </div>
                          <StatusBadge status={app.applicationStatus} />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <MapPin size={12} /> {app.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> {app.jobtype}
                          </span>
                          <span>{app.appliedAt ? format(new Date(app.appliedAt), 'MMM dd, yyyy') : '—'}</span>
                        </div>
                        <button
                          className="mt-2.5 text-sm font-semibold text-primary hover:underline"
                          onClick={() => navigate(`/jobs/${app._id}`)}
                        >
                          View Job →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserMyApplications;
