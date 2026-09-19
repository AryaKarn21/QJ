import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, DollarSign, Clock, Briefcase } from 'lucide-react';
import { fetchCompanyJobs, type CompanyJob } from '../../api/communityApi';
import { SkeletonText } from '../ui/Skeleton';

export function CompanyJobs({ companyId }: { companyId: string }) {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompanyJobs(companyId)
      .then(setJobs)
      .finally(() => setLoading(false));
  }, [companyId]);

  if (loading) return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading jobs">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-100 bg-white p-4 shadow-card space-y-2">
          <SkeletonText width="w-2/3" height="h-4" />
          <SkeletonText width="w-1/2" height="h-3" />
        </div>
      ))}
    </div>
  );

  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
        <p className="text-sm text-gray-500">No open positions right now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <button
          key={job._id}
          onClick={() => navigate(`/jobs/${job._id}`)}
          className="w-full text-left rounded-xl border border-gray-100 bg-white p-4 shadow-card hover:border-primary/30 hover:bg-secondary transition-all"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Briefcase size={14} className="text-primary" />
            <h3 className="font-semibold text-dark text-sm">{job.title}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
            <span className="flex items-center gap-1"><MapPin size={12} /> {job.location}</span>
            {job.salary && <span className="flex items-center gap-1"><DollarSign size={12} /> {job.salary}</span>}
            <span className="flex items-center gap-1"><Clock size={12} /> {job.jobtype}</span>
          </div>
        </button>
      ))}
    </div>
  );
}