import mongoose from 'mongoose';

const gmailConnectionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  encryptedAccessToken: { type: String, required: true, select: false },
  encryptedRefreshToken: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true },
  connectedAt: { type: Date, default: Date.now },
  revokedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model('GmailConnection', gmailConnectionSchema);
