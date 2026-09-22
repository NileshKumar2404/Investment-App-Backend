import express from 'express';
import { executeAIAnalysis, getAIStatus } from '../services/aiService.js';
import Company from '../models/Company.js';
import { calculateStartupMetrics } from '../services/startupMetricsService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const router = express.Router();

/**
 * GET /api/v1/ai/status
 * Returns current status of AI providers (Gemini, OpenAI, Built-in)
 */
router.get('/status', (req, res) => {
  const status = getAIStatus();
  return res.status(200).json(new ApiResponse(200, status, 'AI status retrieved'));
});

/**
 * POST /api/v1/ai/generate
 * Executes structured prompt with live LLM or Venture Core engine
 */
router.post('/generate', asyncHandler(async (req, res) => {
  const { prompt, ticker, type, goal, systemInstruction } = req.body || {};

  let company = {};
  let metrics = {};

  if (ticker) {
    const found = await Company.findOne({ ticker: ticker.toUpperCase() }).catch(() => null);
    if (found) {
      company = found;
      metrics = calculateStartupMetrics(found);
    }
  }

  const result = await executeAIAnalysis({
    prompt: prompt || 'Analyze current venture performance and recommend top 3 focus areas.',
    company,
    metrics,
    type: type || 'strategy',
    goal: goal || '',
    systemInstruction: systemInstruction || ''
  });

  return res.status(200).json(new ApiResponse(200, result, 'AI analysis executed successfully'));
}));

/**
 * POST /api/v1/ai/copilot
 * Conversational venture copilot endpoint
 */
router.post('/copilot', asyncHandler(async (req, res) => {
  const { message, ticker, conversationHistory } = req.body || {};

  let company = {};
  let metrics = {};

  if (ticker) {
    const found = await Company.findOne({ ticker: ticker.toUpperCase() }).catch(() => null);
    if (found) {
      company = found;
      metrics = calculateStartupMetrics(found);
    }
  }

  const prompt = [
    `Founder Query: "${message || 'How can I optimize our burn rate and extend runway?'}"`,
    '',
    'Company Snapshot:',
    `- Name: ${company.companyName || company.name || 'Startup'} (${company.ticker || 'PORT'})`,
    `- Stage: ${company.stage || 'Seed'} | Industry: ${company.industry || 'Tech'}`,
    `- MRR: $${(company.mrr || company.monthlyRevenue || 0).toLocaleString()}`,
    `- Burn: $${(company.monthlyBurn || 0).toLocaleString()} | Runway: ${metrics.runway || '12'} mos`,
    `- CAC: $${company.cac || 0} | LTV: $${company.ltv || 0}`,
    '',
    'Provide concise, actionable venture capital advisory advice tailored to these metrics.'
  ].join('\n');

  const result = await executeAIAnalysis({
    prompt,
    company,
    metrics,
    type: 'copilot',
    goal: message
  });

  return res.status(200).json(new ApiResponse(200, result, 'Copilot response generated'));
}));

export default router;
