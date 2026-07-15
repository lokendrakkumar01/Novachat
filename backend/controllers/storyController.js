// ============================================================
// NovaChat - Story Controller
// WhatsApp/Instagram style stories with 24hr expiry
// ============================================================
const Story = require("../models/Story");
const User = require("../models/User");

// Create a story
const createStory = async (req, res, next) => {
  try {
    const { type, caption, visibility, text, link } = req.body;
    const userId = req.user._id;

    const storyData = { author: userId, type, caption, visibility, link };

    if (type === "text") {
      storyData.text = typeof text === "string" ? JSON.parse(text) : text;
    } else if (req.file) {
      storyData.media = {
        url: req.file.path,
        publicId: req.file.filename,
        thumbnail: req.file.path,
      };
    }

    const story = await Story.create(storyData);
    await story.populate("author", "username displayName avatar isVerifiedAccount");

    res.status(201).json({ success: true, story });
  } catch (error) {
    next(error);
  }
};

// Get stories feed (all active stories from contacts)
const getStoriesFeed = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).populate("contacts", "_id");
    const contactIds = user.contacts.map((c) => c._id);

    // Get stories from contacts + own stories
    const authorIds = [...contactIds, userId];

    const stories = await Story.find({
      author: { $in: authorIds },
      expiresAt: { $gt: new Date() },
      isActive: true,
      hiddenFrom: { $ne: userId },
    })
      .populate("author", "username displayName avatar isOnline isVerifiedAccount")
      .sort({ createdAt: -1 });

    // Group by author
    const grouped = {};
    stories.forEach((story) => {
      const authorId = story.author._id.toString();
      if (!grouped[authorId]) {
        grouped[authorId] = {
          author: story.author,
          stories: [],
          hasUnviewed: false,
        };
      }
      const hasViewed = story.views.some((v) => v.user.toString() === userId.toString());
      grouped[authorId].stories.push({ ...story.toObject(), hasViewed });
      if (!hasViewed) grouped[authorId].hasUnviewed = true;
    });

    res.json({ success: true, stories: Object.values(grouped) });
  } catch (error) {
    next(error);
  }
};

// Get own stories
const getMyStories = async (req, res, next) => {
  try {
    const stories = await Story.find({
      author: req.user._id,
      expiresAt: { $gt: new Date() },
      isActive: true,
    })
      .populate("views.user", "username displayName avatar")
      .populate("reactions.user", "username displayName avatar")
      .sort({ createdAt: -1 });

    res.json({ success: true, stories });
  } catch (error) {
    next(error);
  }
};

// View a story
const viewStory = async (req, res, next) => {
  try {
    const { storyId } = req.params;
    const userId = req.user._id;

    await Story.findByIdAndUpdate(storyId, {
      $addToSet: { views: { user: userId, viewedAt: new Date() } },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// React to story
const reactToStory = async (req, res, next) => {
  try {
    const { storyId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ success: false, message: "Story not found" });

    story.reactions = story.reactions.filter((r) => r.user.toString() !== userId.toString());
    if (emoji) story.reactions.push({ user: userId, emoji, reactedAt: new Date() });
    await story.save();

    // Notify story author via socket
    const io = req.app.get("io");
    if (io && story.author.toString() !== userId.toString()) {
      io.to(`user_${story.author}`).emit("story:reaction", {
        storyId,
        fromUserId: userId,
        emoji,
      });
    }

    res.json({ success: true, reactions: story.reactions });
  } catch (error) {
    next(error);
  }
};

// Reply to story
const replyToStory = async (req, res, next) => {
  try {
    const { storyId } = req.params;
    const { message } = req.body;
    const userId = req.user._id;

    const story = await Story.findByIdAndUpdate(storyId, {
      $push: { replies: { user: userId, message, repliedAt: new Date() } },
    }, { new: true });

    const io = req.app.get("io");
    if (io) {
      io.to(`user_${story.author}`).emit("story:reply", {
        storyId,
        fromUserId: userId,
        message,
      });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// Delete story
const deleteStory = async (req, res, next) => {
  try {
    const { storyId } = req.params;
    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ success: false, message: "Story not found" });
    if (story.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    story.isActive = false;
    await story.save();

    res.json({ success: true, message: "Story deleted" });
  } catch (error) {
    next(error);
  }
};

module.exports = { createStory, getStoriesFeed, getMyStories, viewStory, reactToStory, replyToStory, deleteStory };
