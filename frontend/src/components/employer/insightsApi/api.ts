import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://qj.onrender.com';

const authHeaders = () => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

export const fetchJobStats = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/insights/job-stats`, {
    headers: authHeaders(),
  });
  return res.data;
};


export const fetchConversionRates = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/insights/conversion-rates`, {
    headers: authHeaders(),
  });
  return res.data;
};

export const fetchJobPostComparison = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/insights/job-comparison`, {
    headers: authHeaders(),
  });
  return res.data;
};

export const fetchDashboardStats = async () => {
  const res = await axios.get(`${API_BASE_URL}/api/insights/dashboard-stats`, {
    headers: authHeaders(),
  });
  return res.data;
};
