import { useEffect, useState } from 'react';
import { Search, MapPin, Clock, Trash2 } from 'lucide-react';
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

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || '';

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
    <div className="min-h-screen overflow-auto bg-gray-50 p-6" style={{ maxHeight: 'calc(100vh - 50px)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">My Bookmark</h1>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg w-64"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              </div>
              <select
                className="px-4 py-2 border rounded-lg"
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
                            src={`${MEDIA_URL}/${job.employer.companyLogo.replace(/^\//, '')}`}
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
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSavedJobs;
