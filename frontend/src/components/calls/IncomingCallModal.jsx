// ============================================================
// NovaChat - Incoming Call Modal
// ============================================================
import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { FiPhone, FiPhoneOff, FiVideo } from "react-icons/fi";
import { callActions } from "../../store/slices/callSlice";
import { acceptCall, rejectCall } from "../../socket/socketClient";

export default function IncomingCallModal() {
  const dispatch = useDispatch();
  const { incomingCall } = useSelector((state) => state.call);
  const ringtoneRef = useRef(null);

  useEffect(() => {
    // Play ringtone
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.3;
    gainNode.connect(ctx.destination);

    const playBeep = () => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      osc.connect(gainNode);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    };

    const interval = setInterval(playBeep, 1500);
    playBeep();
    ringtoneRef.current = { interval, ctx };

    return () => {
      clearInterval(interval);
      ctx.close();
    };
  }, []);

  const handleAccept = () => {
    ringtoneRef.current && clearInterval(ringtoneRef.current.interval);
    acceptCall({ callId: incomingCall.callId });
    dispatch(callActions.setActiveCall(incomingCall));
    dispatch(callActions.setCallType(incomingCall.type));
    dispatch(callActions.clearIncomingCall());
  };

  const handleReject = () => {
    ringtoneRef.current && clearInterval(ringtoneRef.current.interval);
    rejectCall({ callId: incomingCall.callId });
    dispatch(callActions.clearIncomingCall());
  };

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.9 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative z-10 glass-card p-6 rounded-3xl w-full max-w-sm text-center"
      >
        {/* Caller avatar with pulse ring */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-nova-500/30 animate-ping scale-110" />
            <div className="absolute inset-0 rounded-full bg-nova-500/20 animate-ping scale-125" style={{ animationDelay: "0.3s" }} />
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-nova-500/50 relative">
              <div className="w-full h-full bg-nova-gradient flex items-center justify-center text-white text-3xl font-bold">
                {incomingCall.callerName?.charAt(0) || "?"}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-1 text-slate-400 text-sm">
          {incomingCall.type === "video" ? <FiVideo size={14} /> : <FiPhone size={14} />}
          <span>Incoming {incomingCall.type || "voice"} call</span>
        </div>
        <h3 className="text-xl font-bold text-white mb-1">{incomingCall.callerName || "Unknown"}</h3>
        <p className="text-slate-500 text-sm mb-8">is calling you...</p>

        {/* Actions */}
        <div className="flex items-center justify-center gap-8">
          {/* Decline */}
          <div className="flex flex-col items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleReject}
              className="call-btn-decline"
            >
              <FiPhoneOff size={22} />
            </motion.button>
            <span className="text-xs text-slate-500">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleAccept}
              className="call-btn-accept"
            >
              {incomingCall.type === "video" ? <FiVideo size={22} /> : <FiPhone size={22} />}
            </motion.button>
            <span className="text-xs text-slate-500">Accept</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
