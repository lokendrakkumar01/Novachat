// ============================================================
// NovaChat - Socket.io Service
// Real-time event handler for messages, calls, typing, etc.
// ============================================================
const User = require("../models/User");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const Call = require("../models/Call");

// Map: userId -> Set of socketIds
const onlineUsers = new Map();

const initializeSocket = (io) => {
  io.on("connection", async (socket) => {
    const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;

    console.log(`🔌 Socket connected: ${socket.id} (User: ${userId})`);

    // ============================================================
    // USER ONLINE/OFFLINE STATUS
    // ============================================================
    if (userId) {
      // Track socket for this user
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId).add(socket.id);

      // Update DB
      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        socketId: socket.id,
        lastSeen: new Date(),
      });

      // Join user's personal room for direct notifications
      socket.join(`user_${userId}`);

      // Notify contacts that user is online
      io.emit("user:online", { userId, isOnline: true });

      console.log(`✅ User ${userId} is online (${onlineUsers.get(userId).size} sockets)`);
    }

    // ============================================================
    // JOIN CONVERSATION ROOMS
    // ============================================================
    socket.on("room:join", ({ conversationId, groupId, channelId }) => {
      if (conversationId) {
        socket.join(`conversation_${conversationId}`);
        console.log(`📁 ${userId} joined conversation_${conversationId}`);
      }
      if (groupId) {
        socket.join(`group_${groupId}`);
        console.log(`👥 ${userId} joined group_${groupId}`);
      }
      if (channelId) {
        socket.join(`channel_${channelId}`);
        console.log(`📢 ${userId} joined channel_${channelId}`);
      }
    });

    socket.on("room:leave", ({ conversationId, groupId }) => {
      if (conversationId) socket.leave(`conversation_${conversationId}`);
      if (groupId) socket.leave(`group_${groupId}`);
    });

    // ============================================================
    // REAL-TIME MESSAGING
    // ============================================================
    socket.on("message:send", async (data) => {
      try {
        const { conversationId, groupId, content, type = "text", replyTo, tempId } = data;

        const messageData = {
          sender: userId,
          type,
          content: content || "",
          replyTo: replyTo || null,
        };

        if (conversationId) {
          messageData.conversationType = "private";
          messageData.conversation = conversationId;
        } else if (groupId) {
          messageData.conversationType = "group";
          messageData.group = groupId;
        }

        const message = await Message.create(messageData);
        await message.populate("sender", "username displayName avatar");
        if (replyTo) await message.populate("replyTo");

        // Update conversation/group last message
        if (conversationId) {
          await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: message._id,
            updatedAt: new Date(),
          });
        }

        const room = conversationId ? `conversation_${conversationId}` : `group_${groupId}`;

        // Emit to all in room with tempId for optimistic UI
        io.to(room).emit("message:receive", {
          message,
          tempId,
          conversationId,
          groupId,
        });

        // Update unread count for other participants
        if (conversationId) {
          const conv = await Conversation.findById(conversationId);
          if (conv) {
            conv.participants.forEach((participantId) => {
              if (participantId.toString() !== userId) {
                io.to(`user_${participantId}`).emit("conversation:unread", {
                  conversationId,
                  senderId: userId,
                });
              }
            });
          }
        }
      } catch (err) {
        socket.emit("error", { message: err.message });
      }
    });

    // ============================================================
    // TYPING INDICATORS
    // ============================================================
    socket.on("typing:start", ({ conversationId, groupId }) => {
      const room = conversationId ? `conversation_${conversationId}` : `group_${groupId}`;
      socket.to(room).emit("typing:start", { userId, conversationId, groupId });
    });

    socket.on("typing:stop", ({ conversationId, groupId }) => {
      const room = conversationId ? `conversation_${conversationId}` : `group_${groupId}`;
      socket.to(room).emit("typing:stop", { userId, conversationId, groupId });
    });

    // ============================================================
    // MESSAGE READ RECEIPTS
    // ============================================================
    socket.on("message:read", async ({ messageIds, conversationId }) => {
      try {
        if (!Array.isArray(messageIds) || messageIds.length === 0) return;

        await Message.updateMany(
          {
            _id: { $in: messageIds },
            "readBy.user": { $ne: userId },
          },
          {
            $addToSet: { readBy: { user: userId, at: new Date() } },
          }
        );

        // Reset unread count
        if (conversationId) {
          await Conversation.findByIdAndUpdate(conversationId, {
            $set: { "unreadCount.$[elem].count": 0 },
          }, {
            arrayFilters: [{ "elem.user": userId }],
          });
        }

        // Notify message senders that messages were read
        const messages = await Message.find({ _id: { $in: messageIds } });
        const senderIds = [...new Set(messages.map((m) => m.sender.toString()))];

        senderIds.forEach((senderId) => {
          if (senderId !== userId) {
            io.to(`user_${senderId}`).emit("message:read", {
              messageIds,
              readBy: userId,
              conversationId,
            });
          }
        });
      } catch (err) {
        console.error("Read receipt error:", err.message);
      }
    });

    // ============================================================
    // MESSAGE DELIVERED
    // ============================================================
    socket.on("message:delivered", async ({ messageIds }) => {
      try {
        await Message.updateMany(
          { _id: { $in: messageIds }, "deliveredTo.user": { $ne: userId } },
          { $addToSet: { deliveredTo: { user: userId, at: new Date() } } }
        );
      } catch (err) {
        console.error("Delivery receipt error:", err.message);
      }
    });

    // ============================================================
    // WEBRTC CALLING
    // ============================================================

    // Initiate call
    socket.on("call:initiate", async ({ calleeId, type, conversationId }) => {
      try {
        const call = await Call.create({
          caller: userId,
          receivers: [{ user: calleeId, status: "ringing" }],
          type,
          conversationType: "private",
          conversation: conversationId,
          status: "initiated",
        });

        // Notify callee
        io.to(`user_${calleeId}`).emit("call:incoming", {
          callId: call._id,
          callerId: userId,
          type,
          conversationId,
        });

        socket.emit("call:initiated", { callId: call._id });
      } catch (err) {
        socket.emit("error", { message: err.message });
      }
    });

    // Call accepted
    socket.on("call:accept", async ({ callId }) => {
      try {
        const call = await Call.findByIdAndUpdate(callId, {
          status: "ongoing",
          startedAt: new Date(),
          $set: { "receivers.$[elem].status": "accepted", "receivers.$[elem].joinedAt": new Date() },
        }, { arrayFilters: [{ "elem.user": userId }], new: true });

        io.to(`user_${call.caller.toString()}`).emit("call:accepted", { callId });
      } catch (err) {
        socket.emit("error", { message: err.message });
      }
    });

    // Call rejected
    socket.on("call:reject", async ({ callId }) => {
      try {
        const call = await Call.findByIdAndUpdate(callId, {
          status: "rejected",
          endedAt: new Date(),
          $set: { "receivers.$[elem].status": "rejected" },
        }, { arrayFilters: [{ "elem.user": userId }] });

        if (call) {
          io.to(`user_${call.caller.toString()}`).emit("call:rejected", { callId });
        }
      } catch (err) {
        socket.emit("error", { message: err.message });
      }
    });

    // Call ended
    socket.on("call:end", async ({ callId }) => {
      try {
        const call = await Call.findById(callId);
        if (!call) return;

        const duration = call.startedAt
          ? Math.floor((Date.now() - new Date(call.startedAt).getTime()) / 1000)
          : 0;

        await Call.findByIdAndUpdate(callId, {
          status: "ended",
          endedAt: new Date(),
          duration,
        });

        // Notify all call participants
        const allParticipants = [call.caller.toString(), ...call.receivers.map((r) => r.user.toString())];
        allParticipants.forEach((pid) => {
          io.to(`user_${pid}`).emit("call:ended", { callId, duration });
        });
      } catch (err) {
        socket.emit("error", { message: err.message });
      }
    });

    // WebRTC Signaling
    socket.on("webrtc:offer", ({ targetUserId, offer, callId }) => {
      io.to(`user_${targetUserId}`).emit("webrtc:offer", {
        offer,
        fromUserId: userId,
        callId,
      });
    });

    socket.on("webrtc:answer", ({ targetUserId, answer, callId }) => {
      io.to(`user_${targetUserId}`).emit("webrtc:answer", {
        answer,
        fromUserId: userId,
        callId,
      });
    });

    socket.on("webrtc:ice-candidate", ({ targetUserId, candidate, callId }) => {
      io.to(`user_${targetUserId}`).emit("webrtc:ice-candidate", {
        candidate,
        fromUserId: userId,
        callId,
      });
    });

    // Screen share toggle
    socket.on("call:screen-share", ({ callId, targetUserId, sharing }) => {
      io.to(`user_${targetUserId}`).emit("call:screen-share", {
        sharing,
        fromUserId: userId,
        callId,
      });
    });

    // ============================================================
    // ONLINE USERS
    // ============================================================
    socket.on("user:get-online", ({ userIds }) => {
      const onlineStatuses = {};
      userIds.forEach((id) => {
        onlineStatuses[id] = onlineUsers.has(id) && onlineUsers.get(id).size > 0;
      });
      socket.emit("user:online-statuses", onlineStatuses);
    });

    // ============================================================
    // DISCONNECT
    // ============================================================
    socket.on("disconnect", async () => {
      console.log(`🔌 Socket disconnected: ${socket.id} (User: ${userId})`);

      if (userId) {
        const sockets = onlineUsers.get(userId);
        if (sockets) {
          sockets.delete(socket.id);

          if (sockets.size === 0) {
            onlineUsers.delete(userId);

            // Update DB: offline
            await User.findByIdAndUpdate(userId, {
              isOnline: false,
              lastSeen: new Date(),
              socketId: "",
            });

            // Notify contacts
            io.emit("user:offline", { userId, lastSeen: new Date() });
          }
        }
      }
    });

    // ============================================================
    // ERROR HANDLER
    // ============================================================
    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  });

  console.log("✅ Socket.io initialized");
  return io;
};

module.exports = initializeSocket;
