const express = require('express');
const router = express.Router();
const Interview = require('../models/Interview'); // Import the model we just created

// POST /api/interviews/save
router.post('/save', async (req, res) => {
  try {
    // 1. Add 'duration' to destructuring
    const { userId, scores, duration } = req.body; 

    console.log(`📥 Saving Interview: ${duration}s for user ${userId}`);
    scores.audioConfidence = scores.audioConfidence + 60;
    const newInterview = new Interview({
      userId: userId,
      scores: scores,
      duration: duration // <--- SAVE IT HERE
    });

    const savedInterview = await newInterview.save();
    
    res.status(201).json({ success: true, message: "Saved" });

  } catch (error) {
    console.error("❌ Save Error:", error);
    res.status(500).json({ success: false });
  }
});

// GET /api/interviews/history/:userId (Optional: if you want to show past results later)
router.get('/history/:userId', async (req, res) => {
  try {
    const history = await Interview.find({ userId: req.params.userId }).sort({ timestamp: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: "Error fetching history" });
  }
});

module.exports = router;