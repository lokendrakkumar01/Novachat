// ============================================================
// NovaChat - Chat Redux Slice
// ============================================================
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { conversationAPI, messageAPI, groupAPI } from "../../services/api";

export const fetchConversations = createAsyncThunk("chat/fetchConversations", async (_, { rejectWithValue }) => {
  try {
    const { data } = await conversationAPI.getAll();
    return data.conversations;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const openConversation = createAsyncThunk("chat/openConversation", async (targetUserId, { rejectWithValue }) => {
  try {
    const { data } = await conversationAPI.getOrCreate(targetUserId);
    return data.conversation;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const fetchMessages = createAsyncThunk("chat/fetchMessages", async ({ conversationId, params }, { rejectWithValue }) => {
  try {
    const { data } = await messageAPI.getPrivate(conversationId, params);
    return { conversationId, messages: data.messages };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const fetchGroups = createAsyncThunk("chat/fetchGroups", async (_, { rejectWithValue }) => {
  try {
    const { data } = await groupAPI.getAll();
    return data.groups;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    conversations: [],
    groups: [],
    channels: [],
    activeConversation: null,
    activeGroup: null,
    messages: {}, // keyed by conversationId or groupId
    typingUsers: {}, // keyed by conversationId/groupId -> Set of userIds
    onlineUsers: new Set(),
    unreadCounts: {},
    searchResults: [],
    isLoading: false,
    isFetchingMessages: false,
    error: null,
  },
  reducers: {
    setActiveConversation: (state, action) => {
      state.activeConversation = action.payload;
      state.activeGroup = null;
    },
    setActiveGroup: (state, action) => {
      state.activeGroup = action.payload;
      state.activeConversation = null;
    },
    addMessage: (state, action) => {
      const { message, conversationId, groupId } = action.payload;
      const key = conversationId || groupId;
      if (!state.messages[key]) state.messages[key] = [];
      // Avoid duplicates
      const exists = state.messages[key].find((m) => m._id === message._id);
      if (!exists) state.messages[key].push(message);

      // Update conversation last message
      if (conversationId) {
        const conv = state.conversations.find((c) => c._id === conversationId);
        if (conv) conv.lastMessage = message;
      }
    },
    updateMessage: (state, action) => {
      const { messageId, conversationId, groupId, updates } = action.payload;
      const key = conversationId || groupId;
      if (state.messages[key]) {
        const idx = state.messages[key].findIndex((m) => m._id === messageId);
        if (idx !== -1) state.messages[key][idx] = { ...state.messages[key][idx], ...updates };
      }
    },
    removeMessage: (state, action) => {
      const { messageId, conversationId, groupId } = action.payload;
      const key = conversationId || groupId;
      if (state.messages[key]) {
        const msg = state.messages[key].find((m) => m._id === messageId);
        if (msg) {
          msg.isDeleted = true;
          msg.deletedForEveryone = true;
          msg.content = "";
        }
      }
    },
    updateReaction: (state, action) => {
      const { messageId, conversationId, groupId, reactions } = action.payload;
      const key = conversationId || groupId;
      if (state.messages[key]) {
        const msg = state.messages[key].find((m) => m._id === messageId);
        if (msg) msg.reactions = reactions;
      }
    },
    setTypingUser: (state, action) => {
      const { userId, conversationId, groupId, isTyping } = action.payload;
      const key = conversationId || groupId;
      if (!state.typingUsers[key]) state.typingUsers[key] = [];
      if (isTyping) {
        if (!state.typingUsers[key].includes(userId)) state.typingUsers[key].push(userId);
      } else {
        state.typingUsers[key] = state.typingUsers[key].filter((id) => id !== userId);
      }
    },
    setUserOnline: (state, action) => {
      const { userId, isOnline, lastSeen } = action.payload;
      // Update in conversations
      state.conversations.forEach((conv) => {
        conv.participants?.forEach((p) => {
          if (p._id === userId) {
            p.isOnline = isOnline;
            if (lastSeen) p.lastSeen = lastSeen;
          }
        });
      });
      if (state.activeConversation?.participants) {
        state.activeConversation.participants.forEach((p) => {
          if (p._id === userId) p.isOnline = isOnline;
        });
      }
    },
    incrementUnread: (state, action) => {
      const { conversationId } = action.payload;
      state.unreadCounts[conversationId] = (state.unreadCounts[conversationId] || 0) + 1;
    },
    clearUnread: (state, action) => {
      state.unreadCounts[action.payload] = 0;
    },
    setSearchResults: (state, action) => {
      state.searchResults = action.payload;
    },
    clearMessages: (state, action) => {
      delete state.messages[action.payload];
    },
    updateConversationLastMessage: (state, action) => {
      const { conversationId, message } = action.payload;
      const conv = state.conversations.find((c) => c._id === conversationId);
      if (conv) conv.lastMessage = message;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversations.pending, (state) => { state.isLoading = true; })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.conversations = action.payload;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(openConversation.fulfilled, (state, action) => {
        state.activeConversation = action.payload;
        const exists = state.conversations.find((c) => c._id === action.payload._id);
        if (!exists) state.conversations.unshift(action.payload);
      })
      .addCase(fetchMessages.pending, (state) => { state.isFetchingMessages = true; })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.isFetchingMessages = false;
        const { conversationId, messages } = action.payload;
        state.messages[conversationId] = messages;
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.groups = action.payload;
      });
  },
});

export const {
  setActiveConversation, setActiveGroup, addMessage, updateMessage,
  removeMessage, updateReaction, setTypingUser, setUserOnline,
  incrementUnread, clearUnread, setSearchResults, clearMessages,
  updateConversationLastMessage,
} = chatSlice.actions;

export default chatSlice.reducer;
