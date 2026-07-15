// ============================================================
// NovaChat - Forgot + Reset Password Pages
// ============================================================
import React, { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowLeft, FiCheckCircle } from "react-icons/fi";
import toast from "react-hot-toast";
import { authAPI } from "../services/api";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error("Enter your email");
    setIsLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      setIsSent(true);
      toast.success("Reset link sent if email exists");
    } catch {
      toast.error("Failed to send reset link");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Link to="/login" className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors">
          <FiArrowLeft size={18} /> Back to login
        </Link>

        {!isSent ? (
          <div className="glass-card p-8">
            <div className="w-16 h-16 rounded-2xl bg-nova-gradient flex items-center justify-center mb-6 shadow-nova">
              <FiLock size={28} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Forgot password?</h2>
            <p className="text-slate-400 mb-6">Enter your email and we'll send you a reset link</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-nova pl-11"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-nova w-full py-3.5 disabled:opacity-70"
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          </div>
        ) : (
          <div className="glass-card p-8 text-center">
            <div className="flex justify-center mb-4">
              <FiCheckCircle size={64} className="text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
            <p className="text-slate-400 mb-6">
              We've sent a password reset link to <strong className="text-white">{email}</strong>
            </p>
            <Link to="/login" className="btn-nova inline-block px-8 py-3">
              Back to Login
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return toast.error("Passwords don't match");
    if (form.password.length < 8) return toast.error("Password must be at least 8 characters");
    setIsLoading(true);
    try {
      await authAPI.resetPassword({ token, password: form.password });
      toast.success("Password reset successfully!");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Invalid Reset Link</h2>
          <Link to="/forgot-password" className="btn-nova px-6 py-3">Request New Link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="glass-card p-8">
          <div className="w-16 h-16 rounded-2xl bg-nova-gradient flex items-center justify-center mb-6 shadow-nova">
            <FiLock size={28} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Reset password</h2>
          <p className="text-slate-400 mb-6">Enter your new password</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type={showPwd ? "text" : "password"}
                placeholder="New password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input-nova pl-11 pr-11"
                required
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                {showPwd ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
            <div className="relative">
              <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="password"
                placeholder="Confirm new password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className="input-nova pl-11"
                required
              />
            </div>
            <button type="submit" disabled={isLoading} className="btn-nova w-full py-3.5 disabled:opacity-70">
              {isLoading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

export default ForgotPasswordPage;
