const number = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const round = (value, digits = 2) => Number(number(value).toFixed(digits));

export const buildFinancialAssumptions = (company, overrides = {}) => {
  const startingMrr = Math.max(0, number(overrides.startingMrr ?? company.mrr ?? company.monthlyRevenue ?? company.currentRevenue));
  const monthlyGrowthRate = number(overrides.monthlyGrowthRate ?? ((company.growthRate ?? company.revenueGrowthRate ?? 0) / 12));
  const grossMargin = Math.min(100, Math.max(0, number(overrides.grossMargin ?? company.grossMargin)));
  const monthlyFixedCosts = Math.max(0, number(overrides.monthlyFixedCosts ?? company.monthlyBurn ?? company.monthlyExpenses));
  const monthlyVariableCostRate = Math.min(100, Math.max(0, number(overrides.monthlyVariableCostRate ?? (100 - grossMargin))));
  const startingCash = Math.max(0, number(overrides.startingCash ?? company.cashAvailable ?? company.cashBalance));
  const monthlyNewCustomers = Math.max(0, number(overrides.monthlyNewCustomers ?? 0));
  const averageRevenuePerCustomer = Math.max(0, number(overrides.averageRevenuePerCustomer ?? (company.customers > 0 ? startingMrr / company.customers : 0)));
  const oneTimeFunding = Math.max(0, number(overrides.oneTimeFunding ?? 0));

  return { startingMrr, monthlyGrowthRate, grossMargin, monthlyFixedCosts, monthlyVariableCostRate, startingCash, monthlyNewCustomers, averageRevenuePerCustomer, oneTimeFunding };
};

export const generateFinancialForecast = (assumptions, months = 12) => {
  const forecast = [];
  let revenue = assumptions.startingMrr;
  let cash = assumptions.startingCash + assumptions.oneTimeFunding;
  let cumulativeRevenue = 0;

  for (let month = 1; month <= months; month += 1) {
    revenue = month === 1 ? revenue : revenue * (1 + assumptions.monthlyGrowthRate / 100);
    const grossProfit = revenue * assumptions.grossMargin / 100;
    const variableCosts = revenue * assumptions.monthlyVariableCostRate / 100;
    const operatingExpenses = assumptions.monthlyFixedCosts + variableCosts;
    const netProfit = grossProfit - operatingExpenses;
    const cashFlow = netProfit;
    cash += cashFlow;
    cumulativeRevenue += revenue;

    forecast.push({
      month,
      revenue: round(revenue),
      grossProfit: round(grossProfit),
      operatingExpenses: round(operatingExpenses),
      netProfit: round(netProfit),
      cashFlow: round(cashFlow),
      endingCash: round(cash),
      cumulativeRevenue: round(cumulativeRevenue),
    });
  }

  return forecast;
};

export const summarizeFinancialForecast = (forecast, startingCash = 0) => {
  const annualRevenue = forecast.reduce((sum, row) => sum + row.revenue, 0);
  const annualGrossProfit = forecast.reduce((sum, row) => sum + row.grossProfit, 0);
  const annualOperatingExpenses = forecast.reduce((sum, row) => sum + row.operatingExpenses, 0);
  const annualNetProfit = forecast.reduce((sum, row) => sum + row.netProfit, 0);
  const losses = forecast.filter((row) => row.netProfit < 0).map((row) => Math.abs(row.netProfit));
  const averageMonthlyBurn = losses.length ? losses.reduce((sum, value) => sum + value, 0) / losses.length : 0;
  const breakEven = forecast.find((row) => row.netProfit >= 0);
  const profitableMonths = forecast.filter((row) => row.netProfit >= 0).length;
  const endingCash = forecast.at(-1)?.endingCash ?? startingCash;
  const runwayMonths = averageMonthlyBurn > 0 ? Math.max(0, startingCash / averageMonthlyBurn) : null;

  return {
    annualRevenue: round(annualRevenue),
    annualGrossProfit: round(annualGrossProfit),
    annualOperatingExpenses: round(annualOperatingExpenses),
    annualNetProfit: round(annualNetProfit),
    endingCash: round(endingCash),
    averageMonthlyBurn: round(averageMonthlyBurn),
    runwayMonths: runwayMonths === null ? null : round(runwayMonths),
    breakEvenMonth: breakEven?.month ?? null,
    profitableMonths,
  };
};

export const buildFinancialModel = (company, overrides = {}) => {
  const assumptions = buildFinancialAssumptions(company, overrides);
  const forecast = generateFinancialForecast(assumptions, 12);
  const summary = summarizeFinancialForecast(forecast, assumptions.startingCash + assumptions.oneTimeFunding);
  return { assumptions, forecast, summary };
};
