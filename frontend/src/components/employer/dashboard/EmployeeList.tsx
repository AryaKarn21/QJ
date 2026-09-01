import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Users2, Search, PlusCircle, Pencil, UserX,
  ChevronDown, X, Loader2, Building2,
  Calendar, Briefcase, CheckCircle, XCircle, ExternalLink,
} from "lucide-react";
import {
  getEmployees, addEmployee, updateEmployee, removeEmployee,
  searchUsersToAdd,
  type CompanyMember, type UserSearchResult,
} from "../../../api/companyMemberApi";
import { useCurrentUser } from "../../../utils/currentUser";

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || "";

const avatar = (pic?: string, name?: string) => {
  if (pic) {
    const src = pic.startsWith("http")
      ? pic
      : `${MEDIA_URL.replace(/\/$/, "")}/${pic.replace(/^\//, "")}`;
    return <img src={src} alt={name} className="w-full h-full object-cover" />;
  }
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-400 to-amber-500 text-white font-bold text-sm">
      {name?.charAt(0).toUpperCase() || "?"}
    </div>
  );
};

// ── Add/Edit Modal ────────────────────────────────────────────────────────────
interface ModalProps {
  companyId: string;
  editMember?: CompanyMember | null;
  onClose: () => void;
  onSaved: () => void;
}

const EmployeeModal = ({ companyId, editMember, onClose, onSaved }: ModalProps) => {
  const isEdit = !!editMember;
  const [searchQ, setSearchQ] = useState("");
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [designation, setDesignation] = useState(editMember?.designation || "");
  const [department, setDepartment] = useState(editMember?.department || "");
  const [status, setStatus] = useState<"Active" | "Inactive">(editMember?.status || "Active");
  const [joinedAt, setJoinedAt] = useState(
    editMember?.joinedAt ? editMember.joinedAt.slice(0, 10) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (q: string) => {
    setSearchQ(q);
    setSelectedUser(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.length < 2) { setUserResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await searchUsersToAdd(companyId, q);
        setUserResults(results);
      } catch {
        setUserResults([]);
      }
    }, 350);
  };

  const handleSubmit = async () => {
    setError("");
    if (!isEdit && !selectedUser) {
      setError("Please select a user to add.");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await updateEmployee(companyId, editMember!._id, {
          designation, department, status, joinedAt: joinedAt || undefined,
        });
      } else {
        await addEmployee(companyId, {
          userId: selectedUser!._id,
          designation, department, status,
          joinedAt: joinedAt || undefined,
        });
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users2 className="w-4 h-4 text-[#F97316]" />
            {isEdit ? "Edit Employee" : "Add Employee"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* User search — add mode only */}
          {!isEdit && (
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Search User <span className="text-rose-500">*</span>
              </label>
              {selectedUser ? (
                <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                    {avatar(selectedUser.profilePic, selectedUser.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">{selectedUser.name}</p>
                    <p className="text-xs text-slate-500 truncate">{selectedUser.email}</p>
                  </div>
                  <button
                    onClick={() => { setSelectedUser(null); setSearchQ(""); }}
                    className="cursor-pointer text-slate-400 hover:text-rose-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      value={searchQ}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Search by name or email..."
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    />
                  </div>
                  {userResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {userResults.map((u) => (
                        <button
                          key={u._id}
                          onClick={() => { setSelectedUser(u); setUserResults([]); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 text-left cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
                            {avatar(u.profilePic, u.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{u.name}</p>
                            <p className="text-xs text-slate-400 truncate">{u.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Designation</label>
            <input
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Software Engineer"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Department</label>
            <input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Engineering"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Joined Date</label>
            <input
              type="date"
              value={joinedAt}
              onChange={(e) => setJoinedAt(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
            <div className="relative">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "Active" | "Inactive")}
                className="w-full appearance-none px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 bg-white"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
        </div>

        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2.5 bg-[#F97316] hover:bg-orange-600 text-white rounded-xl text-sm font-semibold cursor-pointer transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? "Save Changes" : "Add Employee"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const EmployeeList = () => {
  const { userId } = useCurrentUser();
  const companyId = userId || "";

  const [employees, setEmployees] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editMember, setEditMember] = useState<CompanyMember | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchEmployees = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await getEmployees(companyId, {
        search, status: filterStatus, department: filterDept,
      });
      setEmployees(data);
    } catch {
      showToast("error", "Failed to load employees.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, search, filterStatus, filterDept]);

  const handleDeactivate = async (member: CompanyMember) => {
    if (!window.confirm(`Deactivate ${member.user?.name}?`)) return;
    try {
      await removeEmployee(companyId, member._id);
      showToast("success", "Employee deactivated.");
      fetchEmployees();
    } catch {
      showToast("error", "Failed to deactivate employee.");
    }
  };

  const activeCount = employees.filter((e) => e.status === "Active").length;
  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));

  return (
    <div className="bg-[#FFF8F3] min-h-[calc(100vh-50px)] p-4 sm:p-6 lg:p-8">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl text-white text-sm font-semibold shadow-lg transition-all ${toast.type === "success" ? "bg-emerald-500" : "bg-rose-500"}`}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <Users2 className="w-6 h-6 text-[#F97316]" />
              Employees
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {activeCount} active employee{activeCount !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => { setEditMember(null); setShowModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#F97316] hover:bg-orange-600 text-white font-semibold text-sm rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Add Employee
          </button>
        </div>

        {/* Search & Filters */}
        <div className="bg-white p-4 rounded-2xl border border-orange-100/80 shadow-xs flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, designation..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 cursor-pointer"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 cursor-pointer"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#F97316]" />
          </div>
        ) : employees.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-16 text-center">
            <Users2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No employees found.</p>
            <p className="text-slate-400 text-sm mt-1">Try adjusting filters or add a new employee.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-orange-100/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Designation</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Department</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Joined</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((m) => (
                    <tr key={m._id} className="hover:bg-orange-50/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
                            {avatar(m.user?.profilePic, m.user?.name)}
                          </div>
                          <div className="min-w-0">
                            {m.user?._id ? (
                              <Link
                                to={`/community/profile/${m.user._id}`}
                                title="View Community profile"
                                className="block truncate font-semibold text-slate-900 hover:text-[#F97316] hover:underline"
                              >
                                {m.user.name || "—"}
                              </Link>
                            ) : (
                              <p className="font-semibold text-slate-900 truncate">—</p>
                            )}
                            <p className="text-xs text-slate-400 truncate">{m.user?.email || ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{m.designation || "—"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{m.department || "—"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {m.joinedAt
                              ? new Date(m.joinedAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })
                              : "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          m.status === "Active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          {m.status === "Active"
                            ? <CheckCircle className="w-3 h-3" />
                            : <XCircle className="w-3 h-3" />}
                          {m.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          {m.user?._id && (
                            <Link
                              to={`/community/profile/${m.user._id}`}
                              title="View Community profile"
                              className="p-1.5 rounded-lg hover:bg-orange-100 text-slate-400 hover:text-[#F97316] transition-colors cursor-pointer"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          )}
                          <button
                            onClick={() => { setEditMember(m); setShowModal(true); }}
                            title="Edit"
                            className="p-1.5 rounded-lg hover:bg-orange-100 text-slate-400 hover:text-[#F97316] transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {m.status === "Active" && (
                            <button
                              onClick={() => handleDeactivate(m)}
                              title="Deactivate"
                              className="p-1.5 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <EmployeeModal
          companyId={companyId}
          editMember={editMember}
          onClose={() => { setShowModal(false); setEditMember(null); }}
          onSaved={() => {
            showToast("success", editMember ? "Employee updated." : "Employee added.");
            fetchEmployees();
          }}
        />
      )}
    </div>
  );
};

export default EmployeeList;