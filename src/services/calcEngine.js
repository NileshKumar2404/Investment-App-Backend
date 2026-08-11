export class InvestmentCalcEngine {
  static calculate(input) {
    const num = (value, fallback = 0) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const hasValue = (value) => {
      return value !== undefined &&
        value !== null &&
        String(value).trim() !== '';
    };

    // =========================================================
    // BASIC FINANCIAL INPUTS
    // =========================================================

    const rev = num(input.currentRevenue, 0);
    const growth = num(input.revenueGrowthRate, 0) / 100;
    const ebitdaMargin = num(input.ebitdaMargin, 0) / 100;
    const grossMargin = num(input.grossMargin, 0) / 100;

    const cash = num(input.cashBalance, 0);
    const debt = num(input.totalDebt, 0);

    const discountRate = num(input.discountRate, 10) / 100;
    const terminalGrowthRate =
      num(input.terminalGrowthRate, 3) / 100;

    const currentPrice = num(input.currentSharePrice, 0);
    const shares = num(input.sharesOutstanding, 0);

    // =========================================================
    // BALANCE SHEET
    // =========================================================

    const expenses = hasValue(input.monthlyExpenses)
      ? num(input.monthlyExpenses)
      : rev * (1 - ebitdaMargin);

    const assets = hasValue(input.assets)
      ? num(input.assets)
      : cash;

    const liabilities = hasValue(input.liabilities)
      ? num(input.liabilities)
      : debt;

    const cashFlow = hasValue(input.cashFlow)
      ? num(input.cashFlow)
      : rev - expenses;

    // =========================================================
    // ACCOUNTING
    // =========================================================

    const netProfit = Number(
      (rev - expenses).toFixed(2)
    );

    const profitMargin = rev > 0
      ? Number(((netProfit / rev) * 100).toFixed(2))
      : 0;

    const netWorth = Number(
      (assets - liabilities).toFixed(2)
    );

    // =========================================================
    // MARKETING / UNIT ECONOMICS
    // =========================================================

    const marketingBudget = num(
      input.marketingBudget,
      0
    );

    const marketingSpend = num(
      input.marketingSpend,
      0
    );

    const customers = num(
      input.customers,
      0
    );

    const leads = num(
      input.leads,
      0
    );

    const cac = customers > 0 && marketingSpend > 0
      ? Number((marketingSpend / customers).toFixed(2))
      : 0;

    const ltv = customers > 0 && rev > 0
      ? Number(((rev * 1000000) / customers).toFixed(2))
      : 0;

    const ltvCacRatio = cac > 0
      ? Number((ltv / cac).toFixed(2))
      : 0;

    const roas = marketingSpend > 0
      ? Number(((rev * 1000000) / marketingSpend).toFixed(2))
      : 0;

    const conversionRate = leads > 0
      ? Number(((customers / leads) * 100).toFixed(2))
      : 0;

    // =========================================================
    // REVENUE PROJECTIONS
    // =========================================================

    const projectedRevenues = [];
    const projectedFCF = [];

    let currentRev = rev;

    for (let year = 1; year <= 5; year++) {
      currentRev = currentRev * (1 + growth);

      projectedRevenues.push(
        Number(currentRev.toFixed(2))
      );

      const fcf =
        currentRev *
        ebitdaMargin *
        0.75;

      projectedFCF.push(
        Number(fcf.toFixed(2))
      );
    }

    // =========================================================
    // DCF
    // =========================================================

    let pvFCFSum = 0;

    for (let i = 0; i < projectedFCF.length; i++) {
      const year = i + 1;

      const pv =
        projectedFCF[i] /
        Math.pow(1 + discountRate, year);

      pvFCFSum += pv;
    }

    let terminalValue = 0;

    if (discountRate > terminalGrowthRate) {
      const terminalYearFCF =
        projectedFCF[4] *
        (1 + terminalGrowthRate);

      terminalValue =
        terminalYearFCF /
        (discountRate - terminalGrowthRate);
    }

    const pvTerminalValue =
      terminalValue /
      Math.pow(1 + discountRate, 5);

    const dcfEnterpriseValue =
      pvFCFSum + pvTerminalValue;

    const dcfEquityValue =
      Math.max(
        0,
        dcfEnterpriseValue + cash - debt
      );

    const fairSharePrice =
      shares > 0
        ? dcfEquityValue / shares
        : 0;

    const priceUpsidePercent =
      currentPrice > 0
        ? ((fairSharePrice - currentPrice) /
            currentPrice) *
          100
        : 0;

    // =========================================================
    // RISK
    // =========================================================

    const financialRisk =
      num(input.financialRisk, 25);

    const marketRisk =
      num(input.marketRisk, 25);

    const operationalRisk =
      num(input.operationalRisk, 25);

    const regulatoryRisk =
      num(input.regulatoryRisk, 20);

    const techRisk =
      num(input.techRisk, 20);

    const overallRiskScore = Number(
      (
        financialRisk * 0.25 +
        marketRisk * 0.25 +
        operationalRisk * 0.20 +
        regulatoryRisk * 0.15 +
        techRisk * 0.15
      ).toFixed(1)
    );

    // =========================================================
    // HEALTH SCORE
    // =========================================================

    let healthScore = 50;

    healthScore +=
      Math.min(30, growth * 100 * 0.6);

    healthScore +=
      Math.min(25, ebitdaMargin * 100 * 0.8);

    healthScore +=
      Math.min(15, grossMargin * 100 * 0.2);

    if (debt > cash * 2) {
      healthScore -= 15;
    }

    if (cash > debt) {
      healthScore += 10;
    }

    healthScore -= overallRiskScore * 0.2;

    healthScore = Number(
      Math.max(
        0,
        Math.min(100, healthScore)
      ).toFixed(1)
    );

    // =========================================================
    // RECOMMENDATION
    // =========================================================

    let recommendation = 'HOLD';
    let recommendationColorHex = '#F2A93B';

    if (
      priceUpsidePercent >= 25 &&
      healthScore >= 65 &&
      overallRiskScore <= 45
    ) {
      recommendation = 'STRONG BUY';
      recommendationColorHex = '#10B981';
    } else if (
      priceUpsidePercent >= 10 &&
      healthScore >= 50 &&
      overallRiskScore <= 60
    ) {
      recommendation = 'BUY';
      recommendationColorHex = '#34D399';
    } else if (
      priceUpsidePercent < -15 ||
      healthScore < 35 ||
      overallRiskScore > 70
    ) {
      recommendation = 'SELL';
      recommendationColorHex = '#EF4444';
    }

    // =========================================================
    // COMPLETENESS
    // =========================================================

    const profileFields = [
      input.companyName,
      input.ticker,
      input.sector,
      input.industry,
      input.structure,
      input.foundingYear,
      input.country,
      input.city,
      input.website,
      input.businessEmail,
      input.businessPhone,
    ];

    const profileComp = this._percentageComplete(
      profileFields
    );

    const kycFields = [
      input.gstin,
      input.pan,
      input.cin,
      input.registrationNumber,
      input.registeredOfficeAddress,
    ];

    const kycComp = this._percentageComplete(
      kycFields
    );

    const teamFields = [
      input.founderName,
      input.businessExperience,
      input.headcount,
      input.coFounderNames?.length > 0,
    ];

    let teamComp = this._percentageComplete(
      teamFields
    );

    if (
      Array.isArray(input.teamMembers) &&
      input.teamMembers.length > 0
    ) {
      teamComp = Math.min(
        100,
        teamComp + 20
      );
    }

    const businessFields = [
      input.productsServices,
      input.products,
      input.services,
      input.operationsDescription,
      input.operations,
      input.targetAudience,
      input.businessExperience,
    ];

    const businessComp = this._percentageComplete(
      businessFields
    );

    const financialFields = [
      input.currentRevenue,
      input.monthlyExpenses,
      input.assets,
      input.liabilities,
      input.cashFlow,
      input.revenueGrowthRate,
      input.ebitdaMargin,
      input.grossMargin,
      input.cashBalance,
      input.totalDebt,
      input.discountRate,
      input.terminalGrowthRate,
      input.currentSharePrice,
      input.sharesOutstanding,
    ];

    const financialComp = this._percentageComplete(
      financialFields
    );

    const fundingFields = [
      input.minInvestment,
      input.maxInvestment,
      input.fundingRequired,
      input.equityOffered,
      input.valuation,
      input.expectedROI,
      input.valuationSource,
      input.valuationStatus,
    ];

    const fundingComp = this._percentageComplete(
      fundingFields
    );

    const marketingFields = [
      input.marketingBudget,
      input.marketingSpend,
      input.customers,
      input.leads,
      input.tam,
      input.sam,
      input.som,
    ];

    const marketingComp = this._percentageComplete(
      marketingFields
    );

    const swotCount =
      (input.swot?.strengths?.length || 0) +
      (input.swot?.weaknesses?.length || 0) +
      (input.swot?.opportunities?.length || 0) +
      (input.swot?.threats?.length || 0);

    const swotComp =
      swotCount >= 4
        ? 100
        : swotCount * 25;

    const pestleCount =
      (input.pestle?.political?.length || 0) +
      (input.pestle?.economic?.length || 0) +
      (input.pestle?.social?.length || 0) +
      (input.pestle?.technological?.length || 0) +
      (input.pestle?.legal?.length || 0) +
      (input.pestle?.environmental?.length || 0);

    const pestleComp =
      pestleCount >= 6
        ? 100
        : Math.round(
            (pestleCount / 6) * 100
          );

    const strategicComp = Math.round(
      (swotComp + pestleComp) / 2
    );

    const documentCount =
      Array.isArray(input.documents)
        ? input.documents.length
        : 0;

    const documentComp =
      Math.min(
        100,
        documentCount * 10
      );

    const assessmentComp =
      input.assessmentCompleted === true
        ? 100
        : 0;

    const overallComp = Math.round(
      (
        profileComp +
        kycComp +
        teamComp +
        businessComp +
        financialComp +
        fundingComp +
        marketingComp +
        strategicComp +
        documentComp +
        assessmentComp
      ) / 10
    );

    return {
      netProfit,
      profitMargin,
      netWorth,

      cac,
      ltv,
      ltvCacRatio,
      roas,
      conversionRate,

      healthScore,
      overallRiskScore,

      dcfEnterpriseValue:
        Number(dcfEnterpriseValue.toFixed(1)),

      dcfEquityValue:
        Number(dcfEquityValue.toFixed(1)),

      fairSharePrice:
        Number(fairSharePrice.toFixed(2)),

      priceUpsidePercent:
        Number(priceUpsidePercent.toFixed(1)),

      recommendation,
      recommendationColorHex,

      projectedRevenues,
      projectedFCF,

      completeness: {
        profile: profileComp,
        kyc: kycComp,
        team: teamComp,
        business: businessComp,
        financials: financialComp,
        funding: fundingComp,
        marketing: marketingComp,
        strategic: strategicComp,
        documents: documentComp,
        assessment: assessmentComp,
        overall: overallComp,
      },
    };
  }

  static _percentageComplete(fields) {
    if (!fields.length) return 0;

    const completed = fields.filter((value) => {
      if (typeof value === 'boolean') {
        return value;
      }

      if (typeof value === 'number') {
        return value !== 0;
      }

      return (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ''
      );
    }).length;

    return Math.round(
      (completed / fields.length) * 100
    );
  }
}