import { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../services/authService";
import { AuthContext } from "../context/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    try {
      setLoading(true);

      const response = await loginUser(formData);

      const token = response.token;
      const user = response.user || {
        _id: response._id,
        name: response.name,
        email: response.email,
        role: response.role,
      };

      if (!token || !user) {
        throw new Error("Invalid response received from server.");
      }

      const userData = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      };

      // Save token and user
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userData));

      // Update global auth context
      login(userData);

      // Redirect to role-specific dashboard after successful login
      const dashboardRoutes = {
        candidate: "/candidate-dashboard",
        employer: "/employer-dashboard",
        admin: "/admin-dashboard",
      };
      navigate(dashboardRoutes[userData.role] || "/candidate-dashboard");
    } catch (error) {
      console.error("LOGIN ERROR:", error);
      const serverMsg =
        error.response?.data?.errors?.[0]?.msg ||
        error.response?.data?.message ||
        error.message ||
        "Login failed. Please check your credentials and try again.";
      setErrorMessage(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Section */}
      <div className="hidden md:flex w-1/2 bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 text-white p-16 flex-col justify-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-2xl font-bold mb-8 text-cyan-400">
          HS
        </div>

        <h1 className="text-5xl font-extrabold tracking-tight mb-2">HireSense AI</h1>
        <p className="text-xl font-medium text-cyan-400 mb-6">
          Smarter Screening. Better Hiring.
        </p>

        <p className="text-slate-300 mb-8 max-w-md leading-relaxed">
          AI-powered recruitment intelligence platform connecting recruiters and candidates through structured, explainable evaluations.
        </p>

        <div className="space-y-3 text-slate-300">
          <p className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold">✓</span> AI Semantic Resume Matching
          </p>
          <p className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold">✓</span> 11-Dimension Candidate Ranking
          </p>
          <p className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold">✓</span> Explainable Skill-Gap Detection
          </p>
          <p className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold">✓</span> Recruitment Intelligence & Analytics
          </p>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex-1 bg-slate-50 flex items-center justify-center p-8">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-10"
        >
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Sign In</h2>
          <p className="text-slate-500 mb-8">Access your HireSense AI portal</p>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              placeholder="name@company.com"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900"
              required
            />
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2">
              <span className="font-bold">⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? <LoadingSpinner size="sm" text="" /> : "Sign In to HireSense AI"}
          </button>

          <p className="text-center text-slate-500 mt-6 text-sm">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-indigo-600 font-semibold hover:underline"
            >
              Create Account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
