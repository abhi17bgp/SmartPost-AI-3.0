const mongoose = require('mongoose');

const tokenBlacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // MongoDB TTL index - auto-delete expired tokens
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const TokenBlacklist = mongoose.model('TokenBlacklist', tokenBlacklistSchema);
module.exports = TokenBlacklist;
