import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Image, Video, FileText, Briefcase, BarChart3, Megaphone, Type, Sparkles, SpellCheck, X, Plus, Globe2 } from 'lucide-react';
import { createPost, type CreatePostInput } from '../../api/communityApi';
import { generateCaption, correctGrammar, detectHiringIntent } from '../../api/communityAiApi';
import { useCurrentUser } from '../../utils/currentUser';
import { MentionTextarea } from './MentionTextarea';
import { Avatar } from './Avatar';
import { TagInput } from '../common/TagInput';
import type { CommunityPost, PostTopic, PostType } from '../../types/community';

const TYPE_OPTIONS: { key: PostType; label: string; icon: typeof Type }[] = [
  { key: 'text', label: 'Update', icon: Type },
  { key: 'image', label: 'Photo', icon: Image },
  { key: 'video', label: 'Video', icon: Video },
  { key: 'pdf', label: 'Document', icon: FileText },
  { key: 'job', label: 'Job', icon: Briefcase },
  { key: 'poll', label: 'Poll', icon: BarChart3 },
  { key: 'hiring', label: "Hiring", icon: Megaphone },
];

const TOPIC_OPTIONS: { key: PostTopic; label: string }[] = [
  { key: 'career_tips', label: 'Career Tips' },
  { key: 'interview_experience', label: 'Interview Experience' },
  { key: 'general', label: 'General' },
];

const ACCEPT_BY_TYPE: Record<string, string> = {
  image: 'image/png,image/jpeg,image/jpg,image/gif,image/webp',
  video: 'video/mp4,video/quicktime,video/webm',
  pdf: 'application/pdf',
};

interface PostComposerProps {
  onPosted: (post: CommunityPost) => void;
  defaultCompanyId?: string; // when composing from a Company Feed page as its own employer
  currentUserSnapshot?: { name: string; avatar?: string | null; role: string };
}

export function PostComposer({ onPosted, defaultCompanyId, currentUserSnapshot }: PostComposerProps) {
  const { isAuthenticated, role } = useCurrentUser();
  const [expanded, setExpanded] = useState(false);
  const [type, setType] = useState<PostType>('text');
  const [content, setContent] = useState('');
  const [topics, setTopics] = useState<PostTopic[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [postAsCompany, setPostAsCompany] = useState(!!defaultCompanyId);
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'connections' | 'private'>('public');
  const [submitting, setSubmitting] = useState(false);
  const [checkingGrammar, setCheckingGrammar] = useState(false);
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [captionTopic, setCaptionTopic] = useState('');
  const [showCaptionPrompt, setShowCaptionPrompt] = useState(false);
  const [hiringHint, setHiringHint] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll fields
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);

  // Job fields
  const [jobTitle, setJobTitle] = useState('');
  const [jobCompany, setJobCompany] = useState('');
  const [jobLocation, setJobLocation] = useState('');
  const [jobType, setJobType] = useState('');
  const [jobSalary, setJobSalary] = useState('');
  const [jobApplyUrl, setJobApplyUrl] = useState('');

  // Hiring fields
  const [hiringRoles, setHiringRoles] = useState('');
  const [hiringOpenings, setHiringOpenings] = useState('');
  const [hiringLocation, setHiringLocation] = useState('');
  const [hiringUrgency, setHiringUrgency] = useState<'normal' | 'urgent'>('normal');
  const [hiringApplyUrl, setHiringApplyUrl] = useState('');
  const [hiringContactEmail, setHiringContactEmail] = useState('');

  // Debounced hiring-intent nudge for plain text posts.
  useEffect(() => {
    if (type !== 'text' || content.trim().length < 20) {
      setHiringHint(false);
      return;
    }
    const handle = setTimeout(() => {
      detectHiringIntent(content)
        .then((res) => setHiringHint(res.isHiring))
        .catch(() => {});
    }, 800);
    return () => clearTimeout(handle);
  }, [content, type]);

  if (!isAuthenticated) return null;

  const resetForm = () => {
    setContent('');
    setTopics([]);
    setFiles([]);
    setPreviews([]);
    setPollOptions(['', '']);
    setJobTitle(''); setJobCompany(''); setJobLocation(''); setJobType(''); setJobSalary(''); setJobApplyUrl('');
    setHiringRoles(''); setHiringOpenings(''); setHiringLocation(''); setHiringApplyUrl(''); setHiringContactEmail('');
    setType('text');
    setExpanded(false);
    setHiringHint(false);
    setVisibility('public');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(e.target.files || []);
    setFiles(chosen);
    setPreviews(chosen.map((f) => URL.createObjectURL(f)));
  };

  const handleGenerateCaption = async () => {
    if (!captionTopic.trim()) return;
    setGeneratingCaption(true);
    try {
      const caption = await generateCaption(captionTopic.trim(), 'professional', type);
      setContent((prev) => (prev ? `${prev}\n\n${caption}` : caption));
      setShowCaptionPrompt(false);
      setCaptionTopic('');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not generate a caption.');
    } finally {
      setGeneratingCaption(false);
    }
  };

  const handleFixGrammar = async () => {
    if (!content.trim()) return;
    setCheckingGrammar(true);
    try {
      const res = await correctGrammar(content);
      if (res.changed) {
        setContent(res.corrected);
        toast.success('Grammar cleaned up.');
      } else {
        toast.info('No changes needed — looks good!');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not check grammar.');
    } finally {
      setCheckingGrammar(false);
    }
  };

  const switchToHiring = () => {
    setType('hiring');
    setHiringHint(false);
  };

  const handleSubmit = async () => {
    if (submitting) return;

    if (['image', 'video', 'pdf'].includes(type) && files.length === 0) {
      return toast.error(`Attach at least one file for a ${type} post.`);
    }
    if (type === 'poll' && pollOptions.filter((o) => o.trim()).length < 2) {
      return toast.error('A poll needs at least 2 options.');
    }
    if (type === 'job' && !jobTitle.trim()) {
      return toast.error('Give the job post a title.');
    }
    if (!content.trim() && files.length === 0 && type !== 'poll' && type !== 'job' && type !== 'hiring') {
      return toast.error("Write something before you post.");
    }

    setSubmitting(true);
    try {
      const input: CreatePostInput = {
        type,
        content,
        topics,
        files,
        company: postAsCompany ? defaultCompanyId : undefined,
        visibility,
      };
      if (type === 'poll') {
        input.pollData = { options: pollOptions.filter((o) => o.trim()), allowMultiple: pollAllowMultiple };
      }
      if (type === 'job') {
        input.jobData = { title: jobTitle, companyName: jobCompany, location: jobLocation, jobType, salary: jobSalary, applyUrl: jobApplyUrl };
      }
      if (type === 'hiring') {
        input.hiringData = {
          roles: hiringRoles.split(',').map((r) => r.trim()).filter(Boolean),
          openings: hiringOpenings ? Number(hiringOpenings) : undefined,
          location: hiringLocation,
          urgency: hiringUrgency,
          applyUrl: hiringApplyUrl,
          contactEmail: hiringContactEmail,
        };
      }

      const res = await createPost(input);
      toast.success(res.message);
      onPosted(res.post);
      resetForm();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not create post.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-light p-3 text-left shadow-card hover:border-primary/40"
      >
        {currentUserSnapshot && <Avatar user={{ _id: '', name: currentUserSnapshot.name, avatar: currentUserSnapshot.avatar, role: currentUserSnapshot.role as any }} />}
        <span className="text-sm text-gray-400">Share a career update, tip, or opportunity…</span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-light p-4 shadow-card">
      {/* Post type tabs */}
      <div className="scrollbar-none -mx-1 mb-3 flex gap-1 overflow-x-auto px-1">
        {TYPE_OPTIONS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setType(key)}
            className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              type === key ? 'bg-primary text-light' : 'bg-secondary text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      <MentionTextarea value={content} onChange={setContent} placeholder="What's on your mind?" rows={4} autoFocus />

      {hiringHint && type === 'text' && (
        <div className="mt-2 flex items-center justify-between rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent">
          <span className="flex items-center gap-1"><Sparkles size={13} /> This reads like a hiring announcement.</span>
          <button onClick={switchToHiring} className="font-semibold underline">Post as Hiring instead</button>
        </div>
      )}

      {/* AI toolbar */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowCaptionPrompt((v) => !v)}
          className="flex items-center gap-1 rounded-full border border-accent/30 px-3 py-1 text-xs font-medium text-accent hover:bg-accent/10"
        >
          <Sparkles size={13} /> AI caption
        </button>
        <button
          onClick={handleFixGrammar}
          disabled={checkingGrammar || !content.trim()}
          className="flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-secondary disabled:opacity-50"
        >
          <SpellCheck size={13} /> {checkingGrammar ? 'Checking…' : 'Fix grammar'}
        </button>
      </div>

      {showCaptionPrompt && (
        <div className="mt-2 flex gap-2">
          <input
            value={captionTopic}
            onChange={(e) => setCaptionTopic(e.target.value)}
            placeholder="e.g. landed a new role as a frontend developer"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
          <button
            onClick={handleGenerateCaption}
            disabled={generatingCaption}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-light disabled:opacity-60"
          >
            {generatingCaption ? 'Writing…' : 'Generate'}
          </button>
        </div>
      )}

      {/* Media upload */}
      {['image', 'video', 'pdf'].includes(type) && (
        <div className="mt-3">
          <input ref={fileInputRef} type="file" multiple={type === 'image'} accept={ACCEPT_BY_TYPE[type]} onChange={handleFileChange} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-primary hover:text-primary">
            {files.length ? `${files.length} file(s) selected` : `Choose ${type} file${type === 'image' ? 's' : ''}`}
          </button>
          {type === 'image' && previews.length > 0 && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {previews.map((src, i) => (
                <img key={i} src={src} className="h-20 w-full rounded-lg object-cover" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Poll builder */}
      {type === 'poll' && (
        <div className="mt-3 space-y-2">
          {pollOptions.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={opt}
                onChange={(e) => setPollOptions((prev) => prev.map((o, idx) => (idx === i ? e.target.value : o)))}
                placeholder={`Option ${i + 1}`}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
              />
              {pollOptions.length > 2 && (
                <button onClick={() => setPollOptions((prev) => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-danger">
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
          {pollOptions.length < 6 && (
            <button onClick={() => setPollOptions((prev) => [...prev, ''])} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              <Plus size={13} /> Add option
            </button>
          )}
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={pollAllowMultiple} onChange={(e) => setPollAllowMultiple(e.target.checked)} />
            Allow multiple selections
          </label>
        </div>
      )}

      {/* Job builder */}
      {type === 'job' && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Job title *" className="col-span-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm" />
          <input value={jobCompany} onChange={(e) => setJobCompany(e.target.value)} placeholder="Company" className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm" />
          <input value={jobLocation} onChange={(e) => setJobLocation(e.target.value)} placeholder="Location" className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm" />
          <input value={jobType} onChange={(e) => setJobType(e.target.value)} placeholder="Job type (e.g. Full-time)" className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm" />
          <input value={jobSalary} onChange={(e) => setJobSalary(e.target.value)} placeholder="Salary" className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm" />
          <input value={jobApplyUrl} onChange={(e) => setJobApplyUrl(e.target.value)} placeholder="Apply link (optional)" className="col-span-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm" />
        </div>
      )}

      {/* Hiring builder */}
      {type === 'hiring' && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <TagInput
              value={hiringRoles}
              onChange={setHiringRoles}
              placeholder="Type a role and press Enter, e.g. Frontend Engineer"
              className="text-sm"
            />
          </div>
          <input value={hiringOpenings} onChange={(e) => setHiringOpenings(e.target.value)} type="number" min="1" placeholder="Openings" className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm" />
          <input value={hiringLocation} onChange={(e) => setHiringLocation(e.target.value)} placeholder="Location" className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm" />
          <select value={hiringUrgency} onChange={(e) => setHiringUrgency(e.target.value as 'normal' | 'urgent')} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm">
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
          </select>
          <input value={hiringContactEmail} onChange={(e) => setHiringContactEmail(e.target.value)} placeholder="Contact email" className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm" />
          <input value={hiringApplyUrl} onChange={(e) => setHiringApplyUrl(e.target.value)} placeholder="Apply link (optional)" className="col-span-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm" />
        </div>
      )}

      {/* Topics */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {TOPIC_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTopics((prev) => (prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]))}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              topics.includes(key) ? 'border-accent bg-accent/10 text-accent' : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {role === 'employer' && defaultCompanyId && (
        <label className="mt-3 flex items-center gap-2 text-xs text-gray-600">
          <input type="checkbox" checked={postAsCompany} onChange={(e) => setPostAsCompany(e.target.checked)} />
          Post as your company page
        </label>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          <Globe2 size={13} />
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as typeof visibility)}
            className="rounded-lg border border-gray-200 bg-light py-1 pl-1.5 pr-6 text-xs font-medium text-gray-700 focus:border-primary focus:outline-none"
          >
            <option value="public">Public — anyone</option>
            <option value="followers">Followers only</option>
            <option value="connections">Connections only</option>
            <option value="private">Private — only me</option>
          </select>
        </label>
        <div className="flex gap-2">
          <button onClick={resetForm} className="rounded-full px-4 py-1.5 text-sm font-medium text-gray-500 hover:bg-secondary">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-full bg-primary px-5 py-1.5 text-sm font-semibold text-light hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}
