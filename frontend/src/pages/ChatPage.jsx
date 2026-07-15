// ============================================================
// NovaChat - Main Chat Page (Core UI Layout)
// ============================================================
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { fetchConversations, fetchGroups, setActiveConversation } from "../store/slices/chatSlice";
import { uiActions } from "../store/slices/uiSlice";

// Components
import Sidebar from "../components/chat/Sidebar";
import ConversationList from "../components/chat/ConversationList";
import ChatWindow from "../components/chat/ChatWindow";
import EmptyChat from "../components/chat/EmptyChat";
import CallModal from "../components/calls/CallModal";
import IncomingCallModal from "../components/calls/IncomingCallModal";

export default function ChatPage() {
  const dispatch = useDispatch();
  const { activeConversation, activeGroup } = useSelector((state) => state.chat);
  const { activeModal, isMobileView } = useSelector((state) => state.ui);
  const { isCallActive, incomingCall } = useSelector((state) => state.call);

  useEffect(() => {
    dispatch(fetchConversations());
    dispatch(fetchGroups());
  }, [dispatch]);

  return (
    <div className="h-screen bg-[#0f0f1a] flex overflow-hidden">
      {/* Left Sidebar - Navigation */}
      <Sidebar />

      {/* Middle Panel - Conversation List */}
      <div className={`w-80 border-r border-white/5 flex flex-col ${isMobileView && (activeConversation || activeGroup) ? "hidden" : ""}`}>
        <ConversationList />
      </div>

      {/* Right Panel - Chat Window */}
      <div className={`flex-1 flex flex-col ${isMobileView && !activeConversation && !activeGroup ? "hidden" : ""}`}>
        {activeConversation || activeGroup ? (
          <ChatWindow />
        ) : (
          <EmptyChat />
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isCallActive && <CallModal />}
        {incomingCall && !isCallActive && <IncomingCallModal />}
      </AnimatePresence>
    </div>
  );
}
