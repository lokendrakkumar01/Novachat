// ============================================================
// NovaChat - UI Redux Slice
// ============================================================
import { createSlice } from "@reduxjs/toolkit";

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    theme: localStorage.getItem("novachat_theme") || "dark",
    sidebarOpen: true,
    rightPanelOpen: false,
    rightPanelContent: null, // 'profile' | 'media' | 'search' | 'group_info'
    activeModal: null, // 'create_group' | 'create_channel' | 'profile_edit' | etc.
    activeTab: "chats", // 'chats' | 'groups' | 'channels' | 'stories' | 'calls'
    searchQuery: "",
    isSearching: false,
    isMobileView: window.innerWidth < 768,
    mobileSidebarOpen: false,
  },
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload;
      localStorage.setItem("novachat_theme", action.payload);
    },
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen; },
    setRightPanel: (state, action) => {
      state.rightPanelOpen = !!action.payload;
      state.rightPanelContent = action.payload;
    },
    openModal: (state, action) => { state.activeModal = action.payload; },
    closeModal: (state) => { state.activeModal = null; },
    setActiveTab: (state, action) => { state.activeTab = action.payload; },
    setSearchQuery: (state, action) => { state.searchQuery = action.payload; },
    setIsSearching: (state, action) => { state.isSearching = action.payload; },
    setMobileView: (state, action) => { state.isMobileView = action.payload; },
    toggleMobileSidebar: (state) => { state.mobileSidebarOpen = !state.mobileSidebarOpen; },
  },
});

export const uiActions = uiSlice.actions;
export default uiSlice.reducer;
