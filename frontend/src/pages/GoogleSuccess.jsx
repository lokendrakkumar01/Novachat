// ============================================================
// NovaChat - Google OAuth Redirect Landing Page
// ============================================================
import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { fetchCurrentUser } from "../store/slices/authSlice";
import toast from "react-hot-toast";

export default function GoogleSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const token = params.get("token");
    if (token) {
      localStorage.setItem("accessToken", token);
      dispatch(fetchCurrentUser()).then((res) => {
        if (fetchCurrentUser.fulfilled.match(res)) {
          toast.success("Signed in with Google! 🚀");
          navigate("/", { replace: true });
        } else {
          toast.error("Failed to fetch Google profile");
          navigate("/login", { replace: true });
        }
      });
    } else {
      toast.error("Google sign in failed");
      navigate("/login", { replace: true });
    }
  }, [params, navigate, dispatch]);

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-nova-500/30 border-t-nova-500 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Authenticating with Google...</p>
      </div>
    </div>
  );
}
