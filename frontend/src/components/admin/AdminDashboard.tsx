import { useState } from "react";
import {
  Users,
  Briefcase,
  Building,
  ArrowRight,
  Bell,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import {
  getAdminProfile,
  getAdminStats,
  getAllJobStatsByDate,
  getDailyLoggedInUsers,
} from "./adminApi/api";

interface Stat {
  id: number;
  title: string;
  value: string;
  icon: React.ReactNode;
}

interface AdminStats {
  totalJobseekers: number;
  totalEmployers: number;
  totalJobs: number;
}

interface AdminProfile {
  name: string;
  profilePic?: string;
}

interface ChartDataPoint {
  label: string;
  value: number;
}

interface JobInsights {
  data: {
    views: {
      daily?: any[];
      weekly?: any[];
      monthly?: any[];
    };
    applications: {
      daily?: any[];
      weekly?: any[];
      monthly?: any[];
    };
  };
}

interface UserLoginInfo {
  name: string;
  email: string;
  lastLogin: string;
  role: string;
}

interface DailyLoginsResponse {
  success: boolean;
  count: number;
  users: UserLoginInfo[];
}

type TimeFrame = "Day" | "Week" | "Month";

const backendKeyMap = {
  Day: "daily",
  Week: "weekly",
  Month: "monthly",
};

const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || "";

const AdminDashboard = () => {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("Day");

  const getLabel = (entry: any, frame: TimeFrame) => {
    if (frame === "Day") return `${entry._id.day}/${entry._id.month}/${entry._id.year}`;
    if (frame === "Week") return `W${entry._id.week} ${entry._id.year}`;
    if (frame === "Month") return `${entry._id.month}/${entry._id.year}`;
    return "";
  };

  const formatChartData = (
    rawData: any,
    frame: TimeFrame,
    key: "totalViews" | "totalApplications"
  ): ChartDataPoint[] => {
    const dataKey = backendKeyMap[frame];
    if (!rawData || !rawData[dataKey]) return [];
    let data = rawData[dataKey].map((entry: any) => ({
      label: getLabel(entry, frame),
      value: entry[key],
    }));
    return frame === "Day" ? data.slice(0, 10).reverse() : data;
  };

  const { data: profile } = useQuery<AdminProfile>({
    queryKey: ["adminProfile"],
    queryFn: getAdminProfile,
  });

  const { data: statsData } = useQuery<AdminStats>({
    queryKey: ["adminStats"],
    queryFn: getAdminStats,
  });

  const { data: insights } = useQuery<JobInsights>({
    queryKey: ["jobInsights", timeFrame],
    queryFn: getAllJobStatsByDate,
  });

  const { data: dailyLogins } = useQuery<DailyLoginsResponse>({
    queryKey: ["dailyLogins"],
    queryFn: getDailyLoggedInUsers,
  });

  const viewsData = insights
    ? formatChartData(insights.data.views, timeFrame, "totalViews")
    : [];

  const applicationsData = insights
    ? formatChartData(insights.data.applications, timeFrame, "totalApplications")
    : [];

  const stats: Stat[] = statsData
    ? [
      {
        id: 1,
        title: "Total Jobseekers",
        value: statsData.totalJobseekers.toString(),
        icon: <Users className="text-green-500" size={24} />,
      },
      {
        id: 2,
        title: "Total Employer",
        value: statsData.totalEmployers.toString(),
        icon: <Building className="text-yellow-500" size={24} />,
      },
      {
        id: 3,
        title: "Active Jobs",
        value: statsData.totalJobs.toString(),
        icon: <Briefcase className="text-blue-500" size={24} />,
      },
    ]
    : [];

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <button className="p-2 relative">
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                2
              </span>
              <Bell size={20} />
            </button>
          </div>
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
            {profile?.profilePic ? (
              <img
                src={`${MEDIA_URL.replace(/\/$/, "")}/${profile.profilePic.replace(/^\//, "")}`}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-lg font-bold text-gray-600">
                {profile?.name?.charAt(0).toUpperCase() || "A"}
              </span>
            )}
          </div>
          <span>{profile?.name || "Admin"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map(stat => (
          <div key={stat.id} className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-gray-600">{stat.title}</div>
              </div>
              {stat.icon}
              <ArrowRight className="text-gray-400" size={20} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Views and Applications</h2>
          <div className="flex space-x-2">
            {(["Day", "Week", "Month"] as TimeFrame[]).map(tf => (
              <button
                key={tf}
                className={`px-3 py-1 text-sm rounded ${timeFrame === tf ? "bg-blue-600 text-white" : "bg-gray-100"
                  }`}
                onClick={() => setTimeFrame(tf)}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-1/2">
            <h3 className="text-md font-semibold mb-2">Views</h3>
            <LineChart width={400} height={250} data={viewsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(value: any) => `${value} views`} />
              <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </div>
          <div className="w-full lg:w-1/2">
            <h3 className="text-md font-semibold mb-2">Applications</h3>
            <BarChart width={400} height={250} data={applicationsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(value: any) => `${value} applications`} />
              <Bar dataKey="value" fill="#82ca9d" />
            </BarChart>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <h2 className="text-lg font-semibold mb-4">Today's Logged-In Users ({dailyLogins?.count || 0})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="pb-2">Name</th>
                <th className="pb-2">Email</th>
                <th className="pb-2">Role</th>
                <th className="pb-2">Last Login</th>
              </tr>
            </thead>
            <tbody>
              {dailyLogins?.users && dailyLogins.users.length > 0 ? (
                dailyLogins.users.map((user, index) => (
                  <tr key={index} className="border-b last:border-0">
                    <td className="py-2">{user.name}</td>
                    <td className="py-2">{user.email}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'employer' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-2 text-sm text-gray-500">
                      {new Date(user.lastLogin).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-gray-500">No logins recorded today.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
