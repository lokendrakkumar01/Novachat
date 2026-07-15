// ============================================================
// NovaChat - Call Modal (Active Call with WebRTC)
// ============================================================
import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import {
  FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff,
  FiMonitor, FiVolume2, FiVolumeX, FiMinimize2,
} from "react-icons/fi";
import { callActions } from "../../store/slices/callSlice";
import { endCall, sendOffer, sendAnswer, sendIceCandidate } from "../../socket/socketClient";
import { getSocket } from "../../socket/socketClient";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function CallModal() {
  const dispatch = useDispatch();
  const { activeCall, callType, isMuted, isVideoOff, isScreenSharing, callDuration } = useSelector((state) => state.call);
  const { user } = useSelector((state) => state.auth);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const timerRef = useRef(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // Format duration
  const formatDuration = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // Initialize WebRTC
  useEffect(() => {
    const initCall = async () => {
      try {
        // Get user media
        const stream = await navigator.mediaDevices.getUserMedia({
          video: callType === "video" || callType === "screen",
          audio: true,
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        // Create peer connection
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionRef.current = pc;

        // Add tracks
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // Remote stream
        pc.ontrack = (event) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
        };

        // ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate && activeCall?.calleeId) {
            sendIceCandidate({ targetUserId: activeCall.calleeId, candidate: event.candidate, callId: activeCall.callId });
          }
        };

        // If caller, create offer
        if (activeCall?.calleeId) {
          const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: callType === "video" });
          await pc.setLocalDescription(offer);
          sendOffer({ targetUserId: activeCall.calleeId, offer, callId: activeCall.callId });
        }

        // Listen to WebRTC socket events
        const socket = getSocket();
        if (socket) {
          socket.on("webrtc:offer", async ({ offer, fromUserId }) => {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendAnswer({ targetUserId: fromUserId, answer, callId: activeCall?.callId });
          });

          socket.on("webrtc:answer", async ({ answer }) => {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
          });

          socket.on("webrtc:ice-candidate", async ({ candidate }) => {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          });
        }

        // Start timer
        timerRef.current = setInterval(() => {
          dispatch(callActions.setCallDuration(callDuration + 1));
        }, 1000);
      } catch (err) {
        console.error("WebRTC init error:", err);
      }
    };

    initCall();

    return () => {
      clearInterval(timerRef.current);
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      peerConnectionRef.current?.close();
    };
  }, []);

  const handleEndCall = () => {
    endCall({ callId: activeCall?.callId });
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    peerConnectionRef.current?.close();
    clearInterval(timerRef.current);
    dispatch(callActions.endCall());
  };

  const handleToggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = isMuted));
    dispatch(callActions.toggleMute());
  };

  const handleToggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = isVideoOff));
    dispatch(callActions.toggleVideo());
  };

  const handleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = peerConnectionRef.current?.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(videoTrack);
        videoTrack.onended = () => dispatch(callActions.toggleScreenShare());
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const sender = peerConnectionRef.current?.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(stream.getVideoTracks()[0]);
      }
      dispatch(callActions.toggleScreenShare());
    } catch (err) {
      console.error("Screen share error:", err);
    }
  };

  if (isMinimized) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed bottom-4 right-4 z-50 glass-card p-3 rounded-2xl flex items-center gap-3 cursor-pointer"
        onClick={() => setIsMinimized(false)}
      >
        <div className="w-10 h-10 rounded-full bg-nova-gradient flex items-center justify-center">
          <FiVideo size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{activeCall?.calleeName || "Call"}</p>
          <p className="text-xs text-emerald-400">{formatDuration(callDuration)}</p>
        </div>
        <button onClick={(e) => { e.stopPropagation(); handleEndCall(); }} className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
          <FiPhoneOff size={14} className="text-white" />
        </button>
      </motion.div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full h-full max-w-4xl max-h-[90vh] m-4 rounded-3xl overflow-hidden bg-dark-300 flex flex-col"
      >
        {/* Remote video (background) */}
        {callType === "video" ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-300">
            <div className="text-center">
              <div className="w-28 h-28 rounded-full bg-nova-gradient flex items-center justify-center text-white text-4xl font-bold mx-auto mb-4">
                {activeCall?.calleeName?.charAt(0) || "?"}
              </div>
              <h2 className="text-2xl font-bold text-white">{activeCall?.calleeName}</h2>
              <p className="text-emerald-400 mt-2">{formatDuration(callDuration)}</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
          <div>
            <h3 className="text-white font-semibold">{activeCall?.calleeName}</h3>
            <p className="text-xs text-emerald-400">{formatDuration(callDuration)} • {callType === "video" ? "Video Call" : "Voice Call"}</p>
          </div>
          <button onClick={() => setIsMinimized(true)} className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-all">
            <FiMinimize2 size={16} />
          </button>
        </div>

        {/* Local video (picture-in-picture) */}
        {callType === "video" && (
          <div className="absolute top-16 right-4 z-20">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-32 h-24 object-cover rounded-2xl border border-white/20 shadow-lg ${isVideoOff ? "hidden" : ""}`}
            />
          </div>
        )}

        {/* Controls */}
        <div className="relative z-10 mt-auto flex items-center justify-center gap-4 p-6 bg-gradient-to-t from-black/80 to-transparent">
          {/* Mute */}
          <div className="flex flex-col items-center gap-1">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleToggleMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isMuted ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-white/10 text-white border border-white/10"
              }`}
            >
              {isMuted ? <FiMicOff size={20} /> : <FiMic size={20} />}
            </motion.button>
            <span className="text-xs text-slate-400">{isMuted ? "Unmute" : "Mute"}</span>
          </div>

          {/* Video toggle */}
          {callType === "video" && (
            <div className="flex flex-col items-center gap-1">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleToggleVideo}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  isVideoOff ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-white/10 text-white border border-white/10"
                }`}
              >
                {isVideoOff ? <FiVideoOff size={20} /> : <FiVideo size={20} />}
              </motion.button>
              <span className="text-xs text-slate-400">Camera</span>
            </div>
          )}

          {/* Screen share */}
          <div className="flex flex-col items-center gap-1">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleScreenShare}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isScreenSharing ? "bg-nova-600/50 text-nova-300 border border-nova-500/30" : "bg-white/10 text-white border border-white/10"
              }`}
            >
              <FiMonitor size={20} />
            </motion.button>
            <span className="text-xs text-slate-400">Share</span>
          </div>

          {/* End call */}
          <div className="flex flex-col items-center gap-1">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleEndCall}
              className="w-14 h-14 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center transition-all shadow-lg"
              style={{ boxShadow: "0 0 20px rgba(239,68,68,0.4)" }}
            >
              <FiPhoneOff size={24} className="text-white" />
            </motion.button>
            <span className="text-xs text-slate-400">End</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
