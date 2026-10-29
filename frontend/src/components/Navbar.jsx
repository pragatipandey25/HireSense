import { useState, useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useContext(AuthContext);
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentUser = user || JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navLinks = {
    candidate: [
      { to: "/candidate-dashboard", label: "Dashboard" },
      { to: "/candidate/resume", label: "My Resume" },
      { to: "/candidate/jobs", label: "Browse Jobs" },
      { to: "/candidate/applications", label: "My Applications" },
    ],
    employer: [
      { to: "/employer-dashboard", label: "Dashboard" },
      { to: "/employer/jobs", label: "My Jobs" },
      { to: "/employer/jobs/create", label: "+ Post Job" },
    ],
    admin: [
      { to: "/admin-dashboard", label: "Dashboard" },
      { to: "/admin/users", label: "Users" },
      { to: "/admin/jobs", label: "Jobs" },
      { to: "/admin/applications", label: "Applications" },
    ],
  };

  const links = navLinks[currentUser.role] || [];

  const homeRoute =
    currentUser.role === "candidate"
      ? "/candidate-dashboard"
      : currentUser.role === "employer"
      ? "/employer-dashboard"
      : currentUser.role === "admin"
      ? "/admin-dashboard"
      : "/";

  return (
    <nav className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link to={homeRoute} className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center text-white font-extrabold text-sm shadow-sm group-hover:scale-105 transition-transform">
                HS
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-white text-base tracking-tight leading-tight flex items-center gap-1.5">
                  HireSense <span className="text-cyan-400 text-xs px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-500/30 font-semibold">AI</span>
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:block tracking-wider uppercase font-medium">
                  Recruitment Intelligence
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "text-cyan-400 bg-slate-800 font-semibold shadow-inner"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* User Menu & Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs">
              <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
                {currentUser.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="flex flex-col text-left">
                <span className="font-semibold text-slate-200 max-w-[120px] truncate leading-tight">
                  {currentUser.name || "User"}
                </span>
                <span className="text-[10px] text-cyan-400 capitalize font-medium">
                  {currentUser.role || "Account"}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-red-400 hover:bg-slate-800/80 border border-slate-700/60 rounded-lg transition-all"
            >
              Sign Out
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-slate-300 hover:bg-slate-800"
              aria-label="Toggle navigation menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 py-3 space-y-1">
          {links.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`block px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "text-cyan-400 bg-slate-800 font-semibold"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
