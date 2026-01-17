const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  duration: Number,
  scores: {
    confidence: Number,
    attention: Number,
    stability: Number,
    smoothness: Number,
    audioConfidence: Number, // Avg vocal confidence
    answerQuality: Number    // AI Graded Score
  }
});

module.exports = mongoose.model('Interview', interviewSchema);