import test from 'node:test';
import assert from 'node:assert/strict';
import Lead from '../models/Lead.js';
import { getLeads, updateLead } from './leadController.js';

const response = () => ({
  statusCode: null,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(value) { this.body = value; return this; }
});

test('lead search is owner-scoped, escapes regex characters, and returns bounded pagination', async () => {
  const originalFind = Lead.find;
  const originalCountDocuments = Lead.countDocuments;
  let query;
  let countQuery;
  let skip;
  let limit;
  Lead.find = (value) => {
    query = value;
    return {
      sort: () => ({
        skip: (value) => {
          skip = value;
          return { limit: (pageLimit) => { limit = pageLimit; return { lean: async () => [] }; } };
        }
      })
    };
  };
  Lead.countDocuments = async (value) => { countQuery = value; return 0; };
  try {
    const res = response();
    await getLeads({
      query: { search: 'a+b', status: 'new', priority: 'high', category: 'design', page: '3', limit: '500' },
      user: { _id: 'owner-1' }
    }, res);
    assert.deepEqual(query, {
      userId: 'owner-1',
      leadStatus: 'new',
      priority: 'high',
      category: { $regex: 'design', $options: 'i' },
      $or: [
        { businessName: { $regex: 'a\\+b', $options: 'i' } },
        { category: { $regex: 'a\\+b', $options: 'i' } },
        { location: { $regex: 'a\\+b', $options: 'i' } }
      ]
    });
    assert.deepEqual(countQuery, query);
    assert.equal(skip, 100);
    assert.equal(limit, 50);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.pagination, { total: 0, page: 3, limit: 50, totalPages: 0 });
  } finally {
    Lead.find = originalFind;
    Lead.countDocuments = originalCountDocuments;
  }
});

test('lead updates reject business and source fields without changing the lead', async () => {
  const originalFindOneAndUpdate = Lead.findOneAndUpdate;
  let updateCalled = false;
  Lead.findOneAndUpdate = async () => { updateCalled = true; };
  try {
    for (const field of [
      'businessName', 'category', 'location', 'website', 'businessEmail',
      'phone', 'businessPhone', 'businessDescription', 'providerPlaceId',
      'discoverySource', 'latitude', 'longitude', 'coordinates', 'websiteAnalysis'
    ]) {
      const res = response();
      await updateLead({ params: { id: '507f1f77bcf86cd799439011' }, user: { _id: 'owner-1' }, body: { [field]: 'changed' } }, res);
      assert.equal(res.statusCode, 400, `${field} should be rejected`);
      assert.match(res.body.message, /cannot be edited/);
    }
    assert.equal(updateCalled, false);
  } finally {
    Lead.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test('lead updates allow only freelancer workflow fields', async () => {
  const originalFindOneAndUpdate = Lead.findOneAndUpdate;
  const updatedLead = { _id: 'lead-1', notes: 'Call next week', priority: 'high', leadStatus: 'reviewed', doNotContact: true };
  let query;
  let update;
  let options;
  Lead.findOneAndUpdate = async (...args) => {
    [query, update, options] = args;
    return updatedLead;
  };
  try {
    const res = response();
    await updateLead({
      params: { id: '507f1f77bcf86cd799439011' },
      user: { _id: 'owner-1' },
      body: { notes: 'Call next week', priority: 'high', leadStatus: 'reviewed', doNotContact: true }
    }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(query, { _id: '507f1f77bcf86cd799439011', userId: 'owner-1' });
    assert.deepEqual(update, { $set: { notes: 'Call next week', priority: 'high', leadStatus: 'reviewed', doNotContact: true } });
    assert.deepEqual(options, { new: true, runValidators: true });
    assert.equal(res.body.lead, updatedLead);
  } finally {
    Lead.findOneAndUpdate = originalFindOneAndUpdate;
  }
});
