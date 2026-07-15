// ============================================================
// NovaChat - Remaining Backend Routes
// Story, Group, Channel, Call, Notification, Admin, AI, Upload
// ============================================================

// --- Story Routes ---
const express = require("express");
const storyRouter = express.Router();
const { createStory, getStoriesFeed, getMyStories, viewStory, reactToStory, replyToStory, deleteStory } = require("../controllers/storyController");
const { protect } = require("../middleware/authMiddleware");
const { uploadStoryMedia } = require("../middleware/uploadMiddleware");

storyRouter.use(protect);
storyRouter.get("/feed", getStoriesFeed);
storyRouter.get("/mine", getMyStories);
storyRouter.post("/", uploadStoryMedia, createStory);
storyRouter.post("/:storyId/view", viewStory);
storyRouter.post("/:storyId/react", reactToStory);
storyRouter.post("/:storyId/reply", replyToStory);
storyRouter.delete("/:storyId", deleteStory);

module.exports = storyRouter;
