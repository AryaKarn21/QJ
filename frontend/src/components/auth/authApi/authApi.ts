import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';

// Neither registration call sets an explicit multipart Content-Type on
// purpose: axios/the browser has to generate that header itself so it
// includes the `boundary=...` parameter the request body actually uses.
// A hand-set 'multipart/form-data' (no boundary) makes busboy/multer throw
// "Multipart: Boundary not found" on every submission that includes a
// file (company logo / resume) — see the identical fix applied to every
// other FormData upload call in this codebase.
export const registerEmployer = async (formData: FormData) => {
  const response = await axios.post(`${API_BASE_URL}/api/users/register`, formData);
  return response.data;
};


export const registerJobseeker = async (formData: FormData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/users/register`, formData);
    return response.data;
  } catch (error: any) {
    // Propagate the error with more detail if available
    throw error.response?.data || error.message;
  }
};


interface OtpVerificationPayload {
  email: string;
  otp: string;
}


export const verifyOtp = async (payload: OtpVerificationPayload) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/users/verify-otp`, payload);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};
interface ResendOtpPayload {
  email: string;
}

/**
 * Requests a new One-Time Password (OTP) to be sent to the given email.
 */
export const resendOtp = async (payload: ResendOtpPayload) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/users/resend-otp`, payload);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};


interface LoginPayload {
  email: string;
  password: string;
}

/**
 * Logs in a user with the provided email and password.
 */
export const loginUser = async (payload: LoginPayload) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/users/login`, payload);
    return response.data;
  } catch (error: any) {
    // Propagate the error message from the backend if available
    throw error.response?.data || error.message;
  }
};

interface ForgotPasswordPayload {
  email: string;
}


export const forgotPassword = async (payload: ForgotPasswordPayload) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/users/forgot-password`, payload);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};


interface ResetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
}

export const resetPassword = async (payload: ResetPasswordPayload) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/users/reset-password`, payload);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};

interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export const changePassword = async (payload: ChangePasswordPayload) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/users/change-password`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};

