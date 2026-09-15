const round = (value, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round((Number(value || 0) + Number.EPSILON) * factor) / factor;
};

const metricRules = [
  {
    key: "runway",
    label: "Runway",
    priority: "CRITICAL",
    isWeak: (metrics) => metrics.runway !== null && metrics.runway < 6,
    problem: "Cash runway is below six months.",
    actions: [
      "Freeze non-essential spending and review every recurring expense.",
      "Build a 90-day cash preservation forecast.",
      "Identify the fastest realistic revenue or funding lever.",
    ],
  },
  {
    key: "ltvCacRatio",
    label: "LTV:CAC",
    priority: "HIGH",
    isWeak: (metrics) => metrics.ltvCacRatio > 0 && metrics.ltvCacRatio < 3,
    problem: "Customer economics are below a 3x LTV:CAC target.",
    actions: [
      "Review acquisition channels and remove the highest-CAC sources.",
      "Test pricing, retention, or onboarding improvements that can increase LTV.",
      "Set a weekly LTV:CAC review with channel-level CAC tracking.",
    ],
  },
  {
    key: "churnRate",
    label: "Churn",
    priority: "HIGH",
    isWeak: (metrics) => metrics.churnRate > 5,
    problem: "Monthly churn is above the 5% target.",
    actions: [
      "Interview recently churned customers to identify the top cancellation reasons.",
      "Create one retention experiment focused on the largest churn driver.",
      "Track churn by cohort and customer segment for the next four weeks.",
    ],
  },
  {
    key: "grossMargin",
    label: "Gross Margin",
    priority: "MEDIUM",
    isWeak: (metrics) => metrics.grossMargin > 0 && metrics.grossMargin < 50,
    problem: "Gross margin is below the 50% target.",
    actions: [
      "Separate direct delivery costs from operating expenses.",
      "Identify the top three cost drivers affecting gross margin.",
      "Test one pricing, packaging, or delivery-cost improvement.",
    ],
  },
  {
    key: "cacPaybackMonths",
    label: "CAC Payback",
    priority: "HIGH",
    isWeak: (metrics) =>
      metrics.cacPaybackMonths !== null && metrics.cacPaybackMonths > 12,
    problem: "CAC payback is longer than twelve months.",
    actions: [
      "Rank acquisition channels by CAC payback instead of volume alone.",
      "Improve conversion or gross margin on the highest-value channel.",
      "Set a target payback period and review it weekly.",
    ],
  },
  {
    key: "conversionRate",
    label: "Conversion Rate",
    priority: "MEDIUM",
    isWeak: (metrics) =>
      metrics.conversionRate > 0 && metrics.conversionRate < 2,
    problem: "Conversion rate is below the 2% baseline.",
    actions: [
      "Map the current funnel from acquisition to activation and purchase.",
      "Identify the largest drop-off stage and define one conversion experiment.",
      "Measure the experiment against a clear baseline before scaling it.",
    ],
  },
];

const priorityWeight = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const buildWeek = (week, theme, items) => ({
  week,
  days: `${(week - 1) * 7 + 1}-${week * 7}`,
  theme,
  actions: items.map((item, index) => ({
    id: `w${week}-a${index + 1}`,
    title: item.title,
    metric: item.metric,
    priority: item.priority,
  })),
});

export const buildActionPlan = (metrics) => {
  const weakMetrics = metricRules
    .filter((rule) => rule.isWeak(metrics))
    .sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority])
    .map((rule) => ({
      metric: rule.key,
      label: rule.label,
      priority: rule.priority,
      currentValue: metrics[rule.key],
      problem: rule.problem,
      recommendedActions: rule.actions,
    }));

  const topActions = weakMetrics.flatMap((item) =>
    item.recommendedActions.map((title) => ({
      title,
      metric: item.label,
      priority: item.priority,
    })),
  );

  const fallback = [
    {
      title: "Validate the current startup metrics and confirm the baseline.",
      metric: "Founder Cockpit",
      priority: "MEDIUM",
    },
    {
      title: "Review customer, revenue, and acquisition data for the largest growth constraint.",
      metric: "Founder Cockpit",
      priority: "MEDIUM",
    },
    {
      title: "Choose one measurable experiment and define its success threshold.",
      metric: "Founder Cockpit",
      priority: "MEDIUM",
    },
  ];

  const actions = topActions.length > 0 ? topActions : fallback;
  const selected = actions.slice(0, 12);

  while (selected.length < 12) {
    selected.push({
      title: "Review progress, capture evidence, and decide the next experiment.",
      metric: "Founder Cockpit",
      priority: "LOW",
    });
  }

  const weeks = [
    buildWeek(1, "Diagnose & baseline", selected.slice(0, 3)),
    buildWeek(2, "Run focused experiments", selected.slice(3, 6)),
    buildWeek(3, "Measure & optimize", selected.slice(6, 9)),
    buildWeek(4, "Decide & scale", selected.slice(9, 12)),
  ];

  const score = round(
    Math.max(0, 100 - weakMetrics.reduce((sum, item) => sum + priorityWeight[item.priority] * 10, 0)),
  );

  return {
    horizonDays: 30,
    readinessScore: score,
    weakMetricCount: weakMetrics.length,
    weakMetrics,
    weeks,
    nextBestActions: selected.slice(0, 5),
  };
};
