import crypto from 'node:crypto';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Lead from '../models/Lead.js';
import EmailDraft from '../models/EmailDraft.js';
import GmailConnection from '../models/GmailConnection.js';
import { createOAuthUrl, decryptToken, encryptToken, exchangeCode, sendGmailMessage, stateDigest } from '../services/gmailService.js';

const safeError = (res, error, fallback = 'Gmail request failed') => {
  const status = [400, 401, 404, 409, 503].includes(error.statusCode) ? error.statusCode : 502;
  return res.status(status).json({ success: false, message: status === 502 ? fallback : error.message });
};

export const connectGmail = async (req, res) => {
  try {
    const state = crypto.randomBytes(32).toString('base64url');
    const updated = await User.findByIdAndUpdate(req.user._id, {
      $set: { gmailOAuthStateHash: stateDigest(state), gmailOAuthStateExpiresAt: new Date(Date.now() + 10 * 60 * 1000) }
    });
    if (!updated) return res.status(404).json({ success: false, message: 'User not found' });
    return res.status(200).json({ success: true, authorizationUrl: createOAuthUrl(state), expiresInSeconds: 600 });
  } catch (error) { return safeError(res, error, 'Unable to start Gmail connection'); }
};

export const gmailCallback = async (req, res) => {
  const redirect = (result) => res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/gmail?gmail=${result}`);
  try {
    if (!req.query.code || !req.query.state || req.query.error) return redirect('failed');
    const user = await User.findOneAndUpdate({ gmailOAuthStateHash: stateDigest(req.query.state), gmailOAuthStateExpiresAt: { $gt: new Date() } },
      { $unset: { gmailOAuthStateHash: 1, gmailOAuthStateExpiresAt: 1 } }, { new: true });
    if (!user) return redirect('failed');
    const tokens = await exchangeCode(req.query.code);
    if (!tokens.access_token || !tokens.refresh_token) return redirect('failed');
    const configKey = Buffer.from(process.env.GMAIL_TOKEN_ENCRYPTION_KEY, 'hex');
    await GmailConnection.findOneAndUpdate({ userId: user._id }, {
      $set: { encryptedAccessToken: encryptToken(tokens.access_token, configKey), encryptedRefreshToken: encryptToken(tokens.refresh_token, configKey),
        expiresAt: new Date(Date.now() + (tokens.expires_in || 3600) * 1000), connectedAt: new Date(), revokedAt: null }
    }, { upsert: true, new: true, runValidators: true });
    return redirect('connected');
  } catch { return redirect('failed'); }
};

export const gmailStatus = async (req, res) => {
  const connection = await GmailConnection.findOne({ userId: req.user._id }).select('connectedAt revokedAt expiresAt').lean();
  return res.status(200).json({ success: true, connected: Boolean(connection && !connection.revokedAt),
    connectedAt: connection?.connectedAt || null, reconnectRequired: Boolean(connection?.revokedAt) });
};

export const disconnectGmail = async (req, res) => {
  await GmailConnection.deleteOne({ userId: req.user._id });
  await User.updateOne({ _id: req.user._id }, { $unset: { gmailOAuthStateHash: 1, gmailOAuthStateExpiresAt: 1 } });
  return res.status(200).json({ success: true, message: 'Gmail disconnected' });
};

export const sendDraft = async (req, res, dependencies = {}) => {
  if (req.body.approved !== true) return res.status(400).json({ success: false, message: 'Explicit approval is required to send this draft' });
  if (!mongoose.isValidObjectId(req.params.draftId)) return res.status(400).json({ success: false, message: 'Invalid draft ID' });
  let draft;
  try {
    draft = await EmailDraft.findOne({ _id: req.params.draftId, userId: req.user._id, status: 'draft' });
    if (!draft) return res.status(404).json({ success: false, message: 'Draft not found or already sent' });
    if (draft.isSample || /\[sample(?: draft)?\]/i.test(`${draft.subject || ''}\n${draft.body || ''}`)) {
      return res.status(409).json({ success: false, message: 'Development sample drafts cannot be sent' });
    }
    const lead = await Lead.findOne({ _id: draft.leadId, userId: req.user._id });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    if (lead.doNotContact || lead.leadStatus === 'do_not_contact') return res.status(409).json({ success: false, message: 'This lead is marked do-not-contact' });
    const recipient = String(lead.businessEmail || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) || recipient.length > 254) return res.status(400).json({ success: false, message: 'Lead needs a valid recipient email address' });
    const connection = await GmailConnection.findOne({ userId: req.user._id, revokedAt: null }).select('+encryptedAccessToken +encryptedRefreshToken');
    if (!connection) return res.status(409).json({ success: false, message: 'Gmail is disconnected. Connect an account before sending.' });
    const claimed = await EmailDraft.findOneAndUpdate({ _id: draft._id, userId: req.user._id, status: 'draft' }, { $set: { status: 'sending' } }, { new: true });
    if (!claimed) return res.status(409).json({ success: false, message: 'Draft is already being sent or was sent' });
    try {
      const gmailMessageId = await (dependencies.sendGmailMessage || sendGmailMessage)({ connection, draft: { ...draft.toObject(), recipient } });
      const sentAt = new Date();
      await EmailDraft.updateOne({ _id: draft._id, userId: req.user._id, status: 'sending' }, { $set: { status: 'sent', gmailMessageId, sentAt } });
      await Lead.updateOne({ _id: lead._id, userId: req.user._id }, { $set: { lastContactedAt: sentAt, leadStatus: 'contacted' } });
      return res.status(200).json({ success: true, message: 'Approved draft sent', draftId: String(draft._id), gmailMessageId, sentAt });
    } catch (error) {
      // Keep the claim on uncertain provider failures to prevent an accidental duplicate send.
      if (error.statusCode === 400 || error.statusCode === 401 || error.statusCode === 403) {
        await EmailDraft.updateOne({ _id: draft._id, userId: req.user._id, status: 'sending' }, { $set: { status: 'send_failed' } });
      }
      if (error.statusCode === 401) await GmailConnection.updateOne({ userId: req.user._id }, { $set: { revokedAt: new Date() } });
      return safeError(res, error, 'Gmail could not send the approved draft');
    }
  } catch (error) { return safeError(res, error); }
};
