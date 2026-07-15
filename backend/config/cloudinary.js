// ============================================================
// NovaChat - Cloudinary Configuration
// ============================================================
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const initCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  console.log("✅ Cloudinary initialized");
};

// Storage for profile images
const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "novachat/profiles",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
    transformation: [{ width: 400, height: 400, crop: "fill", quality: "auto" }],
    format: "webp",
  },
});

// Storage for cover images
const coverStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "novachat/covers",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1200, height: 400, crop: "fill", quality: "auto" }],
    format: "webp",
  },
});

// Storage for chat media
const mediaStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isVideo = file.mimetype.startsWith("video/");
    const isAudio = file.mimetype.startsWith("audio/");
    const isImage = file.mimetype.startsWith("image/");

    let folder = "novachat/media/documents";
    let resourceType = "raw";
    let transformation = [];

    if (isVideo) {
      folder = "novachat/media/videos";
      resourceType = "video";
      transformation = [{ quality: "auto", fetch_format: "auto" }];
    } else if (isAudio) {
      folder = "novachat/media/audio";
      resourceType = "video"; // Cloudinary treats audio as video
    } else if (isImage) {
      folder = "novachat/media/images";
      resourceType = "image";
      transformation = [{ quality: "auto", fetch_format: "auto" }];
    }

    return {
      folder,
      resource_type: resourceType,
      transformation,
      allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "mp4", "mov", "avi", "mp3", "wav", "ogg", "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "zip", "rar"],
    };
  },
});

// Storage for stories
const storyStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isVideo = file.mimetype.startsWith("video/");
    return {
      folder: "novachat/stories",
      resource_type: isVideo ? "video" : "image",
      transformation: isVideo
        ? [{ quality: "auto" }]
        : [{ width: 1080, quality: "auto", fetch_format: "auto" }],
    };
  },
});

// Storage for group/channel avatars
const groupStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "novachat/groups",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 200, height: 200, crop: "fill", quality: "auto" }],
    format: "webp",
  },
});

// Upload directly to cloudinary (for large files)
const uploadToCloudinary = async (filePath, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      ...options,
      secure: true,
    });
    return result;
  } catch (error) {
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};

// Delete from cloudinary
const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error("Cloudinary delete error:", error.message);
  }
};

module.exports = {
  cloudinary,
  initCloudinary,
  profileStorage,
  coverStorage,
  mediaStorage,
  storyStorage,
  groupStorage,
  uploadToCloudinary,
  deleteFromCloudinary,
};
