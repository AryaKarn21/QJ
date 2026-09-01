import React, { useEffect, useState, useRef } from "react";
import { fetchJobStats, fetchConversionRates, fetchJobPostComparison } from "../insightsApi/api";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
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

  useEffect(() => {
    const fetchData = async () => {
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
    };
    fetchData();
  }, []);

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

  const COLORS = ["#2563eb", "#4ade80", "#f87171", "#fbbf24"];

  // Filter and sort conversion rates to get the top 4
  const top4ConversionRates = conversionRates
    .filter((item) => item.value > 0) // Keep only items with a value (conversion rate) greater than 0
    .sort((a, b) => b.value - a.value) // Sort in descending order by value
    .slice(0, 4); // Take the top 4

  // --- DEBUGGING: Log derived data to console ---
  console.log("Top 4 Conversion Rates for Pie Chart (processed):", top4ConversionRates);
  console.log("Job Comparison for Table (state):", jobComparison);
  // --- END DEBUGGING ---

  return (
    <div className="min-h-screen bg-gray-50 p-6 overflow-auto" style={{ maxHeight: "calc(100vh - 50px)" }}>
      <div className="max-w-7xl mx-auto" ref={dashboardRef}>
        <div className="flex justify-end items-center mb-6">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
            Download PDF
          </button>
        </div>

        {/* Charts Section */}
        <div className="flex gap-6 mb-8 flex-wrap lg:flex-nowrap">
          {/* Bar Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm w-full lg:w-[70%]">
            <h3 className="text-lg font-semibold mb-4">All Jobs by an Employer</h3>
            {jobStats.length === 0 ? (
              <p className="text-gray-400 text-center mt-10">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={jobStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="title" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="views" fill="#2563eb" name="Views" barSize={25} />
                  <Bar dataKey="applications" fill="#4ade80" name="Applications" barSize={25} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Doughnut Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm w-full lg:w-[30%] flex flex-col items-center justify-center">
            <h3 className="text-lg font-semibold mb-4">Conversion Rates (Top 4)</h3> {/* Updated title */}
            {top4ConversionRates.length === 0 ? (
              <p className="text-gray-400 mt-10">No data available </p>
            ) : (
              <PieChart width={250} height={250}>
                <Pie
                  data={top4ConversionRates} // Use top4ConversionRates here
                  cx="50%"
                  cy="50%"
                  innerRadius={40} // Doughnut effect
                  outerRadius={80}
                  labelLine={false}
                  label={renderCustomizedLabel}
                  dataKey="value"
                >
                    {top4ConversionRates.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
              </PieChart>
            )}
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-lg shadow-sm mb-8" ref={jobComparisonTableRef}> {/* Added ref here */}
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Job Post Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="text-left">
                    <th className="pb-4 font-semibold text-gray-700">Job Title</th>
                    <th className="pb-4 font-semibold text-gray-700">Views</th>
                    <th className="pb-4 font-semibold text-gray-700">Applications</th>
                    <th className="pb-4 font-semibold text-gray-700">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {jobComparison.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-gray-400 py-6">
                        No job posts found
                      </td>
                    </tr>
                  ) : (
                    jobComparison.map((job, index) => (
                      <tr key={index} className="border-t border-gray-200">
                        <td className="py-3 text-gray-600">{job.title}</td>
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
