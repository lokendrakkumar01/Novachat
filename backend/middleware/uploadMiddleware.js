// ============================================================
// NovaChat - Resilient Upload Middleware (Multer + Local Fallback)
// ============================================================
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { uploadToCloudinary } = require("../config/cloudinary");

// Ensure local uploads directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Local disk storage engine
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/mov", "video/avi", "video/mkv", "video/webm"];
const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/aac", "audio/webm"];
const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-rar-compressed",
  "text/plain",
];

const ALL_ALLOWED = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_AUDIO_TYPES, ...ALLOWED_DOC_TYPES];

// File filter factory
const fileFilterFactory = (allowedTypes) => (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

// Process file upload and attempt Cloudinary upload, fallback to local path on error
const processUploadedFile = async (req, file) => {
  if (!file) return;

  // Determine Cloudinary resource type
  let resourceType = "raw";
  if (file.mimetype.startsWith("image/")) {
    resourceType = "image";
  } else if (file.mimetype.startsWith("video/")) {
    resourceType = "video";
  } else if (file.mimetype.startsWith("audio/")) {
    resourceType = "video"; // Cloudinary treats audio as video
  }

  try {
    // Attempt to upload to Cloudinary
    const result = await uploadToCloudinary(file.path, {
      folder: "novachat",
      resource_type: resourceType,
    });

    // Delete local file on successful Cloudinary upload
    fs.unlink(file.path, () => {});

    // Overwrite parameters with Cloudinary results
    file.path = result.secure_url;
    file.filename = result.public_id;
  } catch (error) {
    console.warn("⚠️ Cloudinary upload failed, falling back to local file storage:", error.message);
    
    // Serve file locally from local Express server uploads folder
    const host = req.get("host") || "localhost:5000";
    const protocol = req.protocol || "http";
    
    // Convert local filepath to web URL
    file.path = `${protocol}://${host}/uploads/${file.filename}`;
    file.filename = `local-${file.filename}`;
  }
};

// Multer error handling wrapper + Cloudinary fallback processor
const handleUploadError = (uploadFn) => (req, res, next) => {
  uploadFn(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    // Process files
    try {
      if (req.file) {
        await processUploadedFile(req, req.file);
      }
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          await processUploadedFile(req, file);
        }
      }
      next();
    } catch (uploadError) {
      next(uploadError);
    }
  });
};

// ===== Profile avatar upload =====
const uploadProfileAvatar = multer({
  storage: diskStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilterFactory(ALLOWED_IMAGE_TYPES),
}).single("avatar");

// ===== Cover image upload =====
const uploadCoverImage = multer({
  storage: diskStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilterFactory(ALLOWED_IMAGE_TYPES),
}).single("coverImage");

// ===== Chat media upload =====
const uploadChatMedia = multer({
  storage: diskStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: fileFilterFactory(ALL_ALLOWED),
}).single("media");

// ===== Multiple images upload =====
const uploadMultipleMedia = multer({
  storage: diskStorage,
  limits: { fileSize: 100 * 1024 * 1024, files: 10 },
  fileFilter: fileFilterFactory(ALL_ALLOWED),
}).array("media", 10);

// ===== Story upload =====
const uploadStoryMedia = multer({
  storage: diskStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: fileFilterFactory([...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES]),
}).single("media");

// ===== Group/Channel avatar =====
const uploadGroupAvatar = multer({
  storage: diskStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilterFactory(ALLOWED_IMAGE_TYPES),
}).single("avatar");

module.exports = {
  uploadProfileAvatar: handleUploadError(uploadProfileAvatar),
  uploadCoverImage: handleUploadError(uploadCoverImage),
  uploadChatMedia: handleUploadError(uploadChatMedia),
  uploadMultipleMedia: handleUploadError(uploadMultipleMedia),
  uploadStoryMedia: handleUploadError(uploadStoryMedia),
  uploadGroupAvatar: handleUploadError(uploadGroupAvatar),
};
