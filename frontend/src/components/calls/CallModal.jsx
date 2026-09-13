// ============================================================
// NovaChat - Call Modal (Active WebRTC Call UI & Media Stream)
// ============================================================
import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import {
  FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff,
  FiMonitor,
} from "react-icons/fi";
import { callActions } from "../../store/slices/callSlice";
import { endCall, getSocket, sendOffer, sendAnswer, sendIceCandidate } from "../../socket/socketClient";
import { playOutgoingRing, stopOutgoingRing, playCallEnded } from "../../utils/soundEffects";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function CallModal() {
  const dispatch = useDispatch();
  const { activeCall, callType, isMuted, isVideoOff, isScreenSharing, callStatus } = useSelector(
    (state) => state.call
  );
  const { user } = useSelector((state) => state.auth);
  const [duration, setDuration] = useState(0);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const timerRef = useRef(null);

  // Target caller / callee info
  const callerName =
    activeCall?.displayName ||
    activeCall?.username ||
    activeCall?.calleeName ||
    activeCall?.callerName ||
    activeCall?.user?.displayName ||
    activeCall?.recipient?.displayName ||
    activeCall?.participants?.find((p) => p._id !== user?._id)?.displayName ||
    "NovaChat Call";

  const callerAvatar =
    activeCall?.avatar?.url ||
    activeCall?.calleeAvatar ||
    activeCall?.callerAvatar ||
    activeCall?.user?.avatar?.url ||
    activeCall?.recipient?.avatar?.url ||
    activeCall?.participants?.find((p) => p._id !== user?._id)?.avatar?.url;

  const targetUserId =
    activeCall?.calleeId ||
    activeCall?.callerId ||
    activeCall?.user?._id ||
    activeCall?.recipient?._id;

  // Initialize WebRTC Stream & Peer Connection
  useEffect(() => {
    let isMounted = true;

    async function initWebRTC() {
      try {
        const constraints = {
          audio: true,
          video: callType === "video" ? { width: 640, height: 480 } : false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = stream;

        if (localVideoRef.current && callType === "video") {
          localVideoRef.current.srcObject = stream;
        }

        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        // Add local tracks to PeerConnection
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // Handle remote stream
        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate && targetUserId) {
            sendIceCandidate({
              targetUserId,
              candidate: event.candidate,
              callId: activeCall?._id || activeCall?.callId,
            });
          }
        };

        // Socket signaling listeners
        const socket = getSocket();
        if (socket) {
          socket.on("webrtc:offer", async ({ offer, fromUserId }) => {
            if (!pcRef.current) return;
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            sendAnswer({
              targetUserId: fromUserId,
              answer,
              callId: activeCall?._id || activeCall?.callId,
            });
          });

          socket.on("webrtc:answer", async ({ answer }) => {
            if (pcRef.current && pcRef.current.signalingState !== "stable") {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
            }
          });

          socket.on("webrtc:ice-candidate", async ({ candidate }) => {
            if (pcRef.current && candidate) {
              try {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (e) {}
            }
          });
        }

        // If caller initiated, send offer
        if (activeCall?.calleeId && targetUserId) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendOffer({
            targetUserId,
            offer,
            callId: activeCall?._id || activeCall?.callId,
          });
        }
      } catch (err) {
        console.warn("⚠️ WebRTC media access notice:", err.message);
      }
    }

    initWebRTC();

    return () => {
      isMounted = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
      const socket = getSocket();
      if (socket) {
        socket.off("webrtc:offer");
        socket.off("webrtc:answer");
        socket.off("webrtc:ice-candidate");
      }
    };
  }, [callType, targetUserId]);

  // Handle Mute toggle
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !isMuted));
    }
  }, [isMuted]);

  // Handle Video toggle
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = !isVideoOff));
    }
  }, [isVideoOff]);

  // Ringback tone when call is initiating/idle
  useEffect(() => {
    if (callStatus === "idle") {
      playOutgoingRing();
    } else {
      stopOutgoingRing();
    }
    return () => stopOutgoingRing();
  }, [callStatus]);

  // Timer when call is ongoing
  useEffect(() => {
    if (callStatus === "ongoing") {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [callStatus]);

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleEndCall = () => {
    stopOutgoingRing();
    playCallEnded();
    const callId = activeCall?._id || activeCall?.callId;
    if (callId) endCall({ callId });
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (pcRef.current) {
      pcRef.current.close();
    }
    dispatch(callActions.endCall());
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
    >
      <div className="relative w-full max-w-lg bg-[#1a1a2e] rounded-3xl shadow-2xl overflow-hidden border border-white/10 flex flex-col">
        {/* Header */}
        <div className="p-6 text-center z-10 bg-gradient-to-b from-black/60 to-transparent">
          <div className="w-20 h-20 rounded-full bg-nova-gradient mx-auto mb-3 flex items-center justify-center text-white text-3xl font-bold overflow-hidden shadow-nova border-2 border-white/20">
            {callerAvatar ? (
              <img src={callerAvatar} alt={callerName} className="w-full h-full object-cover" />
            ) : (
              callerName.charAt(0).toUpperCase()
            )}
          </div>
          <h2 className="text-xl font-bold text-white">{callerName}</h2>
          <p className="text-slate-400 text-sm mt-1 capitalize font-medium">
            {callStatus === "ongoing" ? formatDuration(duration) : callStatus === "idle" ? "Ringing / Connecting..." : callStatus}
          </p>
        </div>

        {/* Video Container */}
        {callType === "video" && (
          <div className="relative mx-4 mb-4 bg-black/60 rounded-2xl h-64 overflow-hidden flex items-center justify-center border border-white/5">
            {/* Remote Video Stream */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Local PIP Video */}
            <div className="absolute bottom-3 right-3 w-28 h-36 bg-dark-100 rounded-xl overflow-hidden shadow-lg border border-white/20 z-10">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Hidden audio element for voice calls */}
        {callType === "voice" && (
          <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 p-6 bg-dark-200/50">
          <button
            onClick={() => dispatch(callActions.toggleMute())}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isMuted ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            {isMuted ? <FiMicOff size={22} /> : <FiMic size={22} />}
          </button>

          {callType === "video" && (
            <button
              onClick={() => dispatch(callActions.toggleVideo())}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                isVideoOff ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {isVideoOff ? <FiVideoOff size={22} /> : <FiVideo size={22} />}
            </button>
          )}

          <button
            onClick={() => dispatch(callActions.toggleScreenShare())}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isScreenSharing ? "bg-nova-500/30 text-nova-300 border border-nova-500/30" : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <FiMonitor size={22} />
          </button>

          <button
            onClick={handleEndCall}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-all shadow-nova hover:scale-105 active:scale-95"
          >
            <FiPhoneOff size={26} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
