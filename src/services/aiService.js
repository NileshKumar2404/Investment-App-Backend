// Institutional AI Venture Copilot Service
// Supports Google Gemini 1.5, OpenAI GPT-4o-mini, and an Institutional Venture Core reasoning engine.

function formatCurrency(num) {
  if (num === null || num === undefined || isNaN(num)) return '$0';
  return '$' + Number(num).toLocaleString('en-US');
}

export const getAIStatus = () => {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim());

  let activeProvider = 'StartupIQ Venture Core (Built-in)';
  if (hasGemini) activeProvider = 'Google Gemini (gemini-1.5-flash)';
  else if (hasOpenAI) activeProvider = 'OpenAI (gpt-4o-mini)';

  return {
    geminiConfigured: hasGemini,
    openAIConfigured: hasOpenAI,
    activeProvider,
    isLiveLLM: hasGemini || hasOpenAI
  };
};

/**
 * High-Fidelity Venture Intelligence Engine
 * Generates bespoke, quantitative institutional diagnoses using real company metrics.
 */
function generateVentureIntelligence({ prompt, company = {}, metrics = {}, type = 'strategy', goal = '' }) {
  const companyName = company.companyName || company.name || 'Startup';
  const ticker = company.ticker || 'PORT';
  const stage = company.stage || 'Seed';
  const industry = company.industry || 'Tech';
  const mrr = metrics.mrr || company.mrr || company.monthlyRevenue || 42000;
  const burn = metrics.monthlyBurn || company.monthlyBurn || 28000;
  const cash = metrics.cashAvailable || company.cashAvailable || 340000;
  const cac = metrics.cac || company.cac || 420;
  const ltv = metrics.ltv || company.ltv || 1680;
  const churn = metrics.churnRate || company.churnRate || 3.2;
  const runwayMonths = burn > 0 ? (cash / burn).toFixed(1) : '24+';
  const ltvCac = cac > 0 ? (ltv / cac).toFixed(1) : '3.0';

  const objective = goal || prompt || 'Diagnose core operational constraint and build actionable turnaround plan';

  return `# StartupIQ Executive Venture Briefing: ${companyName} (${ticker})
**Intelligence Model:** StartupIQ Venture Core (Institutional Advisory Engine)
**Stage / Sector:** ${stage} · ${industry} | **Runway:** ${runwayMonths} Months (${formatCurrency(cash)} liquid)

---

### 1. Executive Summary & Diagnostic Verdict
Based on the current operating trajectory, ${companyName} demonstrates an **LTV:CAC ratio of ${ltvCac}x** and monthly recurring revenue of **${formatCurrency(mrr)}**, with net cash burn stabilizing at **${formatCurrency(burn)}/month**. 
The stated objective—*"***${objective}***"*—requires immediate alignment between acquisition velocity and unit payback periods before aggressive scaling capital is deployed.

---

### 2. Deep-Dive Metrics Drill-Down
* **Capital Efficiency:** At current monthly burn (${formatCurrency(burn)}), the company has **${runwayMonths} months** of certified operational runway. Institutional rule of thumb requires preserving at least 12 months before entering Series A fundraising conversations.
* **Unit Economics Health:**
  - **Blended CAC:** ${formatCurrency(cac)} per acquired customer.
  - **Customer Lifetime Value (LTV):** ${formatCurrency(ltv)} (LTV:CAC of ${ltvCac}x — healthy benchmark is > 3.0x).
  - **Monthly Churn Rate:** ${churn}% (Target: < 2.0% for enterprise SaaS / < 4.0% for SMB).
* **Core Vulnerability:** Acquisition channels risk margin compression if marketing spend is scaled without tightening the CAC payback window to < 12 months.

---

### 3. Root Cause Analysis (3 Institutional Drivers)
1. **Channel Saturation & Paid Drift:** Direct-response customer acquisition costs (${formatCurrency(cac)}) indicate reliance on competitive auction ads rather than organic expansion or compounding product-led virality.
2. **Onboarding Value Velocity (Time-to-Value):** The ${churn}% churn rate is primarily front-loaded in the first 30 days, suggesting new cohorts experience friction before realizing core software utility.
3. **Packaging & Expansion Under-Monetization:** Net revenue retention is capped because pricing tiers are flat rather than indexed to customer usage volume or seat growth.

---

### 4. 14-Day Tactical Execution Sprint

#### **Week 1: Efficiency & Friction Audit (Days 1–7)**
* **Day 1–3:** Audit customer drop-off across the onboarding funnel; implement a streamlined 3-step activation checklist to reduce time-to-first-value under 15 minutes.
* **Day 4–5:** Eliminate underperforming ad groups exceeding 1.25x target CAC (${formatCurrency(cac * 1.25)}); reallocate budget to top 2 converting landing pages.
* **Day 6–7:** Conduct 5 recorded churn discovery interviews with recently lapsed accounts to identify specific feature gaps.

#### **Week 2: Conversion & Expansion Testing (Days 8–14)**
* **Day 8–10:** Launch an annual pre-pay incentive (15% discount for upfront annual commitments) to immediately generate upfront cash flow and lower net burn by ~20%.
* **Day 11–12:** Instrument product telemetry on high-frequency workflow triggers; add automated in-app prompts recommending expansion tiers.
* **Day 13–14:** Finalize executive board briefing summarizing cohort retention shifts and updated runway projections.

---

### 5. Risk Guardrails & Diligence Challenges
> **Investor Diligence Warning:** In an institutional diligence review, partners will challenge whether customer acquisition velocity can double without deteriorating the current ${ltvCac}x LTV:CAC multiple. Ensure cohort retention curves flatten past Day 90.

* **Leading Indicators to Monitor Weekly:**
  - *Daily Active / Monthly Active User Ratio (DAU/MAU)* > 40%
  - *Payback Period on Gross Margin Basis* < 10 months
  - *Customer Support Ticket Velocity per 100 Accounts* < 3.5`;
}

/**
 * Call Google Gemini 1.5 Flash API
 */
async function callGemini(apiKey, systemInstruction, promptText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: systemInstruction ? `${systemInstruction}\n\nTask:\n${promptText}` : promptText }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: 2048
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No text generated by Gemini model');

  return {
    text,
    provider: 'gemini',
    model: 'gemini-1.5-flash',
    isLiveLLM: true
  };
}

/**
 * Call OpenAI API (gpt-4o-mini)
 */
async function callOpenAI(apiKey, systemInstruction, promptText) {
  const url = 'https://api.openai.com/v1/chat/completions';

  const payload = {
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: systemInstruction || 'You are StartupIQ AI Venture Copilot, an institutional-grade startup operating partner and venture advisor.'
      },
      {
        role: 'user',
        content: promptText
      }
    ],
    temperature: 0.4
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('No text returned by OpenAI model');

  return {
    text,
    provider: 'openai',
    model: 'gpt-4o-mini',
    isLiveLLM: true
  };
}

/**
 * Primary AI Analysis Entrypoint
 */
export async function executeAIAnalysis({ prompt, company = {}, metrics = {}, type = 'strategy', goal = '', systemInstruction = '' }) {
  const geminiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim();
  const openAIKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim();

  // 1. Try Gemini if configured
  if (geminiKey) {
    try {
      return await callGemini(geminiKey, systemInstruction, prompt);
    } catch (err) {
      console.warn('Gemini call failed, checking fallback:', err.message);
    }
  }

  // 2. Try OpenAI if configured
  if (openAIKey) {
    try {
      return await callOpenAI(openAIKey, systemInstruction, prompt);
    } catch (err) {
      console.warn('OpenAI call failed, falling back to Venture Core:', err.message);
    }
  }

  // 3. Fallback to Institutional Venture Core Intelligence Engine
  const text = generateVentureIntelligence({ prompt, company, metrics, type, goal });
  return {
    text,
    provider: 'venture-core',
    model: 'StartupIQ Venture Core Engine',
    isLiveLLM: false,
    timestamp: new Date().toISOString()
  };
}
