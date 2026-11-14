import test from 'node:test';
import assert from 'node:assert/strict';
import EmailDraft from '../models/EmailDraft.js';
import Lead from '../models/Lead.js';
import { generateDraft, getDraft, getDrafts } from './emailDraftController.js';

const response = () => ({
  statusCode: null,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(value) { this.body = value; return this; }
});

test('retrieving a draft scopes the query to the authenticated owner', async () => {
  const originalFindOne = EmailDraft.findOne;
  let query;
  EmailDraft.findOne = async (value) => { query = value; return null; };
  try {
    const res = response();
    await getDraft({ params: { draftId: '507f1f77bcf86cd799439011' }, user: { _id: 'owner-1' } }, res);
    assert.deepEqual(query, { _id: '507f1f77bcf86cd799439011', userId: 'owner-1' });
    assert.equal(res.statusCode, 404);
  } finally {
    EmailDraft.findOne = originalFindOne;
  }
});

test('listing drafts always filters by the authenticated owner', async () => {
  const originalFind = EmailDraft.find;
  let query;
  EmailDraft.find = (value) => {
    query = value;
    return { sort: () => ({ limit: () => ({ lean: async () => [] }) }) };
  };
  try {
    const res = response();
    await getDrafts({ query: {}, user: { _id: 'owner-2' } }, res);
    assert.deepEqual(query, { userId: 'owner-2' });
    assert.equal(res.statusCode, 200);
  } finally {
    EmailDraft.find = originalFind;
  }
});

test('draft generation looks up a lead only within the authenticated owner and does not call AI for a foreign lead', async () => {
  const originalFindOne = Lead.findOne;
  let query;
  Lead.findOne = async (value) => { query = value; return null; };
  try {
    const res = response();
    await generateDraft({
      body: { leadId: '507f1f77bcf86cd799439011' },
      user: { _id: 'owner-3' }
    }, res);
    assert.deepEqual(query, { _id: '507f1f77bcf86cd799439011', userId: 'owner-3' });
    assert.equal(res.statusCode, 404);
  } finally {
    Lead.findOne = originalFindOne;
  }
});

test('draft generation rejects do-not-contact leads before generation or persistence', async () => {
  const originalFindOne = Lead.findOne;
  const originalCreate = EmailDraft.create;
  let createCalled = false;
  Lead.findOne = async () => ({ doNotContact: true, leadStatus: 'ready_for_contact' });
  EmailDraft.create = async () => { createCalled = true; };
  try {
    const res = response();
    await generateDraft({ body: { leadId: '507f1f77bcf86cd799439011' }, user: { _id: 'owner-4' } }, res);
    assert.equal(res.statusCode, 409);
    assert.equal(createCalled, false);
  } finally {
    Lead.findOne = originalFindOne;
    EmailDraft.create = originalCreate;
  }
});

test('draft generation rejects do-not-contact status even when the flag is false', async () => {
  const originalFindOne = Lead.findOne;
  const originalCreate = EmailDraft.create;
  let createCalled = false;
  Lead.findOne = async () => ({ doNotContact: false, leadStatus: 'do_not_contact' });
  EmailDraft.create = async () => { createCalled = true; };
  try {
    const res = response();
    await generateDraft({ body: { leadId: '507f1f77bcf86cd799439011' }, user: { _id: 'owner-5' } }, res);
    assert.equal(res.statusCode, 409);
    assert.equal(createCalled, false);
  } finally {
    Lead.findOne = originalFindOne;
    EmailDraft.create = originalCreate;
  }
});

test('mock generation persists through the normal EmailDraft creation workflow', async () => {
  const originalFindOne = Lead.findOne;
  const originalCreate = EmailDraft.create;
  const previousProvider = process.env.EMAIL_DRAFT_PROVIDER;
  const previousNodeEnv = process.env.NODE_ENV;
  const leadId = '507f1f77bcf86cd799439011';
  let saved;
  process.env.EMAIL_DRAFT_PROVIDER = 'mock';
  process.env.NODE_ENV = 'development';
  Lead.findOne = async () => ({
    _id: leadId,
    businessName: 'Harbor Cafe',
    opportunityReasons: ['Accessibility improvements could help visitors'],
    doNotContact: false,
    leadStatus: 'ready_for_contact'
  });
  EmailDraft.create = async (value) => { saved = value; return value; };
  try {
    const res = response();
    await generateDraft({
      body: { leadId },
      user: { _id: 'owner-6', name: 'Alex', skills: ['Web design'], services: ['Accessibility review'] }
    }, res);
    assert.equal(res.statusCode, 201);
    assert.equal(saved.userId, 'owner-6');
    assert.equal(saved.leadId, leadId);
    assert.equal(saved.status, 'draft');
    assert.match(saved.subject, /^\[SAMPLE\]/);
    assert.match(saved.body, /This email has not been sent/);
    assert.equal(res.body.draft, saved);
  } finally {
    Lead.findOne = originalFindOne;
    EmailDraft.create = originalCreate;
    if (previousProvider === undefined) delete process.env.EMAIL_DRAFT_PROVIDER;
    else process.env.EMAIL_DRAFT_PROVIDER = previousProvider;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});
