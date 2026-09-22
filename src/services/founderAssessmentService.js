import { COMP_BANK, COMP_DOMAINS } from '../data/founderAssessmentBank.js';
import { executeAIAnalysis } from './aiService.js';

const DOMAIN_KEYS = ['leadership', 'strategy', 'finance', 'marketing', 'operations', 'product'];

function shuffle(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate 30 questions from the 120-question vetted bank
 * Target: 5 questions per domain (2 Easy, 2 Medium, 1 Hard)
 */
export function generateStandardAssessment() {
  const questions = [];

  DOMAIN_KEYS.forEach(domainKey => {
    const domain = COMP_BANK[domainKey];
    if (!domain || !domain.questions) return;

    const pool = domain.questions.slice();
    const easy = pool.filter(q => q.diff === 'Easy');
    const medium = pool.filter(q => q.diff === 'Medium');
    const hard = pool.filter(q => q.diff === 'Hard');

    const selected = [
      ...shuffle(easy).slice(0, 2),
      ...shuffle(medium).slice(0, 2),
      ...shuffle(hard).slice(0, 1)
    ];

    // Fallback if difficulty buckets are underfilled
    if (selected.length < 5) {
      const selectedIds = new Set(selected.map(q => q.id));
      const remaining = pool.filter(q => !selectedIds.has(q.id));
      selected.push(...shuffle(remaining).slice(0, 5 - selected.length));
    }

    shuffle(selected).forEach(q => {
      questions.push({
        id: q.id,
        domain: domainKey,
        domainLabel: domain.label,
        domainIcon: domain.icon,
        domainColor: domain.color,
        subskill: q.sub,
        diff: q.diff,
        type: q.type || 'mcq',
        question: q.q,
        options: q.opts,
        scores: q.scores || [0, 1, 3, 0],
        explanation: q.exp || ''
      });
    });
  });

  return shuffle(questions);
}

/**
 * Generate 30 dynamic AI-crafted questions tailored to the company's industry, sector & stage
 */
export async function generateAIAssessment({ company = {} }) {
  const compName = company.companyName || company.name || 'Startup Venture';
  const industry = company.industry || 'Technology';
  const sector = company.sector || 'B2B Software';
  const stage = company.stage || 'Seed';
  const mrr = company.mrr || company.monthlyRevenue || 35000;
  const businessModel = company.businessModel || 'Subscription SaaS';

  const systemInstruction = `You are the Lead Partner and Chief Talent Evaluator at an elite venture capital firm.
Your task is to generate realistic, high-stakes situational competency assessment questions for a startup founder.
Each question must test practical judgment in real-world startup operations, not generic trivia.
Return strictly a valid JSON object matching the requested schema. Do not include markdown codeblocks or conversational text outside the JSON.`;

  const prompt = `Generate an assessment test for the founder of "${compName}".
Startup Profile:
- Industry: ${industry}
- Sector/Vertical: ${sector}
- Stage: ${stage}
- Monthly Revenue: $${Number(mrr).toLocaleString()}
- Business Model: ${businessModel}

Generate exactly 30 questions: 5 questions for EACH of the 6 core domains:
1. leadership (subskills: Team Building, Culture, Delegation, Conflict Resolution, Communication)
2. strategy (subskills: Market Analysis, Positioning, Growth Planning, Risk Assessment, Decision Making)
3. finance (subskills: Cash Management, Capital Allocation, Governance, Unit Economics, Forecasting)
4. marketing (subskills: Customer Acquisition, Retention & Churn, Brand Strategy, Analytics, Channel Mix)
5. operations (subskills: Process SOPs, Bottlenecks, Resource Allocation, Crisis Management, Scalability)
6. product (subskills: Product-Market Fit, Onboarding, Roadmap Prioritization, Defensibility, Feature Creep)

Ensure the questions specifically simulate situations and trade-offs that a ${industry} / ${sector} company at the ${stage} stage faces!

Return format JSON schema:
{
  "questions": [
    {
      "id": "ai_1",
      "domain": "finance",
      "domainLabel": "Finance & Economics",
      "subskill": "Cash Management",
      "diff": "Medium",
      "type": "mcq",
      "question": "Realistic dilemma text tailored to ${compName}...",
      "options": [
        "Option A text",
        "Option B text",
        "Option C text",
        "Option D text"
      ],
      "scores": [0, 1, 3, 0],
      "explanation": "Detailed professional rationale explaining why the highest-scoring option is the most capital-efficient and strategically sound choice."
    }
  ]
}`;

  try {
    const aiResult = await executeAIAnalysis({
      prompt,
      systemInstruction,
      company,
      type: 'assessment'
    });

    let jsonText = aiResult.text || '';
    // Strip markdown formatting if enclosed in ```json
    if (jsonText.includes('```json')) {
      jsonText = jsonText.split('```json')[1].split('```')[0].trim();
    } else if (jsonText.includes('```')) {
      jsonText = jsonText.split('```')[1].split('```')[0].trim();
    }

    const parsed = JSON.parse(jsonText);
    if (parsed && Array.isArray(parsed.questions) && parsed.questions.length >= 18) {
      // Fill domain metadata
      const domainMap = {};
      COMP_DOMAINS.forEach(d => { domainMap[d.id] = d; });

      return parsed.questions.map((q, idx) => {
        const domInfo = domainMap[q.domain] || domainMap.strategy;
        return {
          id: q.id || `ai_${idx + 1}`,
          domain: q.domain || domInfo.id,
          domainLabel: domInfo.label,
          domainIcon: domInfo.icon,
          domainColor: domInfo.color,
          subskill: q.subskill || 'Leadership',
          diff: q.diff || 'Medium',
          type: q.type || 'mcq',
          question: q.question,
          options: q.options || ['Option A', 'Option B', 'Option C', 'Option D'],
          scores: Array.isArray(q.scores) && q.scores.length === 4 ? q.scores : [0, 1, 3, 0],
          explanation: q.explanation || 'Industry best practice for high-growth ventures.'
        };
      });
    }
  } catch (err) {
    console.warn('[FounderAssessmentService] AI generation failed or returned invalid format, using standard bank:', err.message);
  }

  // Fallback to standard 120-question bank
  return generateStandardAssessment();
}

/**
 * Recommendation dictionary by subskill
 */
const RECS_CATALOG = {
  'Cash Management': {
    title: 'Build a 13-Week Rolling Cash Forecast',
    body: 'Establish weekly tracking of operational cash inflows and outflows. Maintain clear visibility on cash burn and true runway.'
  },
  'Capital Allocation': {
    title: 'Formalize an Investment Decision Framework',
    body: 'Score capital deployment initiatives against expected payback period, hurdle rates, and strategic leverage rather than urgency alone.'
  },
  'Governance': {
    title: 'Institute Monthly Investor & Financial Reviews',
    body: 'Standardize a monthly financial variance pack covering burn, runway, gross margins, and customer concentration.'
  },
  'Forecasting': {
    title: 'Transition to Bottom-Up Driver-Based Models',
    body: 'Replace static top-down estimates with driver models based on lead pipeline, conversion rates, and churn cohorts.'
  },
  'Unit Economics': {
    title: 'Optimize Contribution Margin & Payback Periods',
    body: 'Audit blended and paid CAC across each acquisition channel to ensure payback occurs within 12 months.'
  },
  'Customer Acquisition': {
    title: 'Instrument Full-Funnel Stage-Gate Conversion',
    body: 'Map drop-offs at every step from initial touch to activation. Double down on channels delivering LTV:CAC > 3x.'
  },
  'Retention & Churn': {
    title: 'Build a Churn Early-Warning Protocol',
    body: 'Track leading indicators of churn (e.g., product session decline, feature abandonment) before customer renewal dates.'
  },
  'Brand Strategy': {
    title: 'Clarify Category Positioning Statement',
    body: 'Refine the core value proposition into a single differentiated claim that highlights unique operational moats.'
  },
  'Process SOPs': {
    title: 'Codify Mission-Critical Operating SOPs',
    body: 'Document the 3 workflows that carry the highest customer risk. Ensure cross-training to eliminate single-point dependencies.'
  },
  'Bottlenecks': {
    title: 'Implement WIP (Work-In-Progress) Constraints',
    body: 'Cap concurrent organizational initiatives to increase sprint delivery velocity and improve team focus.'
  },
  'Scalability': {
    title: 'Identify Operational Capacity Ceilings',
    body: 'Stress-test internal infrastructure against 3x volume growth to detect capacity failure points early.'
  },
  'Team Building': {
    title: 'Implement Structured Competency Scorecards',
    body: 'Replace unstructured interviews with standard rubric evaluations aligned with key stage requirements.'
  },
  'Delegation': {
    title: 'Establish Clear Decision Rights (RACI)',
    body: 'Empower direct reports with pre-approved spend and authority tiers to remove founder bottlenecks.'
  },
  'Conflict Resolution': {
    title: 'Codify Co-Founder & Executive Alignment Protocol',
    body: 'Formulate explicit dispute resolution mechanisms and milestone checkpoints to maintain executive cohesion.'
  },
  'Product-Market Fit': {
    title: 'Cross the Mainstream Adoption Chasm',
    body: 'Shift marketing messaging from technical feature sets to validated peer case studies and quantifiable ROI outcomes.'
  },
  'Roadmap Prioritization': {
    title: 'Adopt the RICE Prioritization Framework',
    body: 'Score product backlog requests on Reach, Impact, Confidence, and Effort to protect engineering capacity.'
  },
  'Defensibility': {
    title: 'Deepen Workflow Integration & Data Moats',
    body: 'Embed proprietary data feedback loops and customer system integrations that compound retention over time.'
  }
};

/**
 * Classify founder archetype based on domain scores
 */
function determineArchetype(domainScores) {
  const { strategy = 0, product = 0, operations = 0, finance = 0, marketing = 0, leadership = 0 } = domainScores;

  const pairs = [
    {
      name: 'Visionary Builder',
      icon: '⚡',
      score: (strategy * 0.5) + (product * 0.5),
      desc: 'Excels in defining long-term market vision, category creation, and building innovative, differentiated product experiences.'
    },
    {
      name: 'Operational Architect',
      icon: '🏗️',
      score: (operations * 0.5) + (finance * 0.5),
      desc: 'Master of execution, financial discipline, process rigor, unit economics, and building resilient, scalable operations.'
    },
    {
      name: 'Commercial Driver',
      icon: '🎯',
      score: (marketing * 0.5) + (leadership * 0.5),
      desc: 'Dynamic revenue engine, charismatic talent magnet, compelling storyteller, and master of customer acquisition.'
    },
    {
      name: 'Strategic Operator',
      icon: '🧭',
      score: (strategy * 0.5) + (operations * 0.5),
      desc: 'Combines sharp market foresight with systematic execution, turning complex roadmaps into high-velocity business results.'
    },
    {
      name: 'Technical Specialist',
      icon: '🔬',
      score: (product * 0.6) + (operations * 0.4),
      desc: 'Deep product mastery and technical architecture focus, creating defensible intellectual property and proprietary moats.'
    }
  ];

  // Check if scores are uniformly strong
  const values = Object.values(domainScores);
  const minScore = Math.min(...values);
  const maxScore = Math.max(...values);
  if (minScore >= 65 && (maxScore - minScore) <= 15) {
    return {
      name: 'Balanced Generalist',
      icon: '⚖️',
      desc: 'Rare multi-disciplinary balance across all six startup pillars, seamlessly navigating product, capital, and people management.'
    };
  }

  pairs.sort((a, b) => b.score - a.score);
  return {
    name: pairs[0].name,
    icon: pairs[0].icon,
    desc: pairs[0].desc
  };
}

/**
 * Grade test submission and calculate domain scores, subskills, archetype & recommendations
 */
export function evaluateAssessment({ questions = [], answers = {}, durationMinutes = 15 }) {
  const domainTotals = {};
  const domainMax = {};
  const subskillTotals = {};
  const subskillMax = {};

  DOMAIN_KEYS.forEach(k => {
    domainTotals[k] = 0;
    domainMax[k] = 0;
  });

  const questionResults = [];

  questions.forEach((q, idx) => {
    const qId = q.id || `q_${idx}`;
    const dom = q.domain || 'strategy';
    const sub = q.subskill || 'General';
    const rawScores = q.scores || [0, 1, 3, 0];
    const maxPoss = Math.max(...rawScores, 1);

    const answeredIdx = answers[qId] !== undefined ? Number(answers[qId]) : -1;
    const earned = answeredIdx >= 0 && answeredIdx < rawScores.length ? rawScores[answeredIdx] : 0;

    domainTotals[dom] = (domainTotals[dom] || 0) + earned;
    domainMax[dom] = (domainMax[dom] || 0) + maxPoss;

    subskillTotals[sub] = (subskillTotals[sub] || 0) + earned;
    subskillMax[sub] = (subskillMax[sub] || 0) + maxPoss;

    questionResults.push({
      id: qId,
      domain: dom,
      subskill: sub,
      question: q.question,
      options: q.options,
      selectedOption: answeredIdx,
      score: earned,
      maxScore: maxPoss,
      explanation: q.explanation || ''
    });
  });

  // Calculate percentages (0-100)
  const domainScores = {};
  DOMAIN_KEYS.forEach(k => {
    const total = domainTotals[k] || 0;
    const max = domainMax[k] || 1;
    domainScores[k] = Math.min(100, Math.round((total / max) * 100));
  });

  const subskillScores = {};
  Object.keys(subskillTotals).forEach(sub => {
    const total = subskillTotals[sub];
    const max = subskillMax[sub] || 1;
    subskillScores[sub] = Math.min(100, Math.round((total / max) * 100));
  });

  const domainScoresList = Object.values(domainScores);
  const overallScore = Math.round(domainScoresList.reduce((a, b) => a + b, 0) / domainScoresList.length);

  // Capability Level
  let capabilityLevel = 'Early-Stage Founder';
  if (overallScore >= 85) capabilityLevel = 'Highly Capable Founder';
  else if (overallScore >= 70) capabilityLevel = 'Capable Founder';
  else if (overallScore >= 55) capabilityLevel = 'Developing Founder';

  // Archetype
  const archetype = determineArchetype(domainScores);

  // Sorted subskills
  const sortedSubs = Object.entries(subskillScores).map(([sub, score]) => ({ subskill: sub, score }));
  sortedSubs.sort((a, b) => b.score - a.score);

  const strengths = sortedSubs.slice(0, 3);
  const weaknesses = sortedSubs.slice(-3).reverse();

  // Recommendations
  const recommendations = weaknesses.map(w => {
    const rec = RECS_CATALOG[w.subskill] || {
      title: `Strengthen ${w.subskill} Capability`,
      body: `Implement structured mentorship and key metrics reviews focused on accelerating ${w.subskill} execution.`
    };
    return {
      subskill: w.subskill,
      score: w.score,
      priority: w.score < 50 ? 'High' : 'Medium',
      title: rec.title,
      body: rec.body
    };
  });

  return {
    overallScore,
    capabilityLevel,
    archetype,
    domainScores,
    subskillScores,
    strengths,
    weaknesses,
    recommendations,
    durationMinutes,
    totalQuestions: questions.length,
    answeredCount: Object.keys(answers).length,
    questionResults
  };
}
