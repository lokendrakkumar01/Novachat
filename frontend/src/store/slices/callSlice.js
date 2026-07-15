// ============================================================
// NovaChat - Call Redux Slice (WebRTC state)
// ============================================================
import { createSlice } from "@reduxjs/toolkit";

const callSlice = createSlice({
  name: "call",
  initialState: {
    activeCall: null,
    incomingCall: null,
    isCallActive: false,
    callType: null, // 'voice' | 'video'
    isMuted: false,
    isVideoOff: false,
    isSpeakerOn: false,
    isScreenSharing: false,
    callDuration: 0,
    callStatus: "idle", // idle | ringing | ongoing | ended
  },
  reducers: {
    setIncomingCall: (state, action) => { state.incomingCall = action.payload; },
    clearIncomingCall: (state) => { state.incomingCall = null; },
    setActiveCall: (state, action) => {
      state.activeCall = action.payload;
      state.isCallActive = true;
      state.callStatus = "ongoing";
    },
    endCall: (state) => {
      state.activeCall = null;
      state.incomingCall = null;
      state.isCallActive = false;
      state.callStatus = "idle";
      state.isMuted = false;
      state.isVideoOff = false;
      state.isScreenSharing = false;
      state.callDuration = 0;
    },
    setCallStatus: (state, action) => { state.callStatus = action.payload; },
    toggleMute: (state) => { state.isMuted = !state.isMuted; },
    toggleVideo: (state) => { state.isVideoOff = !state.isVideoOff; },
    toggleSpeaker: (state) => { state.isSpeakerOn = !state.isSpeakerOn; },
    toggleScreenShare: (state) => { state.isScreenSharing = !state.isScreenSharing; },
    setCallDuration: (state, action) => { state.callDuration = action.payload; },
    setCallType: (state, action) => { state.callType = action.payload; },
  },
});

export const callActions = callSlice.actions;
export default callSlice.reducer;
