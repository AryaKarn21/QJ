``

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin, Clock, DollarSign, Users, Share2, MoreHorizontal,
  Briefcase, BarChart, ThumbsUp, ThumbsDown, CalendarClock, Lock
} from 'lucide-react';
import { fetchJobById, fetchJobs, likeJob, dislikeJob } from '../jobseekerApi/api';
import { jwtDecode } from 'jwt-decode';


interface DecodedToken {
  id: string;
  role: 'jobseeker' | 'employer' | 'admin';
  exp: number;
}

interface Employer {
  _id: string;
  name: string;
  email?: string;
  companyLogo?: string;
}

interface Job {
  _id: string;
  title: string;
  country?: string;
  employer?: Employer;
  location: string;
  jobtype: string;
  status: string;
  salary: string;
  experience: string;
  level: string;
  openings: number;
  description: string;
  likeCount: number;
  dislikeCount: number;
  jobseekers: any[];
  jobcategory: string;
  deadline?: string;
  createdAt: string;
  updatedAt?: string;
}

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || '';

const formatDeadline = (deadline: string): string =>
  new Date(deadline).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });


const JobDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [latestJobs, setLatestJobs] = useState<Job[]>([]);
  const [loadingSimilarJobs, setLoadingSimilarJobs] = useState(true);
  const [loadingJob, setLoadingJob] = useState(true);
  const [isLiking, setIsLiking] = useState(false);
  const [isDisliking, setIsDisliking] = useState(false);

  useEffect(() => {
    const loadJob = async () => {
      if (!id) return;

      try {
        setLoadingJob(true);
        const jobData = await fetchJobById(id);
        setJob(jobData);
      } catch (error) {
        console.error('Error loading job:', error);
      } finally {
        setLoadingJob(false);
      }
    };

    loadJob();
  }, [id]);

  useEffect(() => {
    const loadSimilarJobs = async () => {
      if (!job) return;

      try {
        setLoadingSimilarJobs(true);
        const res = await fetchJobs({ page: 1, limit: 50 });
        const similarJobs = res.jobs
          .filter((j: Job) => j._id !== job._id && j.jobcategory === job.jobcategory)
          .slice(0, 3);
        setLatestJobs(similarJobs);
      } catch (error) {
        console.error('Error loading similar jobs:', error);
      } finally {
        setLoadingSimilarJobs(false);
      }
    };

    loadSimilarJobs();
  }, [job?._id, job?.jobcategory]);


  const isExpired = Boolean(job?.deadline && new Date(job.deadline).getTime() < Date.now());

  const handleApply = () => {
    if (isExpired) return;

    const token = localStorage.getItem('token');

    if (!token) {
      alert('Please log in to apply.');
      return;
    }

    try {
      const decoded: DecodedToken = jwtDecode(token);
      if (decoded.role === 'jobseeker') {
        if (job) {
          navigate(`/jobs/${job._id}/apply`);
        }
      } else {
        alert('Only jobseekers can apply for jobs.');
      }
    } catch (error) {
      console.error('Invalid token format', error);
      alert('Authentication error. Please log in again.');
    }
  };


  const handleLike = async () => {
    if (!job || isLiking) return;
    try {
      setIsLiking(true);
      const res = await likeJob(job._id);
      setJob({ ...job, likeCount: res.likes, dislikeCount: res.dislikes });
    } catch (err) {
      console.error("Error liking job:", err);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDislike = async () => {
    if (!job || isDisliking) return;
    try {
      setIsDisliking(true);
      const res = await dislikeJob(job._id);
      setJob({ ...job, dislikeCount: res.dislikes, likeCount: res.likes });
    } catch (err) {
      console.error("Error disliking job:", err);
    } finally {
      setIsDisliking(false);
    }
  };

  if (loadingJob) return <div className="text-center py-10 text-gray-500">Loading job details...</div>;
  if (!job) return <div className="text-center py-10 text-red-500">Job not found.</div>;

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Job Detail Section */}
          <div className="lg:col-span-2 rounded-lg p-6">
            <div className=' bg-white rounded-lg p-6 shadow'>
            <div className="flex items-start justify-between mb-4 border-b pb-4">
              <div className="flex items-start space-x-4">
                {job.employer?.companyLogo ? (
                  <img
                    src={`${MEDIA_URL.replace(/\/$/, '')}/${job.employer.companyLogo.replace(/^\//, '')}`}
                    alt={`${job.employer.name} Logo`}
                    className="w-16 h-16 rounded-full object-cover bg-gray-100"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xl font-semibold">
                    {job.employer?.name?.[0]}
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">{job.title}</h1>
                  <p className="text-gray-600 mb-1">{job.employer?.name}</p>
                  {job.employer?.email && (
                    <p className="text-gray-400 text-xs mb-2">{job.employer.email}</p>
                  )}
                  <div className="flex flex-wrap text-sm text-gray-500 gap-x-3 gap-y-1">
                    <span><MapPin size={14} className="inline mr-1" />{job.location}</span>
                    <p className="text-gray-600 mr-1">{job.country}</p>
                    <span><Clock size={14} className="inline mr-1" />{job.jobtype}</span>
                    {isExpired && (
                      <span className="text-gray-600 text-xs font-semibold px-2 py-1 rounded-full bg-gray-200 inline-flex items-center gap-1">
                        <Lock size={11} /> Deadline Passed
                      </span>
                    )}

                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2 ml-4">
                  {isExpired ? (
                    <span
                      className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-500 border border-gray-200 px-3 py-1.5 rounded text-sm font-medium cursor-not-allowed"
                      title="The application deadline for this job has passed"
                    >
                      <Lock size={14} />
                      Applications Closed
                    </span>
                  ) : (
                    <button
                      onClick={handleApply}
                      className="bg-green-600 text-white px-2 py-1 rounded text-sm font-medium hover:bg-green-700 transition-colors"
                    >
                      <span className="inline md:hidden">Apply</span>
                      <span className="hidden md:inline">Apply Now</span>
                    </button>
                  )}
                <div className="flex space-x-2 text-gray-500">
                  <button><Share2 size={18} /></button>
                  <button><MoreHorizontal size={18} /></button>
                </div>
              </div>
            </div>

            {/* Job Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div>
                <p className="text-gray-500 text-sm mb-1"><DollarSign size={14} className="inline mr-1" />Salary</p>
                <p className="font-semibold">{job.salary}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm mb-1"><Briefcase size={14} className="inline mr-1" />Experience</p>
                <p className="font-semibold">{job.experience}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm mb-1"><BarChart size={14} className="inline mr-1" />Level</p>
                <p className="font-semibold">{job.level}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm mb-1"><Users size={14} className="inline mr-1" />Openings</p>
                <p className="font-semibold">{job.openings}</p>
              </div>
              {job.deadline && (
                <div>
                  <p className="text-gray-500 text-sm mb-1"><CalendarClock size={14} className="inline mr-1" />Application Deadline</p>
                  <p className={`font-semibold ${isExpired ? 'text-red-500' : ''}`}>
                    {formatDeadline(job.deadline)}
                  </p>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <div
                className="text-sm text-gray-600 leading-relaxed prose max-w-none"
                dangerouslySetInnerHTML={{ __html: job.description }}
              />
            </div>

            {/* Likes/Dislikes */}
            <div className="pt-6 mt-6 border-t flex justify-between items-center">
              <div className="flex items-center space-x-6 text-gray-500">
                <button
                  onClick={handleLike}
                  disabled={isLiking}
                  className="flex items-center space-x-1 hover:text-green-600"
                >
                  <ThumbsUp size={18} /> <span>{job.likeCount}</span>
                </button>
                <button
                  onClick={handleDislike}
                  disabled={isDisliking}
                  className="flex items-center space-x-1 hover:text-red-600"
                >
                  <ThumbsDown size={18} /> <span>{job.dislikeCount}</span>
                </button>
              </div>
            </div>
            </div>
          </div>
          
          {/* Similar Jobs Section */}
          <div className="space-y-6">
            <div className="bg-gray-100 p-4 rounded-lg shadow-sm border-2">
              <h2 className="text-xl font-semibold text-gray-800 mb-5 px-1">Similar Jobs</h2>

              <div className="space-y-4 py-4">
                {loadingSimilarJobs ? (
                  <p className="text-gray-500 text-sm">Loading...</p>
                ) : latestJobs.length > 0 ? (
                  latestJobs.map((sJob) => (
                    <div
                      key={sJob._id}
                      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden p-4"
                    >
                      <div className="flex flex-col justify-between h-full">
                        <div>
                          <div className="flex items-start mb-4">
                            <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border bg-gray-200">
                              {sJob.employer?.companyLogo ? (
                                <img
                                  src={`${MEDIA_URL.replace(/\/$/, '')}/${sJob.employer.companyLogo.replace(/^\//, '')}`}
                                  alt={sJob.employer.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500 text-xl font-bold">
                                  {sJob.employer?.name?.[0] || 'C'}
                                </div>
                              )}
                            </div>
                            <div className="ml-4 flex-grow">
                              <h3 className="font-semibold text-lg">{sJob.title}</h3>
                              <p className="text-primary text-sm">{sJob.employer?.name}</p>
                            </div>
                          </div>

                          <div className="space-y-2 mb-4">
                            <div className="flex items-center text-gray-500">
                              <MapPin size={16} className="mr-2 flex-shrink-0" />
                              <span className="text-sm">{sJob.location}</span>
                            </div>
                            <div className="flex items-center text-gray-500">
                              <Clock size={16} className="mr-2 flex-shrink-0" />
                              <span className="text-sm">{new Date(sJob.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center text-gray-500">
                              <Briefcase size={16} className="mr-2 flex-shrink-0" />
                              <span className="text-sm">{sJob.jobtype}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            onClick={() => navigate(`/jobs/${sJob._id}`)}
                            className="bg-primary text-white py-2 px-6 rounded-md hover:bg-primary/90 transition-colors duration-200 text-sm font-medium"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No similar jobs found.</p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default JobDetailPage;