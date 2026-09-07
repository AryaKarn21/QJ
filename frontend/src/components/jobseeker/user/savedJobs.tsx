import { useEffect, useState } from 'react';
import { Search, MapPin, Clock, Trash2 } from 'lucide-react';
import { resolveMediaUrl } from '../../../utils/mediaUrl';
import { fetchSavedJobs, toggleSaveJob } from '../jobseekerApi/api';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface Employer {
  name: string;
  email?: string;
  companyLogo?: string;
}

interface Job {
  _id: string;
  title: string;
  employer?: Employer;
  location: string;
  jobtype: string;
  createdAt: string;
  deadline?: string;
}

const UserSavedJobs = () => {
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const jobs = await fetchSavedJobs();
        setSavedJobs(jobs);
      } catch (err) {
        console.error('Error loading saved jobs:', err);
      } finally {
        setLoading(false);
      }
    };
    loadJobs();
  }, []);

  const handleUnsave = async (id: string) => {
    try {
      await toggleSaveJob(id);
      setSavedJobs(prev => prev.filter(job => job._id !== id));
    } catch (err) {
      console.error('Error unsaving job:', err);
    }
  };

  const filteredJobs = savedJobs
    .filter(job =>
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.employer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) =>
      sortOrder === 'newest'
        ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

  return (
    <div className="min-h-screen overflow-auto bg-gray-50 p-4 sm:p-6" style={{ maxHeight: 'calc(100dvh - 50px)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* flex-col below sm — a fixed w-64 search input plus a select
              plus the heading couldn't fit one non-wrapping row at narrow
              widths (same class of overflow/clipping bug fixed elsewhere
              in this pass: BlogList.tsx's header, jobListing.tsx's
              results bar). */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
            <h1 className="text-2xl font-bold">My Bookmark</h1>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg w-full sm:w-64"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              </div>
              <select
                className="px-4 py-2 border rounded-lg w-full sm:w-auto"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-10 text-gray-500">Loading saved jobs...</div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No saved jobs found.</div>
          ) : (
            <>
              {/* Desktop/tablet: table. Below md: card list — five columns
                  (logo+title, location+type, deadline, posted, actions)
                  either force page-level horizontal scroll or get crushed
                  unreadable on a phone; a stacked card repeats the same
                  data in a layout that actually fits (same pattern as
                  myApplications.tsx). */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead>
                    <tr className="bg-primary text-white">
                      <th className="px-6 py-3 text-left">Job Title</th>
                      <th className="px-6 py-3 text-left">Company Detail</th>
                      <th className="px-6 py-3 text-left">Deadline</th>
                      <th className="px-6 py-3 text-left">Posted</th>
                      <th className="px-6 py-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJobs.map((job) => (
                      <tr key={job._id} className="border-b">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {job.employer?.companyLogo ? (
                              <img
                                src={resolveMediaUrl(job.employer.companyLogo)}
                                alt={job.employer.name}
                                className="w-10 h-10 rounded-lg mr-3 object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg mr-3 bg-gray-200 flex items-center justify-center font-bold text-sm text-gray-600">
                                {job.employer?.name?.[0] || 'C'}
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{job.title}</div>
                              <div className="text-sm text-gray-500">{job.employer?.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-gray-500">
                            <MapPin size={16} className="mr-2" />
                            <span>{job.location}</span>
                            <span className="mx-2">•</span>
                            <Clock size={16} className="mr-2" />
                            <span>{job.jobtype}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {job.deadline ? format(new Date(job.deadline), 'MMM dd, yyyy') : '—'}
                        </td>
                        <td className="px-6 py-4">{format(new Date(job.createdAt), 'MMM dd, yyyy')}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <button
                              className="text-primary hover:text-primary/80"
                              onClick={() => navigate(`/jobs/${job._id}`)}
                            >
                              View Details
                            </button>
                            <button
                              className="text-red-500 hover:text-red-600"
                              onClick={() => handleUnsave(job._id)}
                              aria-label="Remove from saved jobs"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {filteredJobs.map((job) => (
                  <div key={job._id} className="rounded-xl border border-gray-100 p-4">
                    <div className="flex items-start gap-3">
                      {job.employer?.companyLogo ? (
                        <img
                          src={resolveMediaUrl(job.employer.companyLogo)}
                          alt={job.employer.name}
                          className="h-10 w-10 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-200 text-sm font-bold text-gray-600">
                          {job.employer?.name?.[0] || 'C'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-900">{job.title}</p>
                            <p className="truncate text-sm text-gray-500">{job.employer?.name}</p>
                          </div>
                          <button
                            className="shrink-0 text-red-500 hover:text-red-600"
                            onClick={() => handleUnsave(job._id)}
                            aria-label="Remove from saved jobs"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><MapPin size={12} /> {job.location}</span>
                          <span className="flex items-center gap-1"><Clock size={12} /> {job.jobtype}</span>
                          <span>Posted {format(new Date(job.createdAt), 'MMM dd, yyyy')}</span>
                          {job.deadline && <span>Deadline {format(new Date(job.deadline), 'MMM dd, yyyy')}</span>}
                        </div>
                        <button
                          className="mt-2.5 text-sm font-semibold text-primary hover:underline"
                          onClick={() => navigate(`/jobs/${job._id}`)}
                        >
                          View Details →
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

export default UserSavedJobs;
