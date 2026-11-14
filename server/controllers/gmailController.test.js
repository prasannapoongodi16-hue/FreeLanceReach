import test from 'node:test';
import assert from 'node:assert/strict';
import EmailDraft from '../models/EmailDraft.js';
import GmailConnection from '../models/GmailConnection.js';
import Lead from '../models/Lead.js';
import { sendDraft } from './gmailController.js';

const draftId = '507f1f77bcf86cd799439011';
const res = () => ({ statusCode: 0, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

const replace = (object, key, value, restore) => { restore.push([object, key, object[key]]); object[key] = value; };

test('send requires explicit approval before reading a draft or calling Gmail', async () => {
  const restore = [];
  let lookedUp = false;
  replace(EmailDraft, 'findOne', async () => { lookedUp = true; }, restore);
  try {
    const response = res();
    await sendDraft({ body: { approved: false }, params: { draftId }, user: { _id: 'owner-1' } }, response);
    assert.equal(response.statusCode, 400);
    assert.equal(lookedUp, false);
  } finally { restore.forEach(([o, k, v]) => { o[k] = v; }); }
});

test('send lookup is owner scoped and foreign draft cannot reach Gmail', async () => {
  const restore = [];
  let query;
  let sent = false;
  replace(EmailDraft, 'findOne', async (value) => { query = value; return null; }, restore);
  try {
    const response = res();
    await sendDraft({ body: { approved: true }, params: { draftId }, user: { _id: 'owner-2' } }, response,
      { sendGmailMessage: async () => { sent = true; } });
    assert.deepEqual(query, { _id: draftId, userId: 'owner-2', status: 'draft' });
    assert.equal(response.statusCode, 404);
    assert.equal(sent, false);
  } finally { restore.forEach(([o, k, v]) => { o[k] = v; }); }
});

test('disconnected or revoked Gmail account prevents sending', async () => {
  const restore = [];
  const draft = { _id: draftId, leadId: 'lead-1', toObject: () => ({ subject: 'Hello', body: 'Hi' }) };
  replace(EmailDraft, 'findOne', async () => draft, restore);
  replace(Lead, 'findOne', async () => ({ _id: 'lead-1', businessEmail: 'client@example.com', doNotContact: false }), restore);
  replace(GmailConnection, 'findOne', () => ({ select: async () => null }), restore);
  try {
    const response = res();
    await sendDraft({ body: { approved: true }, params: { draftId }, user: { _id: 'owner-3' } }, response);
    assert.equal(response.statusCode, 409);
    assert.match(response.body.message, /Gmail is disconnected/);
  } finally { restore.forEach(([o, k, v]) => { o[k] = v; }); }
});

test('atomic draft claim prevents duplicate sends', async () => {
  const restore = [];
  const draft = { _id: draftId, leadId: 'lead-2', toObject: () => ({ subject: 'Hello', body: 'Hi' }) };
  let gmailCalled = false;
  replace(EmailDraft, 'findOne', async () => draft, restore);
  replace(EmailDraft, 'findOneAndUpdate', async () => null, restore);
  replace(Lead, 'findOne', async () => ({ _id: 'lead-2', businessEmail: 'client@example.com', doNotContact: false }), restore);
  replace(GmailConnection, 'findOne', () => ({ select: async () => ({}) }), restore);
  try {
    const response = res();
    await sendDraft({ body: { approved: true }, params: { draftId }, user: { _id: 'owner-4' } }, response,
      { sendGmailMessage: async () => { gmailCalled = true; } });
    assert.equal(response.statusCode, 409);
    assert.equal(gmailCalled, false);
  } finally { restore.forEach(([o, k, v]) => { o[k] = v; }); }
});

test('approved owner draft sends once and records Gmail ID and sent timestamp', async () => {
  const restore = [];
  const draft = { _id: draftId, leadId: 'lead-3', subject: 'Hello', body: 'Hi', toObject() { return { subject: this.subject, body: this.body }; } };
  let updatedDraft;
  let updatedLead;
  replace(EmailDraft, 'findOne', async () => draft, restore);
  replace(EmailDraft, 'findOneAndUpdate', async () => draft, restore);
  replace(EmailDraft, 'updateOne', async (filter, update) => { updatedDraft = { filter, update }; }, restore);
  replace(Lead, 'findOne', async () => ({ _id: 'lead-3', businessEmail: 'CLIENT@example.com', doNotContact: false, leadStatus: 'new' }), restore);
  replace(Lead, 'updateOne', async (filter, update) => { updatedLead = { filter, update }; }, restore);
  replace(GmailConnection, 'findOne', () => ({ select: async () => ({}) }), restore);
  let sentDraft;
  try {
    const response = res();
    await sendDraft({ body: { approved: true }, params: { draftId }, user: { _id: 'owner-5' } }, response,
      { sendGmailMessage: async (args) => { sentDraft = args.draft; return 'gmail-message-123'; } });
    assert.equal(response.statusCode, 200);
    assert.equal(sentDraft.recipient, 'client@example.com');
    assert.equal(updatedDraft.update.$set.status, 'sent');
    assert.equal(updatedDraft.update.$set.gmailMessageId, 'gmail-message-123');
    assert.ok(updatedDraft.update.$set.sentAt instanceof Date);
    assert.equal(updatedLead.update.$set.leadStatus, 'contacted');
    assert.equal(response.body.gmailMessageId, 'gmail-message-123');
  } finally { restore.forEach(([o, k, v]) => { o[k] = v; }); }
});
