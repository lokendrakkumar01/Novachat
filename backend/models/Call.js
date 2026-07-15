// ============================================================
// NovaChat - Call Schema / Model
// WebRTC call logs
// ============================================================
const mongoose = require("mongoose");

const callSchema = new mongoose.Schema(
  {
    // Participants
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receivers: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: {
          type: String,
          enum: ["ringing", "accepted", "rejected", "missed", "busy", "cancelled"],
          default: "ringing",
        },
        joinedAt: Date,
        leftAt: Date,
      },
    ],

    // Call Type
    type: {
      type: String,
      enum: ["voice", "video"],
      required: true,
    },
    callMode: {
      type: String,
      enum: ["private", "group"],
      default: "private",
    },

    // Associated conversation/group
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
    },

    // Call Status
    status: {
      type: String,
      enum: ["initiated", "ringing", "ongoing", "ended", "missed", "rejected", "cancelled"],
      default: "initiated",
    },

    // Timing
    startedAt: Date,
    endedAt: Date,
    duration: { type: Number, default: 0 }, // seconds

    // WebRTC
    offer: { type: Object }, // SDP offer
    answer: { type: Object }, // SDP answer
    iceCandidates: [Object],

    // Features used
    screenShared: { type: Boolean, default: false },
    recordingEnabled: { type: Boolean, default: false },
    recordingUrl: { type: String, default: "" },

    // End reason
    endReason: {
      type: String,
      enum: ["normal", "declined", "busy", "timeout", "network_error", "cancelled"],
      default: "normal",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

callSchema.index({ caller: 1, createdAt: -1 });
callSchema.index({ "receivers.user": 1 });
callSchema.index({ status: 1 });

callSchema.virtual("durationFormatted").get(function () {
  const m = Math.floor(this.duration / 60);
  const s = this.duration % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
});

const Call = mongoose.model("Call", callSchema);
module.exports = Call;
