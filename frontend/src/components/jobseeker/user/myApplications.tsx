import { useEffect, useState } from 'react';
import { Search, MapPin, Clock } from 'lucide-react';
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
  applicationStatus: 'Pending' | 'Reviewed' | 'Accepted' | 'Rejected';
  appliedAt: string;
}

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || '';

// Maps each backend status to a badge color + friendlier label, so
// jobseekers get a clear, at-a-glance read on where they stand —
// this is the whole point of this page.
const STATUS_STYLES: Record<AppliedJob['applicationStatus'], { label: string; className: string }> = {
  Pending: { label: 'Applied', className: 'bg-slate-100 text-slate-700' },
  Reviewed: { label: 'Under Review', className: 'bg-blue-100 text-blue-700' },
  Accepted: { label: 'Accepted', className: 'bg-green-100 text-green-700' },
  Rejected: { label: 'Not Selected', className: 'bg-red-100 text-red-700' },
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
    <div className="min-h-screen overflow-auto bg-gray-50 p-6" style={{ maxHeight: 'calc(100vh - 50px)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">My Applications</h1>
              <p className="text-sm text-gray-500 mt-1">
                Track the status of every job you've applied to.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search applications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg w-64"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              </div>
              <select
                className="px-4 py-2 border rounded-lg"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Applied</option>
                <option value="Reviewed">Under Review</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Not Selected</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-10 text-gray-500">Loading your applications...</div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              {applications.length === 0
                ? "You haven't applied to any jobs yet."
                : 'No applications match your search or filter.'}
            </div>
          ) : (
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
                {filteredApplications.map((app) => {
                  const statusInfo = STATUS_STYLES[app.applicationStatus] ?? STATUS_STYLES.Pending;
                  return (
                    <tr key={app._id} className="border-b">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {app.employer?.companyLogo ? (
                            <img
                              src={`${MEDIA_URL}/${app.employer.companyLogo.replace(/^\//, '')}`}
                              alt={app.employer.name}
                              className="w-10 h-10 rounded-lg mr-3 object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg mr-3 bg-gray-200 flex items-center justify-center font-bold text-sm text-gray-600">
                              {app.employer?.name?.[0] || 'C'}
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{app.title}</div>
                            <div className="text-sm text-gray-500">{app.employer?.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-gray-500">
                          <MapPin size={16} className="mr-2" />
                          <span>{app.location}</span>
                          <span className="mx-2">•</span>
                          <Clock size={16} className="mr-2" />
                          <span>{app.jobtype}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {app.appliedAt ? format(new Date(app.appliedAt), 'MMM dd, yyyy') : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          className="text-primary hover:text-primary/80"
                          onClick={() => navigate(`/jobs/${app._id}`)}
                        >
                          View Job
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserMyApplications;