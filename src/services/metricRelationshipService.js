const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const round = (value, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round((toNumber(value) + Number.EPSILON) * factor) / factor;
};

const relationship = (key, from, to, effect, explanation, action) => ({
  key,
  from,
  to,
  effect,
  explanation,
  action,
});

export const buildMetricRelationships = (metrics = {}) => {
  const monthlyRevenue = toNumber(metrics.monthlyRevenue);
  const customers = toNumber(metrics.customers);
  const cac = toNumber(metrics.cac);
  const ltv = toNumber(metrics.ltv);
  const churnRate = toNumber(metrics.churnRate);
  const grossMargin = toNumber(metrics.grossMargin);
  const monthlyBurn = toNumber(metrics.monthlyBurn);
  const cashAvailable = toNumber(metrics.cashAvailable);
  const arpu = toNumber(metrics.arpu);
  const ltvCacRatio = toNumber(metrics.ltvCacRatio);
  const netBurn = toNumber(metrics.netBurn);
  const runway = metrics.runway === null ? null : toNumber(metrics.runway);
  const cacPaybackMonths = metrics.cacPaybackMonths === null
    ? null
    : toNumber(metrics.cacPaybackMonths);

  const relationships = [
    relationship(
      "customers-arpu-revenue",
      "customers",
      "ARPU / Monthly Revenue",
      "DIRECT",
      "With monthly revenue held constant, more customers reduce ARPU. With ARPU held constant, more customers increase monthly revenue.",
      "Track customer count and ARPU together before changing pricing or acquisition spend.",
    ),
    relationship(
      "arpu-ltv",
      "ARPU",
      "LTV",
      "POSITIVE",
      "Higher ARPU generally increases customer lifetime value when retention remains unchanged.",
      "Improve monetization without weakening retention.",
    ),
    relationship(
      "churn-ltv",
      "Churn Rate",
      "Estimated LTV",
      "NEGATIVE",
      "Higher churn shortens the expected customer lifetime and reduces retention-based LTV.",
      "Prioritize retention before aggressively increasing acquisition spend.",
    ),
    relationship(
      "cac-ltvcac",
      "CAC",
      "LTV:CAC",
      "NEGATIVE",
      "For a fixed LTV, higher customer acquisition cost lowers the LTV:CAC ratio.",
      "Reduce acquisition cost or improve customer value before scaling the channel.",
    ),
    relationship(
      "ltv-ltvcac",
      "LTV",
      "LTV:CAC",
      "POSITIVE",
      "For a fixed CAC, higher LTV improves the unit-economics ratio.",
      "Increase retention, pricing power, or expansion revenue.",
    ),
    relationship(
      "cac-payback",
      "CAC",
      "CAC Payback",
      "NEGATIVE",
      "Higher CAC requires more gross-profit contribution to recover acquisition spend.",
      "Lower CAC or increase ARPU and gross margin.",
    ),
    relationship(
      "gross-margin-payback",
      "Gross Margin",
      "CAC Payback",
      "NEGATIVE",
      "Higher gross margin increases gross profit per customer and shortens CAC recovery time.",
      "Improve pricing and delivery economics while protecting customer value.",
    ),
    relationship(
      "revenue-margin-burn",
      "Revenue + Gross Margin",
      "Net Burn",
      "NEGATIVE",
      "More gross profit reduces the portion of operating costs that must be funded by cash.",
      "Grow revenue and protect gross margin before adding fixed costs.",
    ),
    relationship(
      "burn-runway",
      "Net Burn",
      "Runway",
      "NEGATIVE",
      "Higher net burn consumes available cash faster and shortens runway.",
      "Reduce burn or increase gross profit before cash becomes constrained.",
    ),
    relationship(
      "cash-runway",
      "Cash Available",
      "Runway",
      "POSITIVE",
      "More available cash extends the time the business can operate at its current net burn.",
      "Preserve liquidity and plan funding before the runway becomes critical.",
    ),
  ];

  const currentState = {
    monthlyRevenue: round(monthlyRevenue),
    customers: round(customers),
    cac: round(cac),
    ltv: round(ltv),
    churnRate: round(churnRate),
    grossMargin: round(grossMargin),
    monthlyBurn: round(monthlyBurn),
    cashAvailable: round(cashAvailable),
    arpu: round(arpu),
    ltvCacRatio: round(ltvCacRatio),
    netBurn: round(netBurn),
    runway: runway === null ? null : round(runway),
    cacPaybackMonths: cacPaybackMonths === null ? null : round(cacPaybackMonths),
  };

  const insights = [];

  if (ltvCacRatio > 0 && ltvCacRatio < 3) {
    insights.push({
      key: "unit-economics",
      severity: "HIGH",
      message: "LTV:CAC is below the 3x benchmark used by the operating model; improve LTV or reduce CAC before scaling acquisition.",
    });
  }

  if (churnRate > 5) {
    insights.push({
      key: "retention",
      severity: "HIGH",
      message: "Churn is elevated; retention improvements can strengthen LTV and reduce the pressure on acquisition economics.",
    });
  }

  if (runway !== null && runway < 6) {
    insights.push({
      key: "runway",
      severity: "CRITICAL",
      message: "Runway is below six months; cash preservation and funding planning should be treated as immediate priorities.",
    });
  }

  if (grossMargin > 0 && grossMargin < 50) {
    insights.push({
      key: "gross-margin",
      severity: "MEDIUM",
      message: "Gross margin is below 50%; improving delivery economics can improve both payback and cash generation.",
    });
  }

  return {
    currentState,
    relationships,
    insights,
    relationshipCount: relationships.length,
  };
};
