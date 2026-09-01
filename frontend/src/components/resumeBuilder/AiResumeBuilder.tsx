import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Upload,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  User,
  Briefcase,
  GraduationCap,
  Wrench,
  FileText,
  Languages,
} from 'lucide-react';
import axios from 'axios';
import { createResume, updateResume } from './resumeApi';
import ImageUpload from './components/ImageUpload';
import {
  getOccupationSuggestionsPreview,
  improveExperiencePreview,
  type LanguageStyle,
} from './resumeAiApi';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({ baseURL: API_BASE_URL });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Step types ────────────────────────────────────────────────────────────────

type InputMethod = 'type' | 'paste' | null;

interface CandidateForm {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  targetRole: string;
  experience: string;
  education: string;
  skills: string;
  certifications: string;
  projects: string;
  summary: string;
  extra: string;
}

const EMPTY_FORM: CandidateForm = {
  fullName: '', email: '', phone: '', location: '',
  targetRole: '', experience: '', education: '',
  skills: '', certifications: '', projects: '',
  summary: '', extra: '',
};

// ── Main component ────────────────────────────────────────────────────────────

const AiResumeBuilder: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'method' | 'form' | 'paste' | 'building' | 'done'>('method');
  const [method, setMethod] = useState<InputMethod>(null);
  const [form, setForm] = useState<CandidateForm>(EMPTY_FORM);
  const [pasteText, setPasteText] = useState('');
  const [error, setError] = useState('');
  const [builtResumeId, setBuiltResumeId] = useState('');
  const [buildingMsg, setBuildingMsg] = useState('Reading your information…');

  // Photo isn't part of CandidateForm (which is all plain strings sent as
  // raw text to the AI) — it's kept separate and attached to the resume
  // after autofill completes. See buildResume() below.
  const [photo, setPhoto] = useState<string | null>(null);

  // Many manpower workers are more comfortable with simple English than
  // formal resume language — default to 'simple' here (unlike the main
  // editor's AI tools, which default to 'professional'). Staff can switch.
  const [languageStyle, setLanguageStyle] = useState<LanguageStyle>('simple');

  const [skillsSuggestLoading, setSkillsSuggestLoading] = useState(false);
  const [skillsSuggestError, setSkillsSuggestError] = useState('');
  const [experienceHelpLoading, setExperienceHelpLoading] = useState(false);
  const [experienceHelpError, setExperienceHelpError] = useState('');

  const BUILDING_MESSAGES = [
    'Reading your information…',
    'Analysing your experience…',
    'Writing professional summary…',
    'Formatting skills and certifications…',
    'Finalising your resume…',
  ];

  const startBuildingMessages = () => {
    let i = 0;
    const interval = setInterval(() => {
      i++;
      if (i < BUILDING_MESSAGES.length) setBuildingMsg(BUILDING_MESSAGES[i]);
      else clearInterval(interval);
    }, 1800);
    return interval;
  };

  const buildResume = async (rawInput: string, targetRole: string) => {
    setStep('building');
    setError('');
    const interval = startBuildingMessages();
    try {
      // 1. Create a blank resume with a neutral ATS template
      const resume = await createResume({ layout: 'ats-minimal', theme: 'violet', title: 'My Resume', targetRole });

      // 2. Auto-fill it using Gemini
      const autofillRes = await api.post(`/api/resumes/ai/${resume._id}/autofill`, { rawInput, targetRole });

      // 3. Attach the photo, if one was uploaded — autofill only works from
      // text, so the photo has to be saved separately, merged with whatever
      // personalInfo autofill just wrote (name/email/phone/location).
      if (photo) {
        const filledPersonalInfo = autofillRes.data?.resume?.personalInfo || {};
        await updateResume(resume._id, {
          personalInfo: { ...filledPersonalInfo, photo },
        });
      }

      clearInterval(interval);
      setBuiltResumeId(resume._id);
      setStep('done');
    } catch (err: any) {
      clearInterval(interval);
      setError(err?.response?.data?.message || 'Something went wrong. Please try again.');
      setStep(method === 'paste' ? 'paste' : 'form');
    }
  };

  // Convert structured form to a readable paragraph for the AI
  const formToRawInput = (f: CandidateForm): string => {
    const lines: string[] = [];
    if (f.fullName) lines.push(`Name: ${f.fullName}`);
    if (f.email) lines.push(`Email: ${f.email}`);
    if (f.phone) lines.push(`Phone: ${f.phone}`);
    if (f.location) lines.push(`Location: ${f.location}`);
    if (f.targetRole) lines.push(`Target role: ${f.targetRole}`);
    if (f.summary) lines.push(`\nAbout me:\n${f.summary}`);
    if (f.experience) lines.push(`\nWork experience:\n${f.experience}`);
    if (f.education) lines.push(`\nEducation:\n${f.education}`);
    if (f.skills) lines.push(`\nSkills: ${f.skills}`);
    if (f.certifications) lines.push(`\nCertifications / Licences:\n${f.certifications}`);
    if (f.projects) lines.push(`\nProjects:\n${f.projects}`);
    if (f.extra) lines.push(`\nOther information:\n${f.extra}`);
    return lines.join('\n');
  };

  const handleFormSubmit = () => {
    const raw = formToRawInput(form);
    if (raw.trim().length < 30) {
      setError('Please fill in at least your name, experience, and skills.');
      return;
    }
    buildResume(raw, form.targetRole);
  };

  // ✨ Suggest Skills — reads the Target Job Role field and fills the
  // Skills box with occupation-specific skills + tools. Adds to whatever
  // the user already typed rather than wiping it out.
  const handleSuggestSkills = async () => {
    if (!form.targetRole.trim()) {
      setSkillsSuggestError('Type your Target Job Role first, then tap Suggest Skills.');
      return;
    }
    setSkillsSuggestLoading(true);
    setSkillsSuggestError('');
    try {
      const suggestions = await getOccupationSuggestionsPreview(
        form.targetRole,
        form.experience,
        languageStyle
      );
      const suggested = [...suggestions.skills.technical, ...suggestions.skills.tools].join(', ');
      setForm((p) => ({
        ...p,
        skills: p.skills.trim() ? `${p.skills.trim()}, ${suggested}` : suggested,
      }));
    } catch (err: any) {
      setSkillsSuggestError(err?.response?.data?.message || 'Could not suggest skills. Please try again.');
    } finally {
      setSkillsSuggestLoading(false);
    }
  };

  // ✨ Help me write this — takes whatever rough/simple text the user typed
  // in Work Experience and rewrites it into clean resume language. If the
  // box is empty, it instead offers typical responsibilities for the role
  // as a starting point the user can edit — it does NOT invent a work
  // history for them.
  const handleImproveExperience = async () => {
    if (!form.experience.trim() && !form.targetRole.trim()) {
      setExperienceHelpError('Type your Target Job Role or describe your experience first.');
      return;
    }
    setExperienceHelpLoading(true);
    setExperienceHelpError('');
    try {
      if (form.experience.trim()) {
        const bullets = await improveExperiencePreview(form.experience, form.targetRole, languageStyle);
        setForm((p) => ({ ...p, experience: bullets.map((b) => `• ${b}`).join('\n') }));
      } else {
        // No experience typed yet — offer a fresher-friendly starting
        // template based on typical responsibilities for the role.
        const suggestions = await getOccupationSuggestionsPreview(form.targetRole, '', languageStyle);
        setForm((p) => ({
          ...p,
          experience: suggestions.responsibilities.map((r) => `• ${r}`).join('\n'),
        }));
      }
    } catch (err: any) {
      setExperienceHelpError(err?.response?.data?.message || 'Could not generate suggestions. Please try again.');
    } finally {
      setExperienceHelpLoading(false);
    }
  };

  const handlePasteSubmit = () => {
    if (pasteText.trim().length < 30) {
      setError('Please paste more information so AI can build your resume.');
      return;
    }
    buildResume(pasteText, form.targetRole);
  };

  const field = (
    label: string,
    key: keyof CandidateForm,
    placeholder: string,
    multiline = false,
    rows = 3
  ) => (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {multiline ? (
        <textarea
          rows={rows}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 resize-none"
          placeholder={placeholder}
          value={form[key]}
          onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
        />
      ) : (
        <input
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          placeholder={placeholder}
          value={form[key]}
          onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
        />
      )}
    </div>
  );

  // ── STEP: Method selection ────────────────────────────────────────────────

  if (step === 'method') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-4 py-1.5 text-sm font-medium text-violet-700 mb-4">
              <Sparkles size={14} /> AI Resume Builder
            </div>
            <h1 className="text-3xl font-bold text-slate-800">Build Your Resume with AI</h1>
            <p className="mt-2 text-slate-500">
              Tell us about yourself and AI will automatically create a professional resume for you.
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => { setMethod('type'); setStep('form'); }}
              className="group rounded-2xl border-2 border-slate-200 bg-white p-6 text-left hover:border-violet-400 hover:shadow-lg transition-all"
            >
              <div className="mb-4 inline-flex rounded-xl bg-violet-100 p-3 text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                <User size={24} />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Fill a Simple Form</h3>
              <p className="mt-1 text-sm text-slate-500">
                Answer easy questions about your work history, education, and skills. AI does the rest.
              </p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-violet-600">
                Get started <ArrowRight size={14} />
              </div>
            </button>

            <button
              onClick={() => { setMethod('paste'); setStep('paste'); }}
              className="group rounded-2xl border-2 border-slate-200 bg-white p-6 text-left hover:border-violet-400 hover:shadow-lg transition-all"
            >
              <div className="mb-4 inline-flex rounded-xl bg-emerald-100 p-3 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Upload size={24} />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Paste Your Info</h3>
              <p className="mt-1 text-sm text-slate-500">
                Paste your LinkedIn About section, an old CV text, or just describe yourself in your own words.
              </p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-emerald-600">
                Paste and build <ArrowRight size={14} />
              </div>
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Your information is only used to generate your resume and is never shared.
          </p>
        </div>
      </div>
    );
  }

  // ── STEP: Paste text ──────────────────────────────────────────────────────

  if (step === 'paste') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <button
            onClick={() => { setStep('method'); setError(''); }}
            className="mb-6 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft size={15} /> Back
          </button>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-1 flex items-center gap-2">
              <Upload size={18} className="text-emerald-600" />
              <h2 className="text-xl font-bold text-slate-800">Paste Your Information</h2>
            </div>
            <p className="mb-6 text-sm text-slate-500">
              Paste your LinkedIn profile text, an old resume text, or just write a few paragraphs about your background.
              AI will extract everything and build your resume.
            </p>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Target Role <span className="text-slate-400">(optional)</span>
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                placeholder="e.g. Warehouse Worker, Electrician, Driver…"
                value={form.targetRole}
                onChange={(e) => setForm((p) => ({ ...p, targetRole: e.target.value }))}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Your Information</label>
              <textarea
                rows={12}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 resize-none"
                placeholder={`Paste anything here, for example:

My name is Ram Sharma. I'm based in Kathmandu, Nepal.
Phone: 9841000000 | Email: ram@email.com

I have 3 years of experience as a warehouse worker at ABC Logistics (2021–2024) where I handled inventory management, forklift operation, and order picking.

Before that I worked as a delivery driver at XYZ Couriers (2019–2021).

Education: +2 from Tribhuvan University, 2019.

Skills: Forklift, Inventory Management, Barcode Scanning, Order Picking, Safety Procedures.

Certifications: Forklift Operator Certificate – 2021.`}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
            </div>

            {error && (
              <div className="mt-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
            )}

            <button
              onClick={handlePasteSubmit}
              className="mt-5 w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles size={16} /> Build My Resume with AI
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP: Structured form ─────────────────────────────────────────────────

  if (step === 'form') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50 py-10 px-4">
        <div className="mx-auto max-w-2xl">
          <button
            onClick={() => { setStep('method'); setError(''); }}
            className="mb-6 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft size={15} /> Back
          </button>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={18} className="text-violet-600" />
                <h2 className="text-xl font-bold text-slate-800">Tell us about yourself</h2>
              </div>
              <p className="text-sm text-slate-500">Fill in as much as you can — AI will handle the rest and write it professionally.</p>
            </div>

            {/* Language style toggle — affects how AI writes suggestions below */}
            <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shrink-0">
              <Languages size={14} className="ml-2 text-slate-400" />
              <button
                type="button"
                onClick={() => setLanguageStyle('simple')}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  languageStyle === 'simple' ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Simple English
              </button>
              <button
                type="button"
                onClick={() => setLanguageStyle('professional')}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  languageStyle === 'professional' ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Professional English
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Personal */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <User size={16} className="text-violet-600" />
                <h3 className="font-semibold text-slate-700">Personal Information</h3>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <ImageUpload
                  imageUrl={photo}
                  onImageChange={setPhoto}
                  isPreviewMode={false}
                  className="w-24 h-24 rounded-xl shrink-0 overflow-hidden"
                />
                <p className="text-xs text-slate-400 self-center">
                  Optional. Add a clear photo — many employers expect one on manpower resumes.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field('Full Name', 'fullName', 'e.g. Ram Sharma')}
                {field('Target Job Role', 'targetRole', 'e.g. Warehouse Worker, Electrician')}
                {field('Email', 'email', 'ram@email.com')}
                {field('Phone', 'phone', '9841000000')}
                {field('Location', 'location', 'e.g. Kathmandu, Nepal')}
              </div>
            </div>

            {/* Experience */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <Briefcase size={16} className="text-blue-600" />
                  <h3 className="font-semibold text-slate-700">Work Experience</h3>
                </div>
                <button
                  type="button"
                  onClick={handleImproveExperience}
                  disabled={experienceHelpLoading}
                  className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-60"
                >
                  {experienceHelpLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  {experienceHelpLoading ? 'Writing…' : 'Help me write this'}
                </button>
              </div>
              {field(
                'Describe your work experience',
                'experience',
                `For each job write:
Job title, Company name, years worked, and what you did.

Example:
Warehouse Worker at ABC Logistics, 2021–2024.
I operated forklifts, managed inventory, picked and packed orders, and followed safety procedures.

Delivery Driver at XYZ Couriers, 2019–2021.
Delivered packages, maintained vehicle logs, and met daily delivery targets.`,
                true,
                7
              )}
              <p className="mt-1.5 text-xs text-slate-400">
                Not sure how to say it? Just write it simply in your own words, then tap "Help me write this" and AI will clean it up for you.
              </p>
              {experienceHelpError && (
                <p className="mt-1.5 text-xs text-red-600">{experienceHelpError}</p>
              )}
            </div>

            {/* Education */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap size={16} className="text-green-600" />
                <h3 className="font-semibold text-slate-700">Education</h3>
              </div>
              {field(
                'Your education background',
                'education',
                'e.g. +2 Science, Kantipur Secondary School, 2018–2020\nBSc Computer Science, Tribhuvan University, 2020–2024',
                true,
                4
              )}
            </div>

            {/* Skills */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <Wrench size={16} className="text-orange-600" />
                  <h3 className="font-semibold text-slate-700">Skills &amp; Tools</h3>
                </div>
                <button
                  type="button"
                  onClick={handleSuggestSkills}
                  disabled={skillsSuggestLoading}
                  className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 transition-colors disabled:opacity-60"
                >
                  {skillsSuggestLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  {skillsSuggestLoading ? 'Thinking…' : 'Suggest Skills'}
                </button>
              </div>
              {field(
                'List your skills, tools, equipment, or software',
                'skills',
                'e.g. Forklift Operation, Inventory Management, Barcode Scanning, MS Excel, Safety Procedures, Customer Service',
                true,
                3
              )}
              <p className="mt-1.5 text-xs text-slate-400">
                Not sure what to write? Type your Target Job Role above, then tap "Suggest Skills" — AI will add skills that match your job.
              </p>
              {skillsSuggestError && (
                <p className="mt-1.5 text-xs text-red-600">{skillsSuggestError}</p>
              )}
              {field(
                'Certifications or Licences',
                'certifications',
                'e.g. Forklift Operator Certificate (2021), Driving Licence – Category B',
                true,
                2
              )}
            </div>

            {/* Projects / Extra */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={16} className="text-slate-500" />
                <h3 className="font-semibold text-slate-700">Projects &amp; Anything Else <span className="text-slate-400 font-normal text-xs">(optional)</span></h3>
              </div>
              {field(
                'Projects',
                'projects',
                'Describe any projects, freelance work, or achievements.',
                true,
                3
              )}
              {field(
                'Anything else to add?',
                'extra',
                'Languages you speak, awards, volunteer work, hobbies relevant to the job…',
                true,
                2
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
          )}

          <button
            onClick={handleFormSubmit}
            className="mt-6 w-full rounded-xl bg-violet-600 py-4 text-sm font-semibold text-white hover:bg-violet-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-violet-200"
          >
            <Sparkles size={16} /> Build My Resume with AI
          </button>
          <p className="mt-3 text-center text-xs text-slate-400">Takes about 10–15 seconds</p>
        </div>
      </div>
    );
  }

  // ── STEP: Building ────────────────────────────────────────────────────────

  if (step === 'building') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="relative inline-flex mb-8">
            <div className="w-20 h-20 rounded-full bg-violet-100 flex items-center justify-center">
              <Sparkles size={36} className="text-violet-600 animate-pulse" />
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Building Your Resume…</h2>
          <p className="text-slate-500 text-sm animate-pulse">{buildingMsg}</p>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Loader2 size={12} className="animate-spin" />
            AI is writing your professional resume
          </div>
        </div>
      </div>
    );
  }

  // ── STEP: Done ────────────────────────────────────────────────────────────

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 inline-flex w-20 h-20 rounded-full bg-emerald-100 items-center justify-center">
            <CheckCircle2 size={40} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Your Resume is Ready!</h2>
          <p className="text-slate-500 text-sm mb-8">
            AI has filled in your resume. Open the editor to review, adjust, and download it as a PDF.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => navigate(`/resume/${builtResumeId}/edit`)}
              className="w-full rounded-xl bg-violet-600 py-3.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
            >
              <FileText size={16} /> Open &amp; Edit My Resume
            </button>
            <button
              onClick={() => { setStep('method'); setForm(EMPTY_FORM); setPasteText(''); setError(''); }}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Build Another Resume
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default AiResumeBuilder;