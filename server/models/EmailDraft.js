import mongoose from 'mongoose';

const emailDraftSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 200
    },
    body: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 8000
    },
    isSample: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['draft', 'sending', 'sent', 'send_failed'],
      default: 'draft',
      required: true
    },
    gmailMessageId: { type: String, default: null },
    sentAt: { type: Date, default: null }
  },
  { timestamps: true }
);

emailDraftSchema.index({ userId: 1, createdAt: -1 });
emailDraftSchema.index({ userId: 1, leadId: 1, createdAt: -1 });

const EmailDraft = mongoose.model('EmailDraft', emailDraftSchema);

export default EmailDraft;
