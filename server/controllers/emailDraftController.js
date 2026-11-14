import mongoose from 'mongoose';
import EmailDraft from '../models/EmailDraft.js';
import Lead from '../models/Lead.js';
import { generateEmailDraft } from '../services/emailDraftGenerationService.js';

const validId = (value) => mongoose.isValidObjectId(value);

const logGenerationFailure = (error) => {
  // Keep request content, API credentials, and provider error bodies out of logs.
  console.error('Email draft generation failed', {
    name: error.name,
    status: error.status,
    requestId: error.requestID
  });
};

export const generateDraft = async (req, res) => {
  try {
    const lead = await Lead.findOne({
      _id: req.body.leadId,
      userId: req.user._id
    });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    if (lead.doNotContact || lead.leadStatus === 'do_not_contact') {
      return res.status(409).json({ success: false, message: 'Draft generation is disabled for this lead' });
    }

    const generated = await generateEmailDraft(lead, req.user);
    const draft = await EmailDraft.create({
      userId: req.user._id,
      leadId: lead._id,
      ...generated,
      status: 'draft'
    });

    return res.status(201).json({
      success: true,
      message: 'Email draft generated. Review and edit it before use.',
      draft
    });
  } catch (error) {
    logGenerationFailure(error);
    const status = error.statusCode === 503 ? 503 : 502;
    return res.status(status).json({
      success: false,
      message: status === 503
        ? error.message
        : 'Email draft generation failed. Please try again later.'
    });
  }
};

export const getDrafts = async (req, res) => {
  const filter = { userId: req.user._id };
  if (req.query.leadId) {
    if (!validId(req.query.leadId)) {
      return res.status(400).json({ success: false, message: 'Invalid lead ID' });
    }
    filter.leadId = req.query.leadId;
  }

  const drafts = await EmailDraft.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  return res.status(200).json({ success: true, drafts });
};

export const getDraft = async (req, res) => {
  const draft = await EmailDraft.findOne({ _id: req.params.draftId, userId: req.user._id });
  if (!draft) return res.status(404).json({ success: false, message: 'Draft not found' });
  return res.status(200).json({ success: true, draft });
};

export const updateDraft = async (req, res) => {
  if (!validId(req.params.draftId)) {
    return res.status(400).json({ success: false, message: 'Invalid draft ID' });
  }
  const updates = {};
  for (const field of ['subject', 'body']) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) updates[field] = req.body[field];
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ success: false, message: 'Provide a subject or body to update' });
  }

  const draft = await EmailDraft.findOneAndUpdate(
    { _id: req.params.draftId, userId: req.user._id, status: 'draft' },
    { $set: updates },
    { new: true, runValidators: true }
  );
  if (!draft) return res.status(404).json({ success: false, message: 'Draft not found' });
  return res.status(200).json({ success: true, message: 'Draft updated', draft });
};

export const deleteDraft = async (req, res) => {
  if (!validId(req.params.draftId)) {
    return res.status(400).json({ success: false, message: 'Invalid draft ID' });
  }
  const draft = await EmailDraft.findOneAndDelete({
    _id: req.params.draftId,
    userId: req.user._id,
    status: 'draft'
  });
  if (!draft) return res.status(404).json({ success: false, message: 'Draft not found' });
  return res.status(200).json({ success: true, message: 'Draft deleted' });
};
