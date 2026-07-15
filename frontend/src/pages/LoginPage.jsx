// ============================================================
// NovaChat - Login Page (Premium Dark UI)
// ============================================================
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { FiMail, FiLock, FiEye, FiEyeOff, FiZap } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import toast from "react-hot-toast";
import { loginUser } from "../store/slices/authSlice";

export default function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.auth);

  const [form, setForm] = useState({ identifier: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.identifier || !form.password) {
      toast.error("Please fill in all fields");
      return;
    }
    const result = await dispatch(loginUser(form));
    if (loginUser.fulfilled.match(result)) {
      toast.success("Welcome back! 🚀");
      navigate("/");
    } else {
      toast.error(result.payload || "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex">
      {/* Left Panel - Decorative */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex w-1/2 relative overflow-hidden items-center justify-center"
      >
        {/* Background gradient */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[#0f0f1a]" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-nova-600/20 rounded-full filter blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-600/15 rounded-full filter blur-2xl animate-pulse-slow" style={{ animationDelay: "1s" }} />
        </div>

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: "radial-gradient(rgba(99,102,241,0.8) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />

        {/* Content */}
        <div className="relative z-10 text-center px-12">
          {/* Logo */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="mb-8"
          >
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-nova-gradient shadow-nova-lg mb-4">
              <FiZap size={48} className="text-white" />
            </div>
          </motion.div>

          <h1 className="text-5xl font-bold text-white mb-4 font-display">
            <span className="gradient-text">NovaChat</span>
          </h1>
          <p className="text-xl text-slate-400 mb-8">
            The future of communication.<br />
            More powerful than ever.
          </p>

          {/* Feature highlights */}
          <div className="grid grid-cols-2 gap-3 text-left">
            {[
              { icon: "🔐", text: "End-to-end encrypted" },
              { icon: "⚡", text: "Real-time messaging" },
              { icon: "📞", text: "HD video & voice calls" },
              { icon: "🤖", text: "AI-powered features" },
              { icon: "📱", text: "Stories & Status" },
              { icon: "🌐", text: "Group & Channels" },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-2 glass-card px-3 py-2"
              >
                <span className="text-lg">{f.icon}</span>
                <span className="text-sm text-slate-300">{f.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-nova-gradient flex items-center justify-center">
              <FiZap size={20} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold gradient-text">NovaChat</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome back 👋</h2>
            <p className="text-slate-400">Sign in to continue to NovaChat</p>
          </div>

          {/* Google OAuth */}
          <button
            onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/auth/google`}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white/5 border border-white/10 rounded-xl text-white font-medium hover:bg-white/10 transition-all duration-200 mb-6"
          >
            <FcGoogle size={22} />
            Continue with Google
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-slate-500 text-sm">or sign in with email</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email/Username */}
            <div className="relative">
              <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                id="identifier"
                name="identifier"
                type="text"
                placeholder="Email or username"
                value={form.identifier}
                onChange={handleChange}
                className="input-nova pl-11"
                autoComplete="username"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                className="input-nova pl-11 pr-11"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-nova-400 hover:text-nova-300 transition-colors">
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="btn-nova w-full py-3.5 text-base disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : "Sign In →"}
            </motion.button>
          </form>

          <p className="mt-6 text-center text-slate-400">
            Don't have an account?{" "}
            <Link to="/register" className="text-nova-400 hover:text-nova-300 font-medium transition-colors">
              Create one
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
