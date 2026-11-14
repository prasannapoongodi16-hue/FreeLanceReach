import mongoose from 'mongoose';
import Lead from '../models/Lead.js';
import { analyzeWebsite } from '../services/websiteAnalysisService.js';

export const analyzeLeadWebsite = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.leadId)) {
      return res.status(400).json({ success: false, message: 'Invalid lead ID' });
    }
    const lead = await Lead.findOne({ _id: req.params.leadId, userId: req.user._id });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    if (!lead.website) return res.status(400).json({ success: false, message: 'This lead does not have a website URL' });

    const analysis = await analyzeWebsite(lead.website);
    lead.websiteAnalysis = analysis;
    lead.websiteStatus = 'has_website';
    await lead.save();

    return res.status(200).json({ success: true, message: 'Website analysis completed', lead });
  } catch (error) {
    const inputError = /^(Enter a valid website URL|Only public|Only standard public|Website URLs cannot|Local and private|Website hostname (could not be resolved|resolves)|Website returned an invalid redirect|Website redirected too many)/i.test(error.message || '');
    const status = error.statusCode || (inputError ? 400 : 502);
    if (status >= 500) console.error('Website analysis error:', error);
    return res.status(status).json({
      success: false,
      message: status === 502 ? 'Website analysis failed. Please try again later.' : error.message
    });
  }
};
