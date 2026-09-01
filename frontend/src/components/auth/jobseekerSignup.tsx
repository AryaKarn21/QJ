import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, Upload, PlusCircle, MinusCircle, UserRoundPlus, XCircle } from 'lucide-react'; //
import { useMutation } from '@tanstack/react-query';
import Logo from '../../assets/quickjobs.png';
import SignUpImage from '../../assets/authImages/Signup.png';
import { registerJobseeker } from './authApi/authApi';
import Cookies from 'js-cookie';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://backend-server.rupeshkumar.com.np';

// Defines the shape of the form data
interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  profilePic: File | null;
  skills: string[];
  qualifications: { degree: string; institution: string; year: number | '' }[];
  experiences: { jobPosition: string; institution: string; duration: string }[];
  resume: File | null;
}

// Reusable component for a single Qualification entry
interface QualificationEntryProps {
  qualification: { degree: string; institution: string; year: number | '' };
  index: number;
  onChange: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  showRemoveButton: boolean;
  error?: string;
}

const QualificationEntry: React.FC<QualificationEntryProps> = ({
  qualification, index, onChange, onRemove, showRemoveButton, error
}) => (
  <div className="flex flex-col gap-2 mb-3 p-3 border border-gray-200 rounded-md bg-gray-50 shadow-sm relative text-sm">
    <input
      type="text" name="degree" value={qualification.degree} onChange={(e) => onChange(index, e)}
      placeholder="Degree (e.g., B.Sc Computer Science)"
      className="px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
    />
    <input
      type="text" name="institution" value={qualification.institution} onChange={(e) => onChange(index, e)}
      placeholder="Institution"
      className="px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
    />
    <input
      type="text" name="year" value={qualification.year} onChange={(e) => onChange(index, e)}
      placeholder="Year"
      className="px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
    />
    {showRemoveButton && (
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="self-end text-red-600 hover:text-red-800 focus:outline-none focus:ring-1 focus:ring-red-500 rounded-full mt-1"
      >
        <MinusCircle size={18} />
      </button>
    )}
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

// Reusable component for a single Experience entry
interface ExperienceEntryProps {
  experience: { jobPosition: string; institution: string; duration: string };
  index: number;
  onChange: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  showRemoveButton: boolean;
  error?: string;
}

const ExperienceEntry: React.FC<ExperienceEntryProps> = ({
  experience, index, onChange, onRemove, showRemoveButton, error
}) => (
  <div className="flex flex-col gap-2 mb-3 p-3 border border-gray-200 rounded-md bg-gray-50 shadow-sm relative text-sm">
    <input
      type="text" name="jobPosition" value={experience.jobPosition} onChange={(e) => onChange(index, e)}
      placeholder="Job Position (e.g., Frontend Developer)"
      className="px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
    />
    <input
      type="text" name="institution" value={experience.institution} onChange={(e) => onChange(index, e)}
      placeholder="Institution"
      className="px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
    />
    <input
      type="text" name="duration" value={experience.duration} onChange={(e) => onChange(index, e)}
      placeholder="Duration (e.g., 2 years)"
      className="px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
    />
    {showRemoveButton && (
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="self-end text-red-600 hover:text-red-800 focus:outline-none focus:ring-1 focus:ring-red-500 rounded-full mt-1"
      >
        <MinusCircle size={18} />
      </button>
    )}
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);


const JobseekerSignup: React.FC = () => {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '', email: '', password: '', confirmPassword: '',
    profilePic: null, skills: [], // Initialize skills as an empty array
    qualifications: [{ degree: '', institution: '', year: '' }],
    experiences: [{ jobPosition: '', institution: '', duration: '' }],
    resume: null,
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const [newSkillInput, setNewSkillInput] = useState<string>(''); // State for the new skill input

  const mutation = useMutation({
    mutationFn: registerJobseeker,
    onSuccess: (data) => {
      console.log('Registration successful:', data);
      alert(data.message || 'Registration successful! You can now log in.');
      // Set cookies for name and email with 10 minutes expiry
      const expires = new Date(new Date().getTime() + 10 * 60 * 1000); // 10 minutes from now
      Cookies.set('userName', formData.name, { expires: expires, secure: true, sameSite: 'Lax' });
      Cookies.set('userEmail', formData.email, { expires: expires, secure: true, sameSite: 'Lax' });
      navigate('/signup/verify-otp'); // Redirect to OTP verification page
    },
    onError: (error: any) => {
      console.error('Registration failed:', error);
      alert(`Registration failed: ${error?.message || 'Something went wrong.'}`);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormErrors(prev => { const newErrors = { ...prev }; delete newErrors[name]; return newErrors; });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    const file = files?.[0] || null;

    setFormData(prev => ({ ...prev, [name]: file }));
    if (name === 'profilePic') {
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setProfilePicPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setProfilePicPreview(null);
      }
    }
    setFormErrors(prev => { const newErrors = { ...prev }; delete newErrors[name]; return newErrors; });
  };

  const handleQualificationChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newQualifications = formData.qualifications.map((q, i) =>
      i === index ? { ...q, [name]: name === 'year' ? parseInt(value) || '' : value } : q
    );
    setFormData(prev => ({ ...prev, qualifications: newQualifications }));
    setFormErrors(prev => { const newErrors = { ...prev }; delete newErrors[`qualification-${index}`]; return newErrors; });
  };

  const addQualification = () => {
    setFormData(prev => ({
      ...prev,
      qualifications: [...prev.qualifications, { degree: '', institution: '', year: '' }]
    }));
  };

  const removeQualification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      qualifications: prev.qualifications.filter((_, i) => i !== index)
    }));
  };

  const handleExperienceChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newExperiences = formData.experiences.map((exp, i) =>
      i === index ? { ...exp, [name]: value } : exp
    );
    setFormData(prev => ({ ...prev, experiences: newExperiences }));
    setFormErrors(prev => { const newErrors = { ...prev }; delete newErrors[`experience-${index}`]; return newErrors; });
  };

  const addExperience = () => {
    setFormData(prev => ({
      ...prev,
      experiences: [...prev.experiences, { jobPosition: '', institution: '', duration: '' }]
    }));
  };

  const removeExperience = (index: number) => {
    setFormData(prev => ({
      ...prev,
      experiences: prev.experiences.filter((_, i) => i !== index)
    }));
  };

  // Handles adding a new skill
  const handleAddSkill = () => {
    const trimmedSkill = newSkillInput.trim();
    if (trimmedSkill && !formData.skills.includes(trimmedSkill)) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, trimmedSkill]
      }));
      setNewSkillInput(''); // Clear the input field
      setFormErrors(prev => { const newErrors = { ...prev }; delete newErrors.skills; return newErrors; }); // Clear skill error if any
    } else if (trimmedSkill && formData.skills.includes(trimmedSkill)) {
      setFormErrors(prev => ({ ...prev, skills: 'Skill already added.' }));
    } else if (!trimmedSkill) {
      setFormErrors(prev => ({ ...prev, skills: 'Skill cannot be empty.' }));
    }
  };

  // Handles removing an existing skill
  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };


  const validateForm = () => {
    let newErrors: { [key: string]: string } = {};
    let isValid = true;

    if (!formData.name.trim()) { newErrors.name = 'Full Name is required'; isValid = false; }
    if (!formData.email.trim()) { newErrors.email = 'Email is required'; isValid = false; }
    else if (!/\S+@\S+\.\S+/.test(formData.email)) { newErrors.email = 'Invalid email format'; isValid = false; }
    if (!formData.password) { newErrors.password = 'Password is required'; isValid = false; }
    else if (formData.password.length < 6) { newErrors.password = 'Password must be at least 6 characters long'; isValid = false; }
    if (formData.password !== formData.confirmPassword) { newErrors.confirmPassword = 'Passwords do not match'; isValid = false; }
    // Resume is no longer required, so no validation needed here.

    // Validate qualifications: ensure all fields in each entry are filled if present
    formData.qualifications.forEach((q, index) => {
      // If any field in a qualification entry has content, all must be filled
      if ((q.degree.trim() || q.institution.trim() || q.year) && (!q.degree.trim() || !q.institution.trim() || !q.year)) {
        newErrors[`qualification-${index}`] = 'All fields (Degree, Institution, Year) are required for each qualification entry.';
        isValid = false;
      }
    });

    // Validate experiences: ensure all fields in each entry are filled if present
    formData.experiences.forEach((exp, index) => {
      // If any field in an experience entry has content, all must be filled
      if ((exp.jobPosition.trim() || exp.institution.trim() || exp.duration.trim()) && (!exp.jobPosition.trim() || !exp.institution.trim() || !exp.duration.trim())) {
        newErrors[`experience-${index}`] = 'All experience fields are required.';
        isValid = false;
      }
    });

    setFormErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      alert('Please correct the errors in the form before submitting.');
      return;
    }

    const dataToSend = new FormData();
    dataToSend.append('name', formData.name);
    dataToSend.append('email', formData.email);
    dataToSend.append('password', formData.password);
    dataToSend.append('role', 'jobseeker');

    if (formData.profilePic) dataToSend.append('profilePic', formData.profilePic);
    if (formData.skills.length > 0) {
      // Stringify the array of skills
      dataToSend.append('skills', JSON.stringify(formData.skills));
    }

    const validQualifications = formData.qualifications.filter(q => q.degree.trim() || q.institution.trim() || q.year);
    if (validQualifications.length > 0) dataToSend.append('qualifications', JSON.stringify(validQualifications));

    const validExperiences = formData.experiences.filter(exp => exp.jobPosition.trim() || exp.institution.trim() || exp.duration.trim());
    if (validExperiences.length > 0) dataToSend.append('experiences', JSON.stringify(validExperiences));

    if (formData.resume) dataToSend.append('resume', formData.resume); // Resume is optional now

    mutation.mutate(dataToSend);
  };

  const handleGoogleSignIn = () => {
    // Redirect to backend Google OAuth endpoint
    window.location.href = `${API_BASE_URL}/api/auth/google`;
  };

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
      <div className="max-w-5xl w-full bg-white rounded-lg shadow-card flex overflow-hidden">
        {/* Left Panel - Image */}
        <div className="w-1/2 hidden md:flex items-center justify-center bg-primary p-10 rounded-l-lg">
          <img src={SignUpImage} alt="Sign Up" className="max-h-[500px] object-contain" />
        </div>

        {/* Right Panel - Form */}
        <div className="w-full md:w-1/2 p-6 ml-6 md:p-2 flex flex-col overflow-auto" style={{ maxHeight: 'calc(100vh - 50px)' }}>
          <div className="mb-6 text-center">
            <div className="flex justify-center mb-3">
              <div className="text-primary font-bold text-2xl flex items-center">
                <img src={Logo} alt="Logo" className="h-30 w-20 mr-2" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Find Your Next Opportunity</h2>
            <p className="text-gray-600">Create an account to get started</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 flex-grow">
            {/* Full Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
              <input
                type="text" id="name" name="name" value={formData.name} onChange={handleChange} required
                placeholder="Enter your full name"
                className={`w-full px-4 py-2.5 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 ${formErrors.name ? 'border-red-500' : 'border-gray-300'}`}
              />
              {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">Email Address *</label>
              <input
                type="email" id="email" name="email" value={formData.email} onChange={handleChange} required
                placeholder="Enter your email"
                className={`w-full px-4 py-2.5 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 ${formErrors.email ? 'border-red-500' : 'border-gray-300'}`}
              />
              {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
            </div>

            {/* Profile Picture Upload and Preview */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Profile Picture</label>
              <div className="flex items-center space-x-4">
                <label htmlFor="profilePic" className="w-28 h-28 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer overflow-hidden relative group transition-all duration-300 hover:border-primary hover:shadow-md">
                  {profilePicPreview ? (
                    <img src={profilePicPreview} alt="Profile Preview" className="w-full h-full object-cover" />
                  ) : (
                    <UserRoundPlus className="text-gray-400 w-12 h-12 group-hover:text-blue-500 transition-colors" />
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                    <Upload className="text-white w-8 h-8" />
                  </div>
                  <input
                    type="file" id="profilePic" name="profilePic" accept="image/*" className="sr-only" onChange={handleFileChange}
                  />
                </label>
                <div>
                  <p className="text-sm text-gray-600">Upload your professional photo.</p>
                  <p className="text-xs text-gray-500">JPG, PNG, GIF up to 2MB</p>
                  {formData.profilePic && <p className="mt-1 text-xs text-gray-700 font-medium">Selected: {formData.profilePic.name}</p>}
                  {formErrors.profilePic && <p className="text-red-500 text-xs mt-1">{formErrors.profilePic}</p>}
                </div>
              </div>
            </div>

            {/* Skills (with Add/Remove buttons) */}
            <div>
              <label htmlFor="newSkill" className="block text-sm font-semibold text-gray-700 mb-2">Skills</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text" id="newSkill" value={newSkillInput} onChange={(e) => setNewSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); } }} // Allow adding with Enter key
                  placeholder="Add a skill (e.g., React)"
                  className={`flex-grow px-4 py-2.5 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 ${formErrors.skills ? 'border-red-500' : 'border-gray-300'}`}
                />
                <button
                  type="button" onClick={handleAddSkill}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Add
                </button>
              </div>
              {formErrors.skills && <p className="text-red-500 text-xs mt-1">{formErrors.skills}</p>}
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.skills.map((skill, index) => (
                  <span key={index} className="flex items-center bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full shadow-sm">
                    {skill}
                    <button type="button" onClick={() => handleRemoveSkill(skill)} className="ml-2 text-blue-600 hover:text-blue-900 transition-colors focus:outline-none">
                      <XCircle size={16} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Qualifications */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Qualifications</label>
              {formData.qualifications.map((q, index) => (
                <QualificationEntry
                  key={index}
                  qualification={q}
                  index={index}
                  onChange={handleQualificationChange}
                  onRemove={removeQualification}
                  showRemoveButton={formData.qualifications.length > 1}
                  error={formErrors[`qualification-${index}`]}
                />
              ))}
              <button type="button" onClick={addQualification} className="flex items-center text-blue-600 hover:text-blue-800 transition-colors mt-2 font-medium">
                <PlusCircle size={20} className="mr-1" /> Add Qualification
              </button>
            </div>

            {/* Experiences */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Experiences</label>
              {formData.experiences.map((exp, index) => (
                <ExperienceEntry
                  key={index}
                  experience={exp}
                  index={index}
                  onChange={handleExperienceChange}
                  onRemove={removeExperience}
                  showRemoveButton={formData.experiences.length > 1}
                  error={formErrors[`experience-${index}`]}
                />
              ))}
              <button type="button" onClick={addExperience} className="flex items-center text-blue-600 hover:text-blue-800 transition-colors mt-2 font-medium">
                <PlusCircle size={20} className="mr-1" /> Add Experience
              </button>
            </div>

            {/* Resume Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Upload Your Resume</label>
              <div className="flex items-center gap-4">
                <input
                  type="file" id="resume" name="resume" accept=".pdf,.doc,.docx,.txt" className="flex-grow text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer transition duration-200"
                  onChange={handleFileChange}
                />
                {formData.resume && (
                  <p className="text-sm text-gray-600 truncate max-w-[150px]">
                    {formData.resume.name}
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX, TXT up to 2MB</p>
              {formErrors.resume && <p className="text-red-500 text-xs mt-1">{formErrors.resume}</p>}
            </div>


            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  name="password"
                  placeholder="Enter password"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="pointer-events-auto text-gray-500"
                    aria-label="Toggle password visibility"
                  >
                    <Eye size={20} />
                  </button>
                </div>
              </div>
              {formErrors.password && <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password *</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  minLength={6}
                  placeholder="Confirm password"
                  className={`w-full px-4 py-2.5 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 ${formErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors focus:outline-none"
                  aria-label="Toggle confirm password visibility"
                >
                  <Eye size={20} />
                </button>
              </div>
              {formErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{formErrors.confirmPassword}</p>}
            </div>


            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-primary transition-colors font-semibold shadow-md disabled:opacity-60 disabled:cursor-not-allowed text-lg"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Creating Profile...' : 'Create Profile'}
            </button>

            {/* API Status Messages */}
            {mutation.isError && (
              <p className="text-red-500 text-center text-sm mt-3">
                Error: {mutation.error.message || 'Failed to register job seeker.'}
              </p>
            )}
            {mutation.isSuccess && (
              <p className="text-green-600 text-center text-sm mt-3">
                Registration successful! Redirecting to OTP verification...
              </p>
            )}

            {/* Divider and Google Sign-in */}
            <div className="relative flex items-center justify-center my-6">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="flex-shrink mx-4 text-gray-500 text-sm">or</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full bg-white border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg hover:bg-gray-50 flex items-center justify-center font-medium shadow-sm transition-colors"
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/2048px-Google_%22G%22_logo.svg.png" alt="Google Logo" className="h-5 w-5 mr-3" />
              Continue with Google
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-600 flex-shrink-0">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:primary font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default JobseekerSignup;
