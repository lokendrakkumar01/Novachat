// ============================================================
// NovaChat - App Router + Socket Initialization
// ============================================================
import React, { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchCurrentUser } from "./store/slices/authSlice";
import { initSocket, getSocket } from "./socket/socketClient";
import {
  addMessage, setTypingUser, setUserOnline,
  incrementUnread, updateMessage, removeMessage, updateReaction,
} from "./store/slices/chatSlice";
import { notificationActions } from "./store/slices/notificationSlice";
import { callActions } from "./store/slices/callSlice";

// Lazy load pages
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const StoriesPage = lazy(() => import("./pages/StoriesPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const GoogleSuccess = lazy(() => import("./pages/GoogleSuccess"));

// Loading spinner
const LoadingScreen = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-[#0f0f1a]">
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-nova-500/20"></div>
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-nova-500 animate-spin"></div>
        <div className="absolute inset-2 rounded-full bg-nova-gradient flex items-center justify-center">
          <span className="text-white text-xl font-bold">N</span>
        </div>
      </div>
      <p className="text-slate-400 text-sm animate-pulse">Loading NovaChat...</p>
    </div>
  </div>
);

// Protected Route
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useSelector((state) => state.auth);
  if (isLoading) return <LoadingScreen />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return isAuthenticated ? <Navigate to="/" replace /> : children;
};

// Admin Route
const AdminRoute = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  if (!user || !["admin", "superadmin"].includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  // Fetch current user on app load
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) dispatch(fetchCurrentUser());
  }, [dispatch]);

  // Initialize socket when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user?._id) return;

    const socket = initSocket(user._id);

    // Message events
    socket.on("message:receive", (data) => dispatch(addMessage(data)));
    socket.on("message:edited", ({ messageId, content, editedAt, conversationId, groupId }) => {
      dispatch(updateMessage({ messageId, conversationId, groupId, updates: { content, isEdited: true, editedAt } }));
    });
    socket.on("message:deleted", ({ messageId, conversationId, groupId }) => {
      dispatch(removeMessage({ messageId, conversationId, groupId }));
    });
    socket.on("message:reaction", ({ messageId, reactions, conversationId, groupId }) => {
      dispatch(updateReaction({ messageId, reactions, conversationId, groupId }));
    });
    socket.on("conversation:unread", ({ conversationId }) => {
      dispatch(incrementUnread({ conversationId }));
    });

    // Typing events
    socket.on("typing:start", ({ userId, conversationId, groupId }) => {
      dispatch(setTypingUser({ userId, conversationId, groupId, isTyping: true }));
    });
    socket.on("typing:stop", ({ userId, conversationId, groupId }) => {
      dispatch(setTypingUser({ userId, conversationId, groupId, isTyping: false }));
    });

    // Online status events
    socket.on("user:online", ({ userId }) => dispatch(setUserOnline({ userId, isOnline: true })));
    socket.on("user:offline", ({ userId, lastSeen }) => dispatch(setUserOnline({ userId, isOnline: false, lastSeen })));

    // Notification events
    socket.on("notification:new", (notif) => dispatch(notificationActions.addNotification(notif)));

    // Call events
    socket.on("call:incoming", (data) => dispatch(callActions.setIncomingCall(data)));
    socket.on("call:accepted", () => dispatch(callActions.setCallStatus("ongoing")));
    socket.on("call:rejected", () => dispatch(callActions.endCall()));
    socket.on("call:ended", () => dispatch(callActions.endCall()));

    // Account banned
    socket.on("account:banned", () => {
      localStorage.removeItem("accessToken");
      window.location.href = "/login?banned=true";
    });

    return () => {
      socket.off("message:receive");
      socket.off("message:edited");
      socket.off("message:deleted");
      socket.off("message:reaction");
      socket.off("conversation:unread");
      socket.off("typing:start");
      socket.off("typing:stop");
      socket.off("user:online");
      socket.off("user:offline");
      socket.off("notification:new");
      socket.off("call:incoming");
      socket.off("call:accepted");
      socket.off("call:rejected");
      socket.off("call:ended");
    };
  }, [isAuthenticated, user?._id, dispatch]);

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
          <Route path="/auth/google/success" element={<GoogleSuccess />} />

          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/chat/:conversationId?" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/profile/:userId?" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/stories" element={<ProtectedRoute><StoriesPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

          {/* Admin Routes */}
          <Route path="/admin/*" element={<ProtectedRoute><AdminRoute><AdminPage /></AdminRoute></ProtectedRoute>} />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
