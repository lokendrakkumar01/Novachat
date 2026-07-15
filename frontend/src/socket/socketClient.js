// ============================================================
// NovaChat - Socket.io Client
// ============================================================
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

let socket = null;

export const initSocket = (userId) => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { userId },
    query: { userId },
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on("connect", () => console.log("🔌 Socket connected:", socket.id));
  socket.on("disconnect", (reason) => console.log("🔌 Socket disconnected:", reason));
  socket.on("connect_error", (err) => console.error("❌ Socket error:", err.message));

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinRoom = ({ conversationId, groupId, channelId }) => {
  socket?.emit("room:join", { conversationId, groupId, channelId });
};

export const leaveRoom = ({ conversationId, groupId }) => {
  socket?.emit("room:leave", { conversationId, groupId });
};

export const sendSocketMessage = (data) => {
  socket?.emit("message:send", data);
};

export const startTyping = (data) => {
  socket?.emit("typing:start", data);
};

export const stopTyping = (data) => {
  socket?.emit("typing:stop", data);
};

export const markMessagesRead = (data) => {
  socket?.emit("message:read", data);
};

export const markMessagesDelivered = (data) => {
  socket?.emit("message:delivered", data);
};

// Call events
export const initiateCall = (data) => socket?.emit("call:initiate", data);
export const acceptCall = (data) => socket?.emit("call:accept", data);
export const rejectCall = (data) => socket?.emit("call:reject", data);
export const endCall = (data) => socket?.emit("call:end", data);

// WebRTC signaling
export const sendOffer = (data) => socket?.emit("webrtc:offer", data);
export const sendAnswer = (data) => socket?.emit("webrtc:answer", data);
export const sendIceCandidate = (data) => socket?.emit("webrtc:ice-candidate", data);
export const toggleScreenShare = (data) => socket?.emit("call:screen-share", data);

export default { initSocket, getSocket, disconnectSocket };
