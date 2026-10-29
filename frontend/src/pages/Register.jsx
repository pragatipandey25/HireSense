import { useState } from "react";
import { registerUser } from "../services/authService";
import { useNavigate, Link } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import { toast } from "react-toastify";

const roleContent = {
  candidate: {
    heading: "Create your candidate account",
    description:
      "Create your candidate profile, upload your resume, and discover matching opportunities with explainable AI scores.",
    features: [
      "✓ Upload & Parse Resume (PDF/DOCX)",
      "✓ Browse Verified Job Openings",
      "✓ Real-time Application Tracking",
      "✓ Explainable AI Match & ATS Breakdown",
      "✓ Actionable Skill-Gap Feedback",
    ],
  },
  employer: {
    heading: "Create your employer account",
    description:
      "Post positions, review multi-dimensional candidate rankings, and streamline recruitment decisions.",
    features: [
      "✓ Job Creation with Skill Criteria",
      "✓ Bulk Resume Upload & Parsing",
      "✓ 11-Dimension AI Candidate Ranking",
      "✓ Candidate Shortlisting & CSV Export",
      "✓ Recruitment Intelligence Analytics",
    ],
  },
};

const Register = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "candidate",
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

      const response = await registerUser(formData);
      toast.success(response.message || "Account created successfully! Please sign in.");
      navigate("/");
    } catch (error) {
      console.error("Registration error:", error);
      const serverMsg =
        error.response?.data?.errors?.[0]?.msg ||
        error.response?.data?.message ||
        error.message ||
        "Registration failed. Please check your information.";
      setErrorMessage(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  const currentRoleContent =
    roleContent[formData.role] || roleContent.candidate;

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
          {currentRoleContent.description}
        </p>

        <div className="space-y-3 text-slate-300">
          {currentRoleContent.features.map((feature, idx) => (
            <p key={idx} className="flex items-center gap-2">
              <span className="text-cyan-400 font-bold">{feature.substring(0, 1)}</span>
              <span>{feature.substring(2)}</span>
            </p>
          ))}
        </div>
      </div>

      {/* Right Section */}
      <div className="flex-1 bg-slate-50 flex items-center justify-center p-8">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-10"
        >
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Create Account</h2>
          <p className="text-slate-500 mb-8">{currentRoleContent.heading}</p>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              placeholder="e.g. Alex Johnson"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              placeholder="name@example.com"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Password (min. 8 characters)
            </label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              minLength={8}
              className="w-full p-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900"
              required
            />
          </div>

          {/* Role Selector (Restricted to candidate and employer) */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              I want to join as
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: "candidate" })}
                className={`py-3 px-4 rounded-xl border font-medium text-sm transition text-center ${
                  formData.role === "candidate"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold ring-2 ring-indigo-500/20"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                🎓 Candidate
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: "employer" })}
                className={`py-3 px-4 rounded-xl border font-medium text-sm transition text-center ${
                  formData.role === "employer"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold ring-2 ring-indigo-500/20"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                💼 Employer
              </button>
            </div>
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
            {loading ? <LoadingSpinner size="sm" text="" /> : "Create Free Account"}
          </button>

          <p className="text-center text-slate-500 mt-6 text-sm">
            Already have an account?{" "}
            <Link
              to="/"
              className="text-indigo-600 font-semibold hover:underline"
            >
              Sign In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
