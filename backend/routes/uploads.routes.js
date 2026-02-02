//this file handles file uploads (images/videos), stores them in the right directory
//and retuens the file URL, it also contains the delete endpoint to remove files 

console.log("uploads.routes.js loaded");

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

// ... (Constants remain the same) ...
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov"];
const ALLOWED_EXTENSIONS = [...ALLOWED_IMAGE_EXTENSIONS, ...ALLOWED_VIDEO_EXTENSIONS];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    let folder = "images";
    if (ALLOWED_VIDEO_TYPES.includes(file.mimetype) || ALLOWED_VIDEO_EXTENSIONS.includes(ext)) {
      folder = "videos";
    }
    const uploadPath = path.join(__dirname, "..", "uploads", folder);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeTypeValid = ALLOWED_TYPES.includes(file.mimetype);
  const extensionValid = ALLOWED_EXTENSIONS.includes(ext);
  
  if (mimeTypeValid || extensionValid) {
    cb(null, true);
  } else {
    const error = new Error(`Invalid file type. Allowed types: images (JPEG, PNG, GIF, WebP) and videos (MP4, WebM, MOV)`);
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_VIDEO_SIZE, // Set to the largest possible size
  },
});

router.post("/", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      // This will catch LIMIT_FILE_SIZE and INVALID_FILE_TYPE from multer
      return next(err);
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.file;

    // After upload, manually check if an image exceeds the image-specific size limit
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype) && file.size > MAX_IMAGE_SIZE) {
      if (file.path) { // If using diskStorage, a file was created
        fs.unlinkSync(file.path); // Clean up the oversized file
      }
      // Return a specific error for oversized images
      return res.status(400).json({ error: "Image file too large. Maximum size is 10MB." });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.mimetype) || ALLOWED_VIDEO_EXTENSIONS.includes(ext);
    const mediaType = isVideo ? "video" : "image";
    const folder = isVideo ? "videos" : "images";

    const filename = file.filename || `${uuidv4()}${ext}`;
    const fileUrl = `/uploads/${folder}/${filename}`;

    res.status(201).json({
      success: true,
      file: {
        filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        mediaType,
        url: fileUrl,
      },
    });
  });
});

// Final error handling middleware for the router
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large. Maximum size is 100MB for videos and 10MB for images." });
    }
    return res.status(400).json({ error: `File upload error: ${err.message}` });
  }
  if (err && err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    console.error("Unhandled error in uploads route:", err);
    return res.status(500).json({ error: "An unexpected error occurred during upload." });
  }
  next();
});

module.exports = router;