// ============================================================
// NovaChat - Empty Chat Placeholder
// ============================================================
import React from "react";
import { motion } from "framer-motion";
import { FiZap } from "react-icons/fi";

export default function EmptyChat() {
  return (
    <div className="flex-1 flex items-center justify-center h-full bg-[#0f0f1a] relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-nova-600/10 rounded-full filter blur-3xl" />
      <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-48 h-48 bg-purple-600/8 rounded-full filter blur-2xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center relative z-10 px-8"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="flex justify-center mb-6"
        >
          <div className="w-24 h-24 rounded-3xl bg-nova-gradient flex items-center justify-center shadow-nova-lg">
            <FiZap size={48} className="text-white" />
          </div>
        </motion.div>

        <h2 className="text-2xl font-bold text-white mb-3">
          Welcome to <span className="gradient-text">NovaChat</span>
        </h2>
        <p className="text-slate-400 max-w-xs mx-auto leading-relaxed text-sm">
          Select a conversation from the sidebar or search for a user to start messaging.
        </p>

        <div className="mt-8 grid grid-cols-3 gap-3 max-w-xs mx-auto">
          {[
            { icon: "💬", label: "End-to-end encrypted" },
            { icon: "⚡", label: "Real-time delivery" },
            { icon: "🤖", label: "AI-powered" },
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="glass-card px-2 py-3 text-center"
            >
              <span className="text-2xl block mb-1">{f.icon}</span>
              <span className="text-xs text-slate-500">{f.label}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
