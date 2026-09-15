import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildFinancialAssumptions, generateFinancialForecast, summarizeFinancialForecast } from "../../src/services/financialModelService.js";

describe("Financial Model engine", () => {
  const company = {
    currentRevenue: 100000,
    revenueGrowthRate: 24,
    grossMargin: 60,
    monthlyExpenses: 50000,
    cashBalance: 300000,
    customers: 100,
  };

  it("builds assumptions from the Founder Cockpit company profile", () => {
    const assumptions = buildFinancialAssumptions(company);
    assert.equal(assumptions.startingMrr, 100000);
    assert.equal(assumptions.grossMargin, 60);
    assert.equal(assumptions.monthlyFixedCosts, 50000);
    assert.equal(assumptions.startingCash, 300000);
  });

  it("allows explicit assumptions to override profile values", () => {
    const assumptions = buildFinancialAssumptions(company, { startingMrr: 200000, monthlyGrowthRate: 5, monthlyFixedCosts: 80000, oneTimeFunding: 500000 });
    assert.equal(assumptions.startingMrr, 200000);
    assert.equal(assumptions.monthlyGrowthRate, 5);
    assert.equal(assumptions.monthlyFixedCosts, 80000);
    assert.equal(assumptions.oneTimeFunding, 500000);
  });

  it("generates exactly twelve monthly forecast rows", () => {
    const assumptions = buildFinancialAssumptions(company);
    const forecast = generateFinancialForecast(assumptions, 12);
    assert.equal(forecast.length, 12);
    assert.equal(forecast[0].month, 1);
    assert.equal(forecast[11].month, 12);
    assert.ok(forecast[11].cumulativeRevenue > forecast[0].revenue);
  });

  it("calculates gross profit, operating expenses and cash flow consistently", () => {
    const assumptions = buildFinancialAssumptions(company, { monthlyVariableCostRate: 10 });
    const [month] = generateFinancialForecast(assumptions, 1);
    assert.equal(month.revenue, 100000);
    assert.equal(month.grossProfit, 60000);
    assert.equal(month.operatingExpenses, 60000);
    assert.equal(month.netProfit, 0);
    assert.equal(month.cashFlow, 0);
  });

  it("identifies break-even and profitable months", () => {
    const assumptions = buildFinancialAssumptions(company, { monthlyFixedCosts: 90000, monthlyVariableCostRate: 10, monthlyGrowthRate: 10 });
    const forecast = generateFinancialForecast(assumptions, 12);
    const summary = summarizeFinancialForecast(forecast, assumptions.startingCash);
    assert.ok(summary.breakEvenMonth !== null);
    assert.ok(summary.profitableMonths > 0);
  });

  it("calculates runway from average loss months without producing negative runway", () => {
    const assumptions = buildFinancialAssumptions(company, { monthlyFixedCosts: 100000, monthlyVariableCostRate: 50, grossMargin: 50, monthlyGrowthRate: 0 });
    const forecast = generateFinancialForecast(assumptions, 12);
    const summary = summarizeFinancialForecast(forecast, assumptions.startingCash);
    assert.ok(summary.averageMonthlyBurn > 0);
    assert.ok(summary.runwayMonths >= 0);
    assert.equal(summary.endingCash, -900000);
  });
});
