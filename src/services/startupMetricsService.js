const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const nonNegative = (value) => Math.max(0, toNumber(value));

const round = (value, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round((toNumber(value) + Number.EPSILON) * factor) / factor;
};

export const calculateStartupMetrics = (companyLike = {}) => {
  const monthlyRevenue = nonNegative(
    companyLike.monthlyRevenue ?? companyLike.currentRevenue,
  );
  const mrr = nonNegative(companyLike.mrr ?? monthlyRevenue);
  const customers = nonNegative(companyLike.customers);
  const cac = nonNegative(companyLike.cac);
  const ltv = nonNegative(companyLike.ltv);
  const churnRate = nonNegative(
    companyLike.churnRate ?? companyLike.customerChurnRate,
  );
  const conversionRate = nonNegative(companyLike.conversionRate);
  const grossMargin = nonNegative(companyLike.grossMargin);
  const monthlyBurn = nonNegative(
    companyLike.monthlyBurn ?? companyLike.monthlyExpenses,
  );
  const cashAvailable = nonNegative(
    companyLike.cashAvailable ?? companyLike.cashBalance,
  );

  const arpu = customers > 0 ? monthlyRevenue / customers : 0;
  const ltvCacRatio = cac > 0 ? ltv / cac : 0;
  const monthlyChurnDecimal = churnRate / 100;
  const grossMarginDecimal = grossMargin / 100;
  const grossProfit = monthlyRevenue * grossMarginDecimal;
  const netBurn = Math.max(0, monthlyBurn - grossProfit);
  const runway = netBurn > 0 ? cashAvailable / netBurn : null;
  const cacPaybackMonths = grossMargin > 0 && cac > 0 && arpu > 0
    ? cac / (arpu * grossMarginDecimal)
    : null;
  const estimatedLtvFromRetention = monthlyChurnDecimal > 0
    ? arpu / monthlyChurnDecimal
    : null;

  return {
    monthlyRevenue: round(monthlyRevenue),
    mrr: round(mrr),
    customers: round(customers),
    cac: round(cac),
    ltv: round(ltv),
    churnRate: round(churnRate),
    conversionRate: round(conversionRate),
    grossMargin: round(grossMargin),
    monthlyBurn: round(monthlyBurn),
    cashAvailable: round(cashAvailable),
    arpu: round(arpu),
    ltvCacRatio: round(ltvCacRatio),
    grossProfit: round(grossProfit),
    netBurn: round(netBurn),
    runway: runway === null ? null : round(runway),
    cacPaybackMonths:
      cacPaybackMonths === null ? null : round(cacPaybackMonths),
    estimatedLtvFromRetention:
      estimatedLtvFromRetention === null
        ? null
        : round(estimatedLtvFromRetention),
  };
};
