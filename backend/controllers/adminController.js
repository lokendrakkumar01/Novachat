// ============================================================
// NovaChat - Admin Controller
// Dashboard analytics and management
// ============================================================
const User = require("../models/User");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const Group = require("../models/Group");
const Call = require("../models/Call");
const Story = require("../models/Story");
const Report = require("../models/Report");
const Notification = require("../models/Notification");

// Get dashboard analytics
const getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers, newUsersToday, newUsersThisWeek,
      onlineUsers, bannedUsers,
      totalMessages, messagesToday, messagesThisWeek,
      totalGroups, totalCalls, callsToday,
      activeStories, pendingReports, totalConversations,
    ] = await Promise.all([
      User.countDocuments({ isBanned: false }),
      User.countDocuments({ createdAt: { $gte: today }, isBanned: false }),
      User.countDocuments({ createdAt: { $gte: last7Days }, isBanned: false }),
      User.countDocuments({ isOnline: true }),
      User.countDocuments({ isBanned: true }),
      Message.countDocuments({ isDeleted: false }),
      Message.countDocuments({ createdAt: { $gte: today }, isDeleted: false }),
      Message.countDocuments({ createdAt: { $gte: last7Days }, isDeleted: false }),
      Group.countDocuments({ isActive: true }),
      Call.countDocuments(),
      Call.countDocuments({ createdAt: { $gte: today } }),
      Story.countDocuments({ expiresAt: { $gt: new Date() }, isActive: true }),
      Report.countDocuments({ status: "pending" }),
      Conversation.countDocuments({ isActive: true }),
    ]);

    // User growth over last 7 days
    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: last7Days } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Message activity over last 7 days
    const messageActivity = await Message.aggregate([
      { $match: { createdAt: { $gte: last7Days } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Call stats
    const callStats = await Call.aggregate([
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          avgDuration: { $avg: "$duration" },
        },
      },
    ]);

    // Top active users
    const topUsers = await User.find({ isBanned: false })
      .sort({ totalMessages: -1 })
      .limit(5)
      .select("username displayName avatar totalMessages isOnline");

    res.json({
      success: true,
      stats: {
        users: { total: totalUsers, today: newUsersToday, thisWeek: newUsersThisWeek, online: onlineUsers, banned: bannedUsers },
        messages: { total: totalMessages, today: messagesToday, thisWeek: messagesThisWeek },
        groups: { total: totalGroups },
        calls: { total: totalCalls, today: callsToday },
        stories: { active: activeStories },
        reports: { pending: pendingReports },
        conversations: { total: totalConversations },
      },
      charts: {
        userGrowth,
        messageActivity,
        callStats,
      },
      topUsers,
    });
  } catch (error) {
    next(error);
  }
};

// Get all users (paginated)
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, role, status } = req.query;
    const query = {};

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [{ username: regex }, { email: regex }, { displayName: regex }];
    }
    if (role) query.role = role;
    if (status === "banned") query.isBanned = true;
    else if (status === "online") query.isOnline = true;
    else if (status === "verified") query.isEmailVerified = true;

    const users = await User.find(query)
      .select("-password -refreshToken -emailOTP -phoneOTP")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({ success: true, users, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) {
    next(error);
  }
};

// Ban/Unban user
const toggleBanUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { ban, reason } = req.body;

    const user = await User.findByIdAndUpdate(userId, {
      isBanned: ban,
      banReason: ban ? (reason || "Banned by admin") : "",
    }, { new: true });

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Notify user via socket if online
    const io = req.app.get("io");
    if (io && ban) {
      io.to(`user_${userId}`).emit("account:banned", { reason: user.banReason });
    }

    res.json({ success: true, message: `User ${ban ? "banned" : "unbanned"}`, user });
  } catch (error) {
    next(error);
  }
};

// Verify user (blue tick)
const verifyUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { verified } = req.body;

    const user = await User.findByIdAndUpdate(userId, { isVerifiedAccount: verified }, { new: true });
    res.json({ success: true, message: `User ${verified ? "verified" : "unverified"}`, user });
  } catch (error) {
    next(error);
  }
};

// Delete user permanently
const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    await User.findByIdAndDelete(userId);
    res.json({ success: true, message: "User deleted permanently" });
  } catch (error) {
    next(error);
  }
};

// Get all reports
const getReports = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = {};
    if (status) query.status = status;

    const reports = await Report.find(query)
      .populate("reporter", "username displayName avatar")
      .populate("reportedUser", "username displayName avatar")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Report.countDocuments(query);
    res.json({ success: true, reports, total });
  } catch (error) {
    next(error);
  }
};

// Resolve report
const resolveReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const { status, action, reviewNote } = req.body;

    const report = await Report.findByIdAndUpdate(reportId, {
      status,
      action: action || "none",
      reviewNote,
      reviewedBy: req.user._id,
      resolvedAt: new Date(),
    }, { new: true });

    res.json({ success: true, report });
  } catch (error) {
    next(error);
  }
};

// Broadcast system notification to all users
const broadcastNotification = async (req, res, next) => {
  try {
    const { title, body } = req.body;

    const users = await User.find({ isBanned: false }).select("_id");
    const notifications = users.map((u) => ({
      recipient: u._id,
      type: "system",
      title,
      body,
      priority: "high",
    }));

    await Notification.insertMany(notifications);

    const io = req.app.get("io");
    if (io) {
      io.emit("notification:system", { title, body });
    }

    res.json({ success: true, message: `Notification sent to ${users.length} users` });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats, getAllUsers, toggleBanUser, verifyUser,
  deleteUser, getReports, resolveReport, broadcastNotification,
};
