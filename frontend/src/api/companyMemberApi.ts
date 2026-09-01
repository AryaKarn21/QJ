import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://backend-server.rupeshkumar.com.np";

const authHeaders = () => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${token}` };
};

export interface CompanyMember {
  _id: string;
  company: string;
  user: {
    _id: string;
    name: string;
    email: string;
    headline?: string;
    profilePic?: string;
    bio?: string;
    socialLinks?: {
      linkedin?: string;
      twitter?: string;
      github?: string;
      website?: string;
    };
    role: string;
  };
  designation: string;
  department: string;
  joinedAt: string;
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string;
}

export interface UserSearchResult {
  _id: string;
  name: string;
  email: string;
  role: string;
  headline?: string;
  profilePic?: string;
}

// ── Public ─────────────────────────────────────────────────────────────────

export const getEmployees = async (
  companyId: string,
  params: { search?: string; department?: string; status?: string } = {}
): Promise<CompanyMember[]> => {
  const res = await axios.get(
    `${API_BASE_URL}/api/companies/${companyId}/employees`,
    { params }
  );
  return res.data.employees;
};

export const getEmployeeCount = async (companyId: string): Promise<number> => {
  const res = await axios.get(
    `${API_BASE_URL}/api/companies/${companyId}/employees/count`
  );
  return res.data.count;
};

export const getEmployee = async (
  companyId: string,
  memberId: string
): Promise<CompanyMember> => {
  const res = await axios.get(
    `${API_BASE_URL}/api/companies/${companyId}/employees/${memberId}`
  );
  return res.data.employee;
};

// ── Employer-only ──────────────────────────────────────────────────────────

export const searchUsersToAdd = async (
  companyId: string,
  q: string
): Promise<UserSearchResult[]> => {
  const res = await axios.get(
    `${API_BASE_URL}/api/companies/${companyId}/employees/search-users`,
    { params: { q }, headers: authHeaders() }
  );
  return res.data.users;
};

export const addEmployee = async (
  companyId: string,
  data: {
    userId: string;
    designation?: string;
    department?: string;
    status?: string;
    joinedAt?: string;
  }
): Promise<CompanyMember> => {
  const res = await axios.post(
    `${API_BASE_URL}/api/companies/${companyId}/employees`,
    data,
    { headers: authHeaders() }
  );
  return res.data.employee;
};

export const updateEmployee = async (
  companyId: string,
  memberId: string,
  data: {
    designation?: string;
    department?: string;
    status?: string;
    joinedAt?: string;
  }
): Promise<CompanyMember> => {
  const res = await axios.put(
    `${API_BASE_URL}/api/companies/${companyId}/employees/${memberId}`,
    data,
    { headers: authHeaders() }
  );
  return res.data.employee;
};

export const removeEmployee = async (
  companyId: string,
  memberId: string
): Promise<void> => {
  await axios.delete(
    `${API_BASE_URL}/api/companies/${companyId}/employees/${memberId}`,
    { headers: authHeaders() }
  );
};