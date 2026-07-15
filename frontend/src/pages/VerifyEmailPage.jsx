// ============================================================
// NovaChat - Verify Email OTP Page
// ============================================================
import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { FiZap, FiMail, FiRefreshCw } from "react-icons/fi";
import toast from "react-hot-toast";
import { verifyEmailOTP } from "../store/slices/authSlice";
import { authAPI } from "../services/api";

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state) => state.auth);

  const { userId, email } = location.state || {};
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputs = useRef([]);

  useEffect(() => {
    if (!userId) navigate("/register");
  }, [userId, navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) { setCanResend(true); clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleOTPChange = (value, index) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = pasted.split("").concat(Array(6).fill("")).slice(0, 6);
    setOtp(newOtp);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      toast.error("Please enter the complete 6-digit OTP");
      return;
    }

    const result = await dispatch(verifyEmailOTP({ userId, otp: otpString }));
    if (verifyEmailOTP.fulfilled.match(result)) {
      toast.success("Email verified! Welcome to NovaChat! 🎉");
      navigate("/");
    } else {
      toast.error("Invalid or expired OTP");
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    try {
      await authAPI.resendOTP({ userId, type: "email" });
      toast.success("New OTP sent to your email");
      setResendTimer(60);
      setCanResend(false);
      const timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) { setCanResend(true); clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch {
      toast.error("Failed to resend OTP");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-nova-600/10 rounded-full filter blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10 text-center"
      >
        <div className="glass-card p-10">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-nova-gradient flex items-center justify-center shadow-nova">
              <FiMail size={40} className="text-white" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-white mb-2">Verify your email</h2>
          <p className="text-slate-400 mb-2">
            We sent a 6-digit code to
          </p>
          <p className="text-nova-400 font-medium mb-8">{email}</p>

          <form onSubmit={handleSubmit}>
            {/* OTP Input */}
            <div className="flex gap-3 justify-center mb-8" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <motion.input
                  key={i}
                  ref={(el) => (inputs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOTPChange(e.target.value, i)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border transition-all duration-200 bg-dark-200/60 text-white outline-none ${
                    digit
                      ? "border-nova-500 shadow-nova"
                      : "border-white/10 focus:border-nova-500/60 focus:shadow-nova"
                  }`}
                />
              ))}
            </div>

            <motion.button
              type="submit"
              disabled={isLoading || otp.join("").length !== 6}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="btn-nova w-full py-3.5 text-base disabled:opacity-70 mb-4"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </div>
              ) : "Verify Email ✓"}
            </motion.button>
          </form>

          {/* Resend */}
          <div className="flex items-center justify-center gap-2">
            <p className="text-slate-400 text-sm">Didn't receive the code?</p>
            <button
              onClick={handleResend}
              disabled={!canResend}
              className={`flex items-center gap-1 text-sm font-medium transition-colors ${
                canResend ? "text-nova-400 hover:text-nova-300 cursor-pointer" : "text-slate-600 cursor-not-allowed"
              }`}
            >
              <FiRefreshCw size={14} />
              {canResend ? "Resend" : `Resend (${resendTimer}s)`}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
