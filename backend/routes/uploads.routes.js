//this file handles file uploads (images/videos), stores them in the right directory
//and retuens the file URL, it also contains the delete endpoint to remove files 

console.log("uploads.routes.js loaded");

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

//the allowed MIME types for images and videos
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

//allowed file extensions (as fallback when MIME type is unreliable)
const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov"];
const ALLOWED_EXTENSIONS = [...ALLOWED_IMAGE_EXTENSIONS, ...ALLOWED_VIDEO_EXTENSIONS];

//max file sizes (in bytes of course)
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for images
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB for videos

//configure the multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    //determine folder based on MIME type or extension
    const ext = path.extname(file.originalname).toLowerCase();
    let folder = "images";
    if (ALLOWED_VIDEO_TYPES.includes(file.mimetype) || ALLOWED_VIDEO_EXTENSIONS.includes(ext)) {
      folder = "videos";
    }
    
    const uploadPath = path.join(__dirname, "..", "uploads", folder);
    
    //ensure the directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    //generate unique filename with original extension
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

//file filter to validate allowed types
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeTypeValid = ALLOWED_TYPES.includes(file.mimetype);
  const extensionValid = ALLOWED_EXTENSIONS.includes(ext);
  
  if (mimeTypeValid || extensionValid) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: images (JPEG, PNG, GIF, WebP) and videos (MP4, WebM, MOV)`), false);
  }
};

//create multer upload middleware
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_VIDEO_SIZE, //use the larger limit, we will validate more specifically below
  },
});

//POST enpoint to upload a single file (image or video)
router.post("/", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.file;
    
    //additional size validation based on actual file type
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype) && file.size > MAX_IMAGE_SIZE) {
      // delete the uploaded file since it's too large
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: "Image file too large. Maximum size is 10MB." });
    }

    //determine media type based on MIME type or extension
    const ext = path.extname(file.originalname).toLowerCase();
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.mimetype) || ALLOWED_VIDEO_EXTENSIONS.includes(ext);
    const mediaType = isVideo ? "video" : "image";
    const folder = isVideo ? "videos" : "images";
    
    //build the URL path that can be used to access the file through the API object
    const fileUrl = `/uploads/${folder}/${file.filename}`;

    res.status(201).json({
      success: true,
      file: {
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        mediaType,
        url: fileUrl,
      },
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

//DELETE endpoint to delete an uploaded file
router.delete("/:filename", (req, res) => {
  const { filename } = req.params;
  
  //for security: prevent directory traversal by users
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return res.status(400).json({ error: "Invalid filename" });
  }

  //try to find and delete the file in both folders
  const imagePath = path.join(__dirname, "..", "uploads", "images", filename);
  const videoPath = path.join(__dirname, "..", "uploads", "videos", filename);

  let deleted = false;

  if (fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath);
    deleted = true;
  } else if (fs.existsSync(videoPath)) {
    fs.unlinkSync(videoPath);
    deleted = true;
  }

  if (deleted) {
    res.json({ success: true, message: "File deleted" });
  } else {
    res.status(404).json({ error: "File not found" });
  }
});

//error handling middleware for multer errors
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large. Maximum size is 100MB for videos and 10MB for images." });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

module.exports = router;
