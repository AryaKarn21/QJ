import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Users2, Search, X, Briefcase, Building2,
  Calendar, CheckCircle, XCircle, Loader2, ChevronDown,
  Mail, Globe, Linkedin, Twitter, Github, ArrowUpRight,
} from "lucide-react";
import {
  getEmployees, getEmployeeCount,
  type CompanyMember,
} from "../../api/companyMemberApi";

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || "";

const avatarUrl = (pic?: string) => {
  if (!pic) return null;
  return pic.startsWith("http")
    ? pic
    : `${MEDIA_URL.replace(/\/$/, "")}/${pic.replace(/^\//, "")}`;
};

const AvatarCircle = ({ pic, name, size = 10 }: { pic?: string; name?: string; size?: number }) => {
  const url = avatarUrl(pic);
  const sz = `w-${size} h-${size}`;
  return (
    <div className={`${sz} rounded-full overflow-hidden shrink-0`}>
      {url ? (
        <img src={url} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-400 to-amber-500 text-white font-bold">
          {name?.charAt(0).toUpperCase() || "?"}
        </div>
      )}
    </div>
  );
};

// ── Employee Detail Modal ─────────────────────────────────────────────────────
const EmployeeDetailModal = ({ member, onClose }: { member: CompanyMember; onClose: () => void }) => {
  const u = member.user;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-400 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 bg-white/20 hover:bg-white/40 rounded-lg text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-6">
          <div className="-mt-10 mb-4">
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-md">
              {avatarUrl(u?.profilePic) ? (
                <img src={avatarUrl(u.profilePic)!} alt={u?.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-400 to-amber-500 text-white font-bold text-xl">
                  {u?.name?.charAt(0).toUpperCase() || "?"}
                </div>
              )}
            </div>
          </div>

          {u?._id ? (
            <Link to={`/community/profile/${u._id}`} className="text-lg font-bold text-slate-900 hover:text-[#F97316] hover:underline">
              {u.name || "Unknown"}
            </Link>
          ) : (
            <h2 className="text-lg font-bold text-slate-900">{u?.name || "Unknown"}</h2>
          )}
          {u?.headline && <p className="text-sm text-slate-500 mt-0.5">{u.headline}</p>}

          <div className="mt-4 space-y-2.5">
            {member.designation && (
              <div className="flex items-center gap-2.5 text-sm text-slate-700">
                <Briefcase className="w-4 h-4 text-[#F97316] shrink-0" />
                <span>{member.designation}</span>
              </div>
            )}
            {member.department && (
              <div className="flex items-center gap-2.5 text-sm text-slate-700">
                <Building2 className="w-4 h-4 text-[#F97316] shrink-0" />
                <span>{member.department}</span>
              </div>
            )}
            {member.joinedAt && (
              <div className="flex items-center gap-2.5 text-sm text-slate-700">
                <Calendar className="w-4 h-4 text-[#F97316] shrink-0" />
                <span>
                  Joined {new Date(member.joinedAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2.5 text-sm">
              {member.status === "Active"
                ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                : <XCircle className="w-4 h-4 text-slate-400 shrink-0" />}
              <span className={member.status === "Active" ? "text-emerald-700" : "text-slate-500"}>
                {member.status}
              </span>
            </div>
          </div>

          {u?.bio && (
            <p className="mt-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
              {u.bio}
            </p>
          )}

          <div className="flex gap-3 mt-4">
            {u?._id && (
              <Link
                to={`/community/profile/${u._id}`}
                className="p-2 rounded-lg bg-slate-50 hover:bg-orange-50 text-slate-400 hover:text-[#F97316] transition-colors border border-slate-100"
                title="View full profile"
              >
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            )}
            {u?.email && (
              <a href={`mailto:${u.email}`} title="Email" className="p-2 rounded-lg bg-slate-50 hover:bg-orange-50 text-slate-400 hover:text-[#F97316] transition-colors border border-slate-100">
                <Mail className="w-4 h-4" />
              </a>
            )}
            {u?.socialLinks?.linkedin && (
              <a href={u.socialLinks.linkedin} target="_blank" rel="noreferrer" title="LinkedIn" className="p-2 rounded-lg bg-slate-50 hover:bg-orange-50 text-slate-400 hover:text-[#F97316] transition-colors border border-slate-100">
                <Linkedin className="w-4 h-4" />
              </a>
            )}
            {u?.socialLinks?.twitter && (
              <a href={u.socialLinks.twitter} target="_blank" rel="noreferrer" title="Twitter" className="p-2 rounded-lg bg-slate-50 hover:bg-orange-50 text-slate-400 hover:text-[#F97316] transition-colors border border-slate-100">
                <Twitter className="w-4 h-4" />
              </a>
            )}
            {u?.socialLinks?.github && (
              <a href={u.socialLinks.github} target="_blank" rel="noreferrer" title="GitHub" className="p-2 rounded-lg bg-slate-50 hover:bg-orange-50 text-slate-400 hover:text-[#F97316] transition-colors border border-slate-100">
                <Github className="w-4 h-4" />
              </a>
            )}
            {u?.socialLinks?.website && (
              <a href={u.socialLinks.website} target="_blank" rel="noreferrer" title="Website" className="p-2 rounded-lg bg-slate-50 hover:bg-orange-50 text-slate-400 hover:text-[#F97316] transition-colors border border-slate-100">
                <Globe className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main ─────────────────────────────────────────────────────────────────────
interface Props {
  companyId: string;
  companyName?: string;
}

export const EmployeeSection = ({ companyId, companyName }: Props) => {
  const [employees, setEmployees] = useState<CompanyMember[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Active");
  const [filterDept, setFilterDept] = useState("");
  const [selected, setSelected] = useState<CompanyMember | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [emps, cnt] = await Promise.all([
        getEmployees(companyId, { search, status: filterStatus, department: filterDept }),
        getEmployeeCount(companyId),
      ]);
      setEmployees(emps);
      setCount(cnt);
    } catch {
      // silently fail for public page
    } finally {
      setLoading(false);
    }
  }, [companyId, search, filterStatus, filterDept]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-dark flex items-center gap-2">
          <Users2 size={17} className="text-primary" />
          Employees at {companyName || "this company"}
        </h2>
        <span className="text-xs font-semibold text-gray-400">{count} active</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex-1 min-w-[160px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees..."
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>

        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="appearance-none pl-3 pr-7 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer"
          >
            <option value="">All</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        {departments.length > 0 && (
          <div className="relative">
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="appearance-none pl-3 pr-7 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer"
            >
              <option value="">All Depts</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : employees.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-400">No employees found.</div>
      ) : (
        <div className="space-y-3">
          {employees.map((m) => (
            <button
              key={m._id}
              onClick={() => setSelected(m)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-primary/30 hover:bg-secondary transition-all text-left cursor-pointer group"
            >
              <AvatarCircle pic={m.user?.profilePic} name={m.user?.name} size={10} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-dark text-sm truncate group-hover:text-primary transition-colors">
                  {m.user?.name || "Unknown"}
                </p>
                {m.designation && <p className="text-xs text-gray-500 truncate">{m.designation}</p>}
                {m.department && <p className="text-xs text-gray-400 truncate">{m.department}</p>}
              </div>
              <div className="shrink-0 text-right space-y-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  m.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                }`}>
                  {m.status === "Active"
                    ? <CheckCircle className="w-2.5 h-2.5" />
                    : <XCircle className="w-2.5 h-2.5" />}
                  {m.status}
                </span>
                {m.joinedAt && (
                  <p className="text-[10px] text-gray-300">
                    {new Date(m.joinedAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && <EmployeeDetailModal member={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};