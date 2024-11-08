const express = require("express");
const multer = require("multer");
const router = express.Router();
const messageController = require("../controllers/message.controller");

// Configure Multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Define article routes
router.post(
  "/question",
  upload.single("file"),
  messageController.handleQuestions
);
router.post("/content", messageController.handleContent);
router.post("/test", messageController.handleTest);
router.post("/test/generate", messageController.handleGenerateBook);

module.exports = router;
