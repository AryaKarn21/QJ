import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import AdminShell from './components/layout/AdminShell';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import VerifyOtp from './components/auth/verifyOtp';
import ForgotResetPassword from './components/auth/forget-password';
import JobseekerSignup from './components/auth/jobseekerSignup';
import EmployerSignup from './components/auth/employerSignup';
import Profile from './components/employer/dashboard/Profile';
import Dashboard from './components/employer/dashboard/Dashboard';
import Insight from './components/employer/dashboard/Insight';
import JobList from './components/employer/dashboard/JobList';
import Applicants from './components/employer/dashboard/Applicants';
import JobApplicants from './components/employer/dashboard/JobApplicants';
import PostJob from './components/employer/jobs/postjobs';
import { HomePageJobSeeker } from './components/jobseeker/home/Home';
import AllJobListing from './components/jobseeker/jobListing/jobListing';
import JobDetailPage from './components/jobseeker/jobListing/jobdetail';
import UserDashboardLayout from './components/jobseeker/user/DashboardLayout';
import UserProfile from './components/jobseeker/user/profile';
import UserDashboard from './components/jobseeker/user/dashboard';
import UserSavedJobs from './components/jobseeker/user/savedJobs';
import UserMyApplications from './components/jobseeker/user/myApplications';
import UserSettings from './components/jobseeker/user/settings';
import UserSupportTickets from './components/jobseeker/user/supportTickets';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminDashboardV2 from "./components/admin/AdminDashboardV2";
import AiCenterDashboard from "./components/admin/ai-center/AiCenterDashboard";
import AnalyticsHub from "./components/admin/analytics/AnalyticsHub";
import ApplicationManagement from "./components/admin/applications/ApplicationManagement";
import CmsHub from "./components/admin/cms/CmsHub";
import AdminNotificationCenter from "./components/admin/AdminNotificationCenter";
import AdvertisementManagement from "./components/admin/AdvertisementManagement";
import AdminSubscriptions from "./components/admin/AdminSubscriptions";
import AdminSubscriptionDetail from "./components/admin/AdminSubscriptionDetail";
import UserManagement from './components/admin/UserManagement';
import CompanyManagement from './components/admin/companies/CompanyManagement';
import TicketManagement from './components/admin/support/TicketManagement';
import EmployerApplicants from './components/admin/EmployerApplicants';
import AdminSettings from './components/admin/Settings';
import DashboardLayout from './components/employer/dashboard/DashboardLayout';
import ApplyPage from './components/jobseeker/apply';
import UsersProfile from './components/admin/UsersProfile';
import JobManagement from './components/admin/jobs/JobManagement';
import EmployerSettings from './components/employer/dashboard/Settings';
import RevenueManagement from './components/admin/RevenueManagement';
import RolesPermissions from './components/admin/RolesPermissions';
import JobCategoryManagement from './components/admin/JobCategoryManagement';
import PlanManagement from './components/admin/PlanManagement';
import SubscriptionPage from './components/common/SubscriptionPage';
import SubscriptionCallback from './components/common/SubscriptionCallback';
// Lazy-loaded: the resume builder's template registry alone is 1500+
// components (see templates/registry.ts's generator), so keeping these 4
// routes out of the main app bundle avoids shipping that weight to every
// visitor who never opens the resume builder. React Router's lazy route
// elements just need a Suspense ancestor, added around <Routes> below.
const TemplateGallery = lazy(() => import('./components/resumeBuilder/TemplateGallery'));
const ResumeEditor = lazy(() => import('./components/resumeBuilder/ResumeEditor'));
const AiResumeBuilder = lazy(() => import('./components/resumeBuilder/AiResumeBuilder'));
const MyResumes = lazy(() => import('./components/resumeBuilder/MyResumes'));
import About from './components/jobseeker/user/about';
import Contact from './components/jobseeker/user/contact';
import PrivacyPolicy from './components/jobseeker/user/privacy';
import TermsOfService from './components/legal/TermsOfService';
import CommunityGuidelines from './components/legal/CommunityGuidelines';
import { CmsPageView } from './components/legal/CmsPageView';
import FaqPage from './components/content/FaqPage';
import CareerTips from './components/content/CareerTips';
import CareerTipDetail from './components/content/CareerTipDetail';
import { BlogList, BlogDetail, BlogCreate, BlogEdit } from './components/blog';
import OAuthCallback from './components/auth/OAuthCallback';
import { SocketProvider } from './context/SocketContext';
import { FollowProvider } from './context/FollowContext';
import { HomeFeed } from './components/community/HomeFeed';
import { CompanyFeed } from './components/community/CompanyFeed';
import { ProfileFeed } from './components/community/ProfileFeed';
import { FollowersPage } from './components/community/FollowersPage';
import { FollowingPage } from './components/community/FollowingPage';
import { MyConnectionsPage } from './components/community/MyConnectionsPage';
import { ConnectionRequestsPage } from './components/community/ConnectionRequestsPage';
import Candidates from './components/employer/dashboard/Candidates';
import SavedCandidates from './components/employer/dashboard/SavedCandidates';
import Interviews from './components/employer/dashboard/Interviews';
import EmployeeList from './components/employer/dashboard/EmployeeList'; // ✅ NEW
import { HashtagFeed } from './components/community/HashtagFeed';
import { PostDetailPage } from './components/community/PostDetailPage';
import { MessagesPage } from './components/messaging/MessagesPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Unauthorized from './components/auth/Unauthorized';
import AuditLogs from './components/admin/audit/AuditLogs';
import Security from './components/admin/security/Security';
import Chatbot from './components/common/Chatbot';

function AppWrapper() {
  const location = useLocation();

  const hideHeaderFooter = [
    '/user',
    '/user/profile',
    '/user/dashboard',
    '/user/savedjobs',
    '/user/settings',
    '/employer',
    '/employer/profile',
    '/employer/dashboard',
    '/employer/insight',
    '/employer/joblist',
    '/employer/applicants',
    '/admin',
    '/admin/dashboard',
    '/admin/users',
    '/admin/employer/applicants',
    '/admin/settings',
  ];

  const shouldHideHeaderFooter = hideHeaderFooter.some((path) =>
    location.pathname.startsWith(path)
  );

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {!shouldHideHeaderFooter && <Header />}

      <div className="flex-1">
        <Suspense
          fallback={
            <div className="flex min-h-[60vh] items-center justify-center text-slate-400">Loading…</div>
          }
        >
        <Routes>
          {/* auth routes */}
          <Route path="/signup" element={<Signup />} />
          <Route path="/signup/verify-otp" element={<VerifyOtp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotResetPassword />} />
          <Route path="/signup/jobseeker" element={<JobseekerSignup />} />
          <Route path="/signup/employer" element={<EmployerSignup />} />

          {/* home routes */}
          <Route path="/" element={<HomePageJobSeeker />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/community-guidelines" element={<CommunityGuidelines />} />
          <Route path="/p/:slug" element={<CmsPageView />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/career-tips" element={<CareerTips />} />
          <Route path="/career-tips/:id" element={<CareerTipDetail />} />

          {/* resume builder */}
          <Route path="/resume" element={<TemplateGallery />} />
          <Route path="/resume/history" element={<MyResumes />} />
          <Route path="/resume/:id/edit" element={<ResumeEditor />} />
          <Route path="/resume/ai-builder" element={<AiResumeBuilder />} />  
          {/* blog routes */}
          <Route path="/blog" element={<BlogList />} />
          <Route
            path="/blog/create"
            element={
              <ProtectedRoute>
                <BlogCreate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/blog/edit/:id"
            element={
              <ProtectedRoute>
                <BlogEdit />
              </ProtectedRoute>
            }
          />
          <Route path="/blog/:id" element={<BlogDetail />} />

          {/* OAuth Callback */}
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Subscription payment gateway return URL (eSewa/Khalti) */}
          <Route
            path="/subscription/callback"
            element={
              <ProtectedRoute>
                <SubscriptionCallback />
              </ProtectedRoute>
            }
          />

          {/* Community Feed */}
          <Route path="/community" element={<HomeFeed />} />
          <Route path="/community/company/:companyId" element={<CompanyFeed />} />
          <Route path="/community/profile/:userId" element={<ProfileFeed />} />
          <Route path="/community/profile/:userId/followers" element={<FollowersPage />} />
          <Route path="/community/profile/:userId/following" element={<FollowingPage />} />
          <Route
            path="/community/connections"
            element={
              <ProtectedRoute>
                <MyConnectionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community/connections/requests"
            element={
              <ProtectedRoute>
                <ConnectionRequestsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/community/hashtag/:tag" element={<HashtagFeed />} />
          <Route path="/community/post/:postId" element={<PostDetailPage />} />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages/:conversationId"
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            }
          />

          {/* jobseeker routes */}
          <Route path="/jobs" element={<AllJobListing />} />
          <Route path="/jobs/:id" element={<JobDetailPage />} />
          <Route path="/jobs/:jobId/apply" element={<ApplyPage />} />

          {/* jobseeker dashboard */}
          <Route
            path="/user"
            element={
              <ProtectedRoute allowedRoles={['jobseeker']}>
                <UserDashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="profile" element={<UserProfile />} />
            <Route path="dashboard" element={<UserDashboard />} />
            <Route path="applications" element={<UserMyApplications />} />
            <Route path="savedjobs" element={<UserSavedJobs />} />
            <Route path="settings" element={<UserSettings />} />
            <Route path="support" element={<UserSupportTickets />} />
            <Route path="subscription" element={<SubscriptionPage />} />
          </Route>

          {/* employer dashboard */}
          <Route
            path="/employer"
            element={
              <ProtectedRoute allowedRoles={['employer']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="profile" element={<Profile />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="insight" element={<Insight />} />
            <Route path="joblist" element={<JobList />} />
            <Route path="applicants" element={<Applicants />} />
            <Route path="settings" element={<EmployerSettings />} />
            <Route path="jobs/:jobId/applicants" element={<JobApplicants />} />
            <Route path="postjob/:jobId?" element={<PostJob />} />
            <Route path="candidates" element={<Candidates />} />
            <Route path="interviews" element={<Interviews />} />
            <Route path="saved" element={<SavedCandidates />} />
            <Route path="employees" element={<EmployeeList />} /> {/* ✅ NEW */}
            <Route path="subscription" element={<SubscriptionPage />} />
          </Route>

          {/* admin dashboard */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                <AdminShell />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<AdminDashboardV2 />} />
            <Route path="dashboard-old" element={<AdminDashboard />} />
            <Route path="ai-center" element={<AiCenterDashboard />} />
            <Route path="analytics" element={<AnalyticsHub />} />
            <Route path="applications" element={<ApplicationManagement />} />
            <Route path="cms" element={<CmsHub />} />
            <Route path="notifications" element={<AdminNotificationCenter />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="userprofile/:id" element={<UsersProfile />} />
            <Route path="employers" element={<CompanyManagement />} />
            <Route path="support" element={<TicketManagement />} />
            <Route path="jobs" element={<JobManagement />} />
            <Route path="revenue" element={<RevenueManagement />} />
            <Route path="plans" element={<PlanManagement />} />
            <Route path="advertisements" element={<AdvertisementManagement />} />
            <Route path="subscriptions" element={<AdminSubscriptions />} />
            <Route path="subscriptions/:id" element={<AdminSubscriptionDetail />} />
            <Route
              path="roles-permissions"
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <RolesPermissions />
                </ProtectedRoute>
              }
            />
            <Route path="jobcategories" element={<JobCategoryManagement />} />
            <Route
              path="audit-logs"
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <AuditLogs />
                </ProtectedRoute>
              }
            />
            <Route path="employer/:employerId/applicants" element={<EmployerApplicants />} />
            <Route
              path="security"
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <Security />
                </ProtectedRoute>
              }
            />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Routes>
        </Suspense>
      </div>

      {!shouldHideHeaderFooter && <Footer />}
      <Chatbot />
    </div>
  );
}

function App() {
  return (
    <Router>
      <SocketProvider>
        <FollowProvider>
          <AppWrapper />
        </FollowProvider>
      </SocketProvider>
    </Router>
  );
}

export default App;