import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://backend-server.rupeshkumar.com.np";

const authHeaders = () => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${token}` };
};

export interface CompanySearchResult {
  _id: string;
  name: string;
  companyLogo?: string;
  industryType?: string;
}

export const searchCompanies = async (q: string): Promise<CompanySearchResult[]> => {
  if (!q || q.trim().length < 2) return [];
  const res = await axios.get(`${API_BASE_URL}/api/employer/search-companies`, {
    params: { q },
    headers: authHeaders(),
  });
  return res.data.employers;
};