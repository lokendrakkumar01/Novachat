// ============================================================
// NovaChat - Register Page
// ============================================================
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { FiUser, FiMail, FiLock, FiPhone, FiEye, FiEyeOff, FiZap, FiCheck } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import toast from "react-hot-toast";
import { registerUser, setRegistrationData } from "../store/slices/authSlice";

export default function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state) => state.auth);

  const [form, setForm] = useState({
    username: "", email: "", password: "", confirmPassword: "",
    displayName: "", phone: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [step, setStep] = useState(1); // 1=basic, 2=verification

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const passwordStrength = (p) => {
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };

  const strength = passwordStrength(form.password);
  const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-emerald-500"];
  const strengthLabels = ["Weak", "Fair", "Good", "Strong"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.email || !form.password) {
      toast.error("Please fill in required fields");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    const { confirmPassword, ...submitData } = form;
    const result = await dispatch(registerUser(submitData));
    if (registerUser.fulfilled.match(result)) {
      toast.success("Account created! Check your email for OTP ✉️");
      navigate("/verify-email", { state: { userId: result.payload.userId, email: form.email } });
    } else {
      toast.error(result.payload || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center px-6 py-12">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-nova-600/10 rounded-full filter blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-600/10 rounded-full filter blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(rgba(99,102,241,0.8) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-nova-gradient flex items-center justify-center shadow-nova">
            <FiZap size={20} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">NovaChat</h1>
        </div>

        <div className="mb-6">
          <h2 className="text-3xl font-bold text-white mb-2">Create account ✨</h2>
          <p className="text-slate-400">Join millions on NovaChat today</p>
        </div>

        {/* Google */}
        <button
          onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/auth/google`}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white/5 border border-white/10 rounded-xl text-white font-medium hover:bg-white/10 transition-all duration-200 mb-6"
        >
          <FcGoogle size={22} />
          Continue with Google
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-slate-500 text-sm">or register with email</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display Name */}
          <div className="relative">
            <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              id="displayName"
              name="displayName"
              type="text"
              placeholder="Display name"
              value={form.displayName}
              onChange={handleChange}
              className="input-nova pl-11"
            />
          </div>

          {/* Username */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-base font-mono">@</span>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="Username (required)"
              value={form.username}
              onChange={handleChange}
              className="input-nova pl-11"
              required
            />
          </div>

          {/* Email */}
          <div className="relative">
            <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Email address (required)"
              value={form.email}
              onChange={handleChange}
              className="input-nova pl-11"
              required
            />
          </div>

          {/* Phone */}
          <div className="relative">
            <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="Phone number (optional)"
              value={form.phone}
              onChange={handleChange}
              className="input-nova pl-11"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password (min 8 chars)"
              value={form.password}
              onChange={handleChange}
              className="input-nova pl-11 pr-11"
              required
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          </div>

          {/* Password strength */}
          {form.password && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < strength ? strengthColors[strength - 1] : "bg-white/10"}`} />
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Password strength: <span className={`font-medium ${strength >= 3 ? "text-emerald-400" : strength >= 2 ? "text-yellow-400" : "text-red-400"}`}>
                  {strengthLabels[strength - 1] || "Too short"}
                </span>
              </p>
            </div>
          )}

          {/* Confirm Password */}
          <div className="relative">
            <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm password"
              value={form.confirmPassword}
              onChange={handleChange}
              className={`input-nova pl-11 pr-11 ${form.confirmPassword && form.password !== form.confirmPassword ? "border-red-500/60" : ""}`}
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              {showConfirm ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
            {form.confirmPassword && form.password === form.confirmPassword && (
              <FiCheck className="absolute right-11 top-1/2 -translate-y-1/2 text-emerald-400" size={16} />
            )}
          </div>

          {/* Terms */}
          <p className="text-xs text-slate-500">
            By creating an account, you agree to our{" "}
            <a href="#" className="text-nova-400 hover:underline">Terms of Service</a> and{" "}
            <a href="#" className="text-nova-400 hover:underline">Privacy Policy</a>.
          </p>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="btn-nova w-full py-3.5 text-base disabled:opacity-70"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating account...
              </div>
            ) : "Create Account →"}
          </motion.button>
        </form>

        <p className="mt-6 text-center text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="text-nova-400 hover:text-nova-300 font-medium">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
