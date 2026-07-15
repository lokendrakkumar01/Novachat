// ============================================================
// NovaChat - Redux Store Setup
// ============================================================
import { configureStore } from "@reduxjs/toolkit";
import authSlice from "./slices/authSlice";
import chatSlice from "./slices/chatSlice";
import notificationSlice from "./slices/notificationSlice";
import callSlice from "./slices/callSlice";
import uiSlice from "./slices/uiSlice";

export const store = configureStore({
  reducer: {
    auth: authSlice,
    chat: chatSlice,
    notifications: notificationSlice,
    call: callSlice,
    ui: uiSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["call/setOffer", "call/setAnswer"],
        ignoredPaths: ["call.offer", "call.answer", "call.peerConnection"],
      },
    }),
});

export default store;
