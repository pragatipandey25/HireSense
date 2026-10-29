import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import ProtectedRoute from "../components/ProtectedRoute";

// Route-level lazy loading for optimal bundle splitting
const Login = React.lazy(() => import("../pages/Login"));
const Register = React.lazy(() => import("../pages/Register"));

// Candidate Pages
const CandidateDashboard = React.lazy(() => import("../pages/CandidateDashboard"));
const ResumeUpload = React.lazy(() => import("../pages/ResumeUpload"));
const BrowseJobs = React.lazy(() => import("../pages/BrowseJobs"));
const MyApplications = React.lazy(() => import("../pages/MyApplications"));

// Employer Pages
const EmployerDashboard = React.lazy(() => import("../pages/EmployerDashboard"));
const CreateJob = React.lazy(() => import("../pages/CreateJob"));
const EditJob = React.lazy(() => import("../pages/EditJob"));
const ViewJobs = React.lazy(() => import("../pages/ViewJobs"));
const JobDetail = React.lazy(() => import("../pages/JobDetail"));
const JobAnalysis = React.lazy(() => import("../pages/JobAnalysis"));
const AnalysisDetail = React.lazy(() => import("../pages/AnalysisDetail"));

// Admin Pages
const AdminDashboard = React.lazy(() => import("../pages/AdminDashboard"));

// Accessible fallback loader with HireSense branding
const PageFallback = () => (
  <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center text-white font-extrabold text-base mb-4 animate-pulse">
      HS
    </div>
    <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
      <div className="h-full bg-cyan-400 rounded-full animate-indeterminate"></div>
    </div>
    <p className="text-slate-400 text-xs mt-3 tracking-wider font-medium uppercase">
      Loading HireSense AI...
    </p>
  </div>
);

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Authentication */}
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Candidate Routes */}
          <Route
            path="/candidate-dashboard"
            element={
              <ProtectedRoute allowedRoles={["candidate"]}>
                <CandidateDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidate/resume"
            element={
              <ProtectedRoute allowedRoles={["candidate"]}>
                <ResumeUpload />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidate/jobs"
            element={
              <ProtectedRoute allowedRoles={["candidate"]}>
                <BrowseJobs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidate/applications"
            element={
              <ProtectedRoute allowedRoles={["candidate"]}>
                <MyApplications />
              </ProtectedRoute>
            }
          />

          {/* Employer Routes */}
          <Route
            path="/employer-dashboard"
            element={
              <ProtectedRoute allowedRoles={["employer"]}>
                <EmployerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/jobs"
            element={
              <ProtectedRoute allowedRoles={["employer"]}>
                <ViewJobs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/jobs/create"
            element={
              <ProtectedRoute allowedRoles={["employer"]}>
                <CreateJob />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/jobs/edit/:id"
            element={
              <ProtectedRoute allowedRoles={["employer"]}>
                <EditJob />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/jobs/:id"
            element={
              <ProtectedRoute allowedRoles={["employer"]}>
                <JobDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/jobs/:id/analyze"
            element={
              <ProtectedRoute allowedRoles={["employer"]}>
                <JobAnalysis />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/analysis/:id"
            element={
              <ProtectedRoute allowedRoles={["employer"]}>
                <AnalysisDetail />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/jobs"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/applications"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default AppRoutes;
