import React, { useEffect, useRef, useState } from "react";
import { Building2, Link2 } from "lucide-react";
import { searchCompanies, type CompanySearchResult } from "../../../api/companySearchApi";

interface CompanySearchInputProps {
  value: string;
  companyId: string | null;
  onChange: (value: { institution: string; companyId: string | null }) => void;
  placeholder?: string;
}

const CompanySearchInput: React.FC<CompanySearchInputProps> = ({
  value,
  companyId,
  onChange,
  placeholder = "Company name",
}) => {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<CompanySearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => setQuery(value), [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (text: string) => {
    setQuery(text);
    onChange({ institution: text, companyId: null });

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const companies = await searchCompanies(text.trim());
        setResults(companies);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handlePick = (company: CompanySearchResult) => {
    setQuery(company.name);
    onChange({ institution: company.name, companyId: company._id });
    setOpen(false);
  };

  const handleClearLink = () => {
    onChange({ institution: query, companyId: null });
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          className="w-full px-3 py-2 pr-9 border rounded"
        />
        {companyId ? (
          <button
            type="button"
            onClick={handleClearLink}
            title="Linked to a company page — click to unlink and edit as text"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-600"
          >
            <Link2 size={15} />
          </button>
        ) : (
          <Building2 size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
        )}
      </div>

      {/* ✅ FIX: was missing the opening <a tag */}
      {companyId && (
        <a
          href={`/community/company/${companyId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          View company page <Link2 size={11} />
        </a>
      )}

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-56 overflow-y-auto">
          {loading && <div className="px-3 py-2 text-xs text-slate-400">Searching…</div>}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-xs text-slate-400">
              No matching company found — you can keep typing to save as text.
            </div>
          )}
          {!loading &&
            results.map((c) => (
              <button
                key={c._id}
                type="button"
                onClick={() => handlePick(c)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                {c.companyLogo ? (
                  <img src={c.companyLogo} alt="" className="h-6 w-6 rounded object-cover" />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-slate-400">
                    <Building2 size={13} />
                  </div>
                )}
                <div>
                  <div className="font-medium text-slate-700">{c.name}</div>
                  {c.industryType && <div className="text-xs text-slate-400">{c.industryType}</div>}
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
};

export default CompanySearchInput;