import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import Cookies from 'js-cookie'; 

import { registerEmployer } from './authApi/authApi'; 

type FormStep = 'account' | 'information' | 'contact' | 'preview';

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  panNumber: string;
  establishedDate: string;
  industryType: string;
  companySize: 'small' | 'medium' | 'large' | '';
  companyLogo: File | null;
  telephone: string;
  address: string;
  description: string;
}

const EmployerSignup: React.FC = () => {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<FormStep>('account');
  const [formData, setFormData] = useState<FormData>({
    name: '', email: '', password: '', confirmPassword: '',
    panNumber: '', establishedDate: '', industryType: '', companySize: '',
    companyLogo: null, telephone: '', address: '', description: ''
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const registerMutation = useMutation({
    mutationFn: registerEmployer,
    onSuccess: (data) => {
      console.log('Registration successful:', data);
      alert(data.message || 'Registration successful! An OTP has been sent to your email.');

      // Set cookies for name and email with 10 minutes expiry
      const expires = new Date(new Date().getTime() + 10 * 60 * 1000); // 10 minutes from now
      Cookies.set('userName', formData.name, { expires: expires, secure: true, sameSite: 'Lax' });
      Cookies.set('userEmail', formData.email, { expires: expires, secure: true, sameSite: 'Lax' });

      navigate('/signup/verify-otp'); // Redirect to OTP verification page
    },
    onError: (error: any) => {
      console.error('Registration failed:', error.response?.data || error.message);
      alert(`Registration failed: ${error.response?.data?.message || 'Something went wrong.'}`);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormErrors(prev => { const newErrors = { ...prev }; delete newErrors[name]; return newErrors; });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    setFormData(prev => ({ ...prev, [name]: files && files.length > 0 ? files[0] : null }));
    setFormErrors(prev => { const newErrors = { ...prev }; delete newErrors[name]; return newErrors; });
  };

  const validateStep = (step: FormStep): boolean => {
    let errors: { [key: string]: string } = {};
    let isValid = true;

    if (step === 'account') {
      if (!formData.name.trim()) { errors.name = 'Company Name is required'; isValid = false; }
      if (!formData.email.trim()) { errors.email = 'Email is required'; isValid = false; }
      else if (!/\S+@\S+\.\S+/.test(formData.email)) { errors.email = 'Invalid email format'; isValid = false; }
      if (!formData.password) { errors.password = 'Password is required'; isValid = false; }
      else if (formData.password.length < 6) { errors.password = 'Password must be at least 6 characters long'; isValid = false; }
      if (formData.password !== formData.confirmPassword) { errors.confirmPassword = 'Passwords do not match'; isValid = false; }
    }
    // Add validation for 'information' and 'contact' steps if needed
    // Example for Information step (minimal check)
    if (step === 'information') {
      // You can add required checks for panNumber, establishedDate etc. here
      // if (!formData.panNumber) { errors.panNumber = 'PAN Number is required'; isValid = false; }
    }
    setFormErrors(errors);
    return isValid;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep === 'account') setCurrentStep('information');
    else if (currentStep === 'information') setCurrentStep('contact');
    else if (currentStep === 'contact') setCurrentStep('preview');
  };

  const handleBack = () => {
    if (currentStep === 'information') setCurrentStep('account');
    else if (currentStep === 'contact') setCurrentStep('information');
    else if (currentStep === 'preview') setCurrentStep('contact');
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate all steps before final submission
    if (!validateStep('account') || !validateStep('information') || !validateStep('contact')) {
      alert("Please complete all required fields in the previous steps.");
      return;
    }

    const dataToSend = new FormData();
    dataToSend.append('name', formData.name);
    dataToSend.append('email', formData.email);
    dataToSend.append('password', formData.password);
    dataToSend.append('role', 'employer'); // Set role to employer

    // Append optional fields only if they have values
    if (formData.panNumber) dataToSend.append('panNumber', formData.panNumber);
    if (formData.establishedDate) dataToSend.append('establishedDate', formData.establishedDate);
    if (formData.industryType) dataToSend.append('industryType', formData.industryType);
    if (formData.companySize) dataToSend.append('companySize', formData.companySize);
    if (formData.telephone) dataToSend.append('telephone', formData.telephone);
    if (formData.address) dataToSend.append('address', formData.address);
    if (formData.description) dataToSend.append('description', formData.description);
    if (formData.companyLogo) dataToSend.append('companyLogo', formData.companyLogo);

    registerMutation.mutate(dataToSend);
  };

  const renderStepIndicator = (step: FormStep, label: string, stepNumber: number) => {
    const isCompleted = (
      (currentStep === 'information' && step === 'account') ||
      (currentStep === 'contact' && ['account', 'information'].includes(step)) ||
      (currentStep === 'preview' && ['account', 'information', 'contact'].includes(step)) ||
      (registerMutation.isSuccess && stepNumber <= 4) // Assuming 4 is the final step
    );
    const isCurrent = currentStep === step;

    return (
      <div className="flex flex-col items-center flex-1 min-w-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 flex-shrink-0
          ${isCompleted ? 'bg-green-500 text-white' : isCurrent ? 'bg-primary text-white' : 'bg-gray-300 text-gray-600'}`}>
          {isCompleted ? <Check size={16} /> : stepNumber}
        </div>
        <span className="text-sm font-medium text-center text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis px-1">{label}</span>
      </div>
    );
  };

  const renderAccountStep = () => (
    <div className="space-y-6">
      <div>
        <label htmlFor="companyName" className="block text-sm font-semibold text-gray-700 mb-1">Company Name *</label>
        <input
          type="text" id="companyName" name="name" value={formData.name} onChange={handleChange}
          className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ${formErrors.name ? 'border-red-500' : 'border-gray-300'}`}
          placeholder="Enter Company Name" required
        />
        {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
        <input
          type="email" id="email" name="email" value={formData.email} onChange={handleChange}
          className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ${formErrors.email ? 'border-red-500' : ''}`}
          placeholder="Your company Email" required
        />
        {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">Password *</label>
        <input
          type="password" id="password" name="password" value={formData.password} onChange={handleChange}
          className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ${formErrors.password ? 'border-red-500' : ''}`}
          placeholder="Enter your password" required
        />
        <div className="mt-1 text-sm text-gray-500">• At least 6 Characters</div>
        {formErrors.password && <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>}
      </div>
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-1">Confirm Password *</label>
        <input
          type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
          className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ${formErrors.confirmPassword ? 'border-red-500' : ''}`}
          placeholder="Confirm your Password" required
        />
        {formErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{formErrors.confirmPassword}</p>}
      </div>
    </div>
  );

  const renderInformationStep = () => (
    <div className="space-y-6">
      <div>
        <label htmlFor="companyLogo" className="block text-sm font-semibold text-gray-700 mb-1">Company Logo</label>
        <input
          type="file" id="companyLogo" name="companyLogo" onChange={handleFileChange}
          className="w-full text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer transition duration-200"
          accept="image/jpeg,image/png,image/gif"
        />
        {formData.companyLogo && (<p className="text-sm text-gray-500 mt-1">Selected file: {formData.companyLogo.name}</p>)}
      </div>
      <div>
        <label htmlFor="panNumber" className="block text-sm font-semibold text-gray-700 mb-1">PAN Number</label>
        <input
          type="text" id="panNumber" name="panNumber" value={formData.panNumber} onChange={handleChange}
          className="w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 border-gray-300"
          placeholder="Enter PAN Number"
        />
      </div>
      <div>
        <label htmlFor="establishedDate" className="block text-sm font-semibold text-gray-700 mb-1">Established Date</label>
        <input
          type="text"
          id="establishedDate" name="establishedDate" value={formData.establishedDate} onChange={handleChange}
          className="w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 border-gray-300"
          placeholder="YYYY-MM-DD"
        />
      </div>
      <div>
        <label htmlFor="industryType" className="block text-sm font-semibold text-gray-700 mb-1">Industry Type</label>
        <div className="relative">
          <select
            id="industryType" name="industryType" value={formData.industryType} onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 border-gray-300 appearance-none bg-white pr-8 cursor-pointer"
          >
            <option value="">Choose Industry Type</option>
            <option value="it">Information Technology</option>
            <option value="manufacturing">Manufacturing</option>
            <option value="healthcare">Healthcare</option>
            <option value="finance">Finance</option><option value="retail">Retail</option><option value="education">Education</option><option value="hospitality">Hospitality</option><option value="construction">Construction</option><option value="other">Other</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 6.757 7.586 5.343 9z"/></svg>
          </div>
        </div>
      </div>
      <div>
        <label htmlFor="companySize" className="block text-sm font-semibold text-gray-700 mb-1">Company Size</label>
        <div className="relative">
          <select
            id="companySize" name="companySize" value={formData.companySize} onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 border-gray-300 appearance-none bg-white pr-8 cursor-pointer"
          >
            <option value="">Select Size</option> {/* Added default option */}
            <option value="small">Small (1-10 employees)</option>
            <option value="medium">Medium (11-100 employees)</option>
            <option value="large">Large (100+ employees)</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 6.757 7.586 5.343 9z"/></svg>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContactStep = () => (
    <div className="space-y-6">
      <div>
        <label htmlFor="address" className="block text-sm font-semibold text-gray-700 mb-1">Enter Your Address</label>
        <input
          type="text" id="address" name="address" value={formData.address} onChange={handleChange}
          className="w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 border-gray-300"
          placeholder="Enter your address"
        />
      </div>
      <div>
        <label htmlFor="mobileNumber" className="block text-sm font-semibold text-gray-700 mb-1">Mobile Number</label>
        <input
          type="tel" id="mobileNumber" name="telephone" value={formData.telephone} onChange={handleChange}
          className="w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 border-gray-300"
          placeholder="Enter mobile Number"
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
        <textarea
          id="description" name="description" value={formData.description} onChange={handleChange}
          className="w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 border-gray-300"
          rows={4} placeholder="Short description about your company"
        />
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-bold text-primary mb-4">Account Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div><div className="text-sm text-gray-600 font-medium">Company Name</div><div className="text-gray-800">{formData.name}</div></div>
          <div><div className="text-sm text-gray-600 font-medium">Email</div><div className="text-gray-800">{formData.email}</div></div>
          <div><div className="text-sm text-gray-600 font-medium">Password</div><div className="text-gray-800">••••••••••</div></div>
          <div><div className="text-sm text-gray-600 font-medium">Confirm Password</div><div className="text-gray-800">••••••••••</div></div>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-bold text-primary mb-4">Company Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div><div className="text-sm text-gray-600 font-medium">PAN Number</div><div className="text-gray-800">{formData.panNumber || 'N/A'}</div></div>
          <div><div className="text-sm text-gray-600 font-medium">Established Date</div><div className="text-gray-800">{formData.establishedDate || 'N/A'}</div></div>
          <div><div className="text-sm text-gray-600 font-medium">Industry Type</div><div className="text-gray-800">{formData.industryType || 'N/A'}</div></div>
          <div><div className="text-sm text-gray-600 font-medium">Company Size</div><div className="text-gray-800">{formData.companySize === 'small' ? 'Small (1-10 employees)' : formData.companySize === 'medium' ? 'Medium (11-100 employees)' : formData.companySize === 'large' ? 'Large (100+ employees)' : 'N/A'}</div></div>
          <div className="col-span-1 md:col-span-2"><div className="text-sm text-gray-600 font-medium">Company Logo</div><div className="text-gray-800">{formData.companyLogo ? formData.companyLogo.name : 'No file selected'}</div></div>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-bold text-primary mb-4">Contact Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div><div className="text-sm text-gray-600 font-medium">Mobile Number</div><div className="text-gray-800">{formData.telephone || 'N/A'}</div></div>
          <div><div className="text-sm text-gray-600 font-medium">Address</div><div className="text-gray-800">{formData.address || 'N/A'}</div></div>
          <div className="col-span-1 md:col-span-2"><div className="text-sm text-gray-600 font-medium">Description</div><div className="text-gray-800">{formData.description || 'N/A'}</div></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br  flex items-center justify-center px-4 py-2 font-inter">
      <div className="max-w-3xl w-full bg-white rounded-xl shadow-2xl p-6">
        <h1 className="text-center text-3xl font-bold text-gray-800 mb-8">Sign Up as a Job Provider</h1>

        <div className="flex justify-between items-center mb-8 relative">
          <div className="absolute top-4 left-0 right-0 h-[2px] bg-gray-300 z-0" />
          <div className="flex-1 flex justify-between relative z-10">
            {renderStepIndicator('account', 'Account', 1)}
            {renderStepIndicator('information', 'Company Info', 2)}
            {renderStepIndicator('contact', 'Contact Info', 3)}
            {renderStepIndicator('preview', 'Preview', 4)}
          </div>
        </div>

        <form onSubmit={handleRegisterSubmit}> {/* Form wrapping all steps */}
          {currentStep === 'account' && renderAccountStep()}
          {currentStep === 'information' && renderInformationStep()}
          {currentStep === 'contact' && renderContactStep()}
          {currentStep === 'preview' && renderPreviewStep()}

          <div className="flex justify-between mt-8">
            {currentStep !== 'account' && (
              <button
                type="button" onClick={handleBack}
                className="px-6 py-2 text-primary font-semibold rounded-lg hover:bg-blue-50 transition duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={registerMutation.isPending}
              >Back</button>
            )}
            {currentStep === 'account' && (
              <Link to="/login" className="px-6 py-2 text-primary font-semibold rounded-lg hover:bg-blue-50 transition duration-200">
                Back to Login
              </Link>
            )}
            {currentStep !== 'preview' ? (
              <button
                type="button" onClick={handleNext}
                className="px-6 py-2 bg-primary text-white font-semibold rounded-lg shadow-md hover:bg-primary transition duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={registerMutation.isPending}
              >Next</button>
            ) : (
              <button
                type="submit" // This button now triggers the actual form submission
                className="px-8 py-3 bg-primary text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? 'Submitting...' : 'Sign Up'}
              </button>
            )}
          </div>
          {registerMutation.isError && (
            <p className="text-red-500 text-center mt-4">
              Error: {registerMutation.error?.response?.data?.message || 'Failed to register.'}
            </p>
          )}
          {registerMutation.isSuccess && (
            <p className="text-green-600 text-center mt-4">
              Registration successful! Redirecting for email verification...
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default EmployerSignup;
