import React, { useCallback, useEffect, useState, useRef } from "react";
import { fetchJobStats, fetchConversionRates, fetchJobPostComparison } from "../insightsApi/api";
import { useAutoRefresh } from "../../../hooks/useAutoRefresh";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import {
  Briefcase,
  Eye,
  FileText,
  TrendingUp,
  BarChart3,
  PieChartIcon,
  Table2,
  Inbox,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// Validated categorical palette (see dataviz skill / references/palette.md) —
// fixed hue order, each slot cleared for CVD/contrast as a set. Only the
// first two slots are used on the bar chart (Views/Applications — well
// within the "first three slots clear all-pairs" safe zone); the donut
// below uses the first four, which the palette's own doc flags as the one
// combination needing a secondary channel — already covered here by the
// existing direct percentage labels + legend.
const SERIES_BLUE = "#2a78d6";
const SERIES_ORANGE = "#eb6834";
const SERIES_AQUA = "#1baf7a";
const SERIES_YELLOW = "#eda100";
const DONUT_COLORS = [SERIES_BLUE, SERIES_ORANGE, SERIES_AQUA, SERIES_YELLOW];

const compactNumber = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : n.toLocaleString();

const StatTile: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
    <div className="flex items-start justify-between">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
    </div>
    <p className="mt-3 text-2xl font-bold tracking-tight text-dark">{value}</p>
  </div>
);

const ChartEmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-16 text-gray-400">
    <Inbox size={28} />
    <p className="text-sm">{message}</p>
  </div>
);

// Pie label render
const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={12}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const Insight: React.FC = () => {
  const [jobStats, setJobStats] = useState<{ title: string; views: number; applications: number }[]>([]);
  const [conversionRates, setConversionRates] = useState<{ name: string; value: number }[]>([]);
  const [jobComparison, setJobComparison] = useState<
    { title: string; views: number; applications: number; conversionRate: string }[]
  >([]);
  const dashboardRef = useRef<HTMLDivElement>(null);
  // New ref for the job comparison table section
  const jobComparisonTableRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const [jobStatsRes, conversionRes, comparisonRes] = await Promise.all([
        fetchJobStats(),
        fetchConversionRates(),
        fetchJobPostComparison(),
      ]);

      setJobStats(jobStatsRes?.data || []);
      setConversionRates(conversionRes || []);
      setJobComparison(comparisonRes || []);

    } catch (error) {
      console.error("Failed to load insights:", error);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useAutoRefresh(fetchData, 30000);

  const handleDownloadPDF = async () => {
    // Target only the jobComparisonTableRef for PDF download
    if (!jobComparisonTableRef.current) return;
    const canvas = await html2canvas(jobComparisonTableRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("job-comparison-report.pdf");
  };

  // Filter and sort conversion rates to get the top 4
  const top4ConversionRates = conversionRates
    .filter((item) => item.value > 0) // Keep only items with a value (conversion rate) greater than 0
    .sort((a, b) => b.value - a.value) // Sort in descending order by value
    .slice(0, 4); // Take the top 4

  const totalViews = jobStats.reduce((sum, j) => sum + j.views, 0);
  const totalApplications = jobStats.reduce((sum, j) => sum + j.applications, 0);
  const avgConversion = totalViews > 0 ? `${((totalApplications / totalViews) * 100).toFixed(1)}%` : "—";

  return (
    <div className="min-h-screen bg-gray-50 p-6 overflow-auto" style={{ maxHeight: "calc(100dvh - 50px)" }}>
      <div className="max-w-7xl mx-auto" ref={dashboardRef}>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-dark">Reports &amp; Analytics</h1>
            <p className="mt-1 text-sm text-gray-500">Performance across every job you've posted.</p>
          </div>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg shadow-card hover:bg-primary/90 transition-colors"
          >
            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
            Download PDF
          </button>
        </div>

        {/* KPI summary */}
        <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
          <StatTile label="Job posts" value={compactNumber(jobStats.length)} icon={<Briefcase size={17} />} />
          <StatTile label="Total views" value={compactNumber(totalViews)} icon={<Eye size={17} />} />
          <StatTile label="Applications" value={compactNumber(totalApplications)} icon={<FileText size={17} />} />
          <StatTile label="Avg. conversion" value={avgConversion} icon={<TrendingUp size={17} />} />
        </div>

        {/* Charts Section */}
        <div className="flex gap-6 mb-6 flex-wrap lg:flex-nowrap">
          {/* Bar Chart */}
          <div className="bg-white p-6 rounded-2xl border border-orange-100 shadow-sm transition-all duration-200 hover:shadow-md w-full lg:w-[70%]">
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-700 mb-4">
              <BarChart3 size={17} className="text-primary" /> All Jobs by an Employer
            </h3>
            {jobStats.length === 0 ? (
              <ChartEmptyState message="No job activity yet — post a job to see views and applications here." />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={jobStats} barGap={2} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
                  <XAxis dataKey="title" tick={{ fill: "#898781", fontSize: 12 }} axisLine={{ stroke: "#c3c2b7" }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: "#898781", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Bar dataKey="views" fill={SERIES_BLUE} name="Views" maxBarSize={24} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="applications" fill={SERIES_ORANGE} name="Applications" maxBarSize={24} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Doughnut Chart */}
          <div className="bg-white p-6 rounded-2xl border border-orange-100 shadow-sm transition-all duration-200 hover:shadow-md w-full lg:w-[30%] flex flex-col items-center justify-center">
            <h3 className="flex items-center gap-2 self-start text-base font-semibold text-slate-700 mb-4">
              <PieChartIcon size={17} className="text-primary" /> Conversion Rates (Top 4)
            </h3>
            {top4ConversionRates.length === 0 ? (
              <ChartEmptyState message="No conversion data yet." />
            ) : (
              // Fixed 250px width used to overflow narrow phone viewports
              // (this card is full-width below lg) — ResponsiveContainer
              // scales it to the card instead, same as the bar chart above.
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={top4ConversionRates} // Use top4ConversionRates here
                    cx="50%"
                    cy="50%"
                    innerRadius={40} // Doughnut effect
                    outerRadius={80}
                    paddingAngle={2}
                    labelLine={false}
                    label={renderCustomizedLabel}
                    dataKey="value"
                  >
                      {top4ConversionRates.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} stroke="#fff" strokeWidth={2} />
                      ))}
                  </Pie>
                  <Tooltip />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl border border-orange-100 shadow-sm transition-all duration-200 hover:shadow-md mb-8" ref={jobComparisonTableRef}> {/* Added ref here */}
          <div className="p-6">
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-700 mb-4">
              <Table2 size={17} className="text-primary" /> Job Post Comparison
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="text-left border-b border-gray-200">
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Job Title</th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Views</th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Applications</th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {jobComparison.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10">
                        <ChartEmptyState message="No job posts found yet." />
                      </td>
                    </tr>
                  ) : (
                    jobComparison.map((job, index) => (
                      <tr key={index} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 font-medium text-dark">{job.title}</td>
                        <td className="py-3 text-gray-600">{job.views}</td>
                        <td className="py-3 text-gray-600">{job.applications}</td>
                        <td className="py-3 text-gray-600">{job.conversionRate}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Insight;
