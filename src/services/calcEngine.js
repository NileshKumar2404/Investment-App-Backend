export class InvestmentCalcEngine {
  static calculate(input) {
    const rev = input.currentRevenue || 100.0;
    const growth = (input.revenueGrowthRate || 15.0) / 100.0;
    const ebitdaMargin = (input.ebitdaMargin || 20.0) / 100.0;
    const grossMargin = (input.grossMargin || 50.0) / 100.0;
    const cash = input.cashBalance || 20.0;
    const debt = input.totalDebt || 10.0;
    const discountRate = (input.discountRate || 10.0) / 100.0;
    const terminalGrowthRate = (input.terminalGrowthRate || 3.0) / 100.0;
    const currentPrice = input.currentSharePrice || 50.0;
    const shares = input.sharesOutstanding || 10.0;

    // Derived Balance & Profit Inputs
    const expenses = input.monthlyExpenses !== undefined ? input.monthlyExpenses : rev * (1 - ebitdaMargin);
    const assets = input.assets !== undefined ? input.assets : (cash + 130.0);
    const liabilities = input.liabilities !== undefined ? input.liabilities : (debt + 30.0);

    // 1. Authoritative Accounting Calculations
    const netProfit = Number((rev - expenses).toFixed(2));
    const profitMargin = rev > 0 ? Number(((netProfit / rev) * 100).toFixed(2)) : 0.0;
    const netWorth = Number((assets - liabilities).toFixed(2));

    // 2. Unit Economics & Marketing Performance
    const marketingSpend = input.marketingSpend || 15000;
    const customers = input.customers || 100;
    const leads = input.leads || 3000;

    const cac = customers > 0 ? Number((marketingSpend / customers).toFixed(2)) : (input.cac || 150.0);
    const ltv = customers > 0 ? Number(((rev * 10000) / customers).toFixed(2)) : (input.ltv || 1200.0);
    const ltvCacRatio = cac > 0 ? Number((ltv / cac).toFixed(1)) : (input.ltvCacRatio || 8.0);
    const roas = marketingSpend > 0 ? Number(((rev * 1000) / marketingSpend).toFixed(2)) : (input.roas || 4.5);
    const conversionRate = leads > 0 ? Number(((customers / leads) * 100).toFixed(2)) : (input.conversionRate || 3.2);

    // 3. 5-Year Revenue & FCF Projections
    const projectedRevenues = [];
    const projectedFCF = [];
    let currentRev = rev;

    for (let yr = 1; yr <= 5; yr++) {
      currentRev = currentRev * (1 + growth);
      projectedRevenues.push(Number(currentRev.toFixed(2)));

      const fcf = currentRev * ebitdaMargin * 0.75;
      projectedFCF.push(Number(fcf.toFixed(2)));
    }

    // 4. DCF Valuation
    let pvFCFSum = 0.0;
    for (let i = 0; i < projectedFCF.length; i++) {
      const year = i + 1;
      const pv = projectedFCF[i] / Math.pow(1 + discountRate, year);
      pvFCFSum += pv;
    }

    const terminalYearFCF = projectedFCF[4] * (1 + terminalGrowthRate);
    const terminalValue = terminalYearFCF / Math.max(0.01, discountRate - terminalGrowthRate);
    const pvTerminalValue = terminalValue / Math.pow(1 + discountRate, 5);

    const dcfEnterpriseValue = pvFCFSum + pvTerminalValue;
    const dcfEquityValue = Math.max(0, dcfEnterpriseValue + cash - debt);
    const fairSharePrice = shares > 0 ? dcfEquityValue / shares : 0.0;
    const priceUpsidePercent = currentPrice > 0 ? ((fairSharePrice - currentPrice) / currentPrice) * 100 : 0.0;

    // 5. Deterministic Risk Score
    const finRisk = input.financialRisk || 25.0;
    const mktRisk = input.marketRisk || 25.0;
    const opsRisk = input.operationalRisk || 25.0;
    const regRisk = input.regulatoryRisk || 20.0;
    const techRisk = input.techRisk || 20.0;

    const overallRiskScore = Number(((finRisk * 0.25) + (mktRisk * 0.25) + (opsRisk * 0.20) + (regRisk * 0.15) + (techRisk * 0.15)).toFixed(1));

    // 6. Deterministic Financial Health Score
    let healthScore = 50.0;
    healthScore += Math.min(30, (growth * 100) * 0.6);
    healthScore += Math.min(25, (ebitdaMargin * 100) * 0.8);
    healthScore += Math.min(15, (grossMargin * 100) * 0.2);

    if (debt > cash * 2) healthScore -= 15;
    if (cash > debt) healthScore += 10;
    healthScore -= (overallRiskScore * 0.2);

    healthScore = Number(Math.max(0.0, Math.min(100.0, healthScore)).toFixed(1));

    // 7. Investment Recommendation
    let recommendation = 'HOLD';
    let recommendationColorHex = '#F2A93B';

    if (priceUpsidePercent >= 25.0 && healthScore >= 65.0 && overallRiskScore <= 45.0) {
      recommendation = 'STRONG BUY';
      recommendationColorHex = '#10B981';
    } else if (priceUpsidePercent >= 10.0 && healthScore >= 50.0 && overallRiskScore <= 60.0) {
      recommendation = 'BUY';
      recommendationColorHex = '#34D399';
    } else if (priceUpsidePercent < -15.0 || healthScore < 35.0 || overallRiskScore > 70.0) {
      recommendation = 'SELL';
      recommendationColorHex = '#EF4444';
    }

    // 8. Section Completeness Breakdown
    const profileComp = (input.companyName && input.ticker && input.sector) ? 100 : 50;
    const kycComp = (input.gstin && input.pan && input.cin) ? 100 : 60;
    const teamComp = (input.founderName || (input.coFounderNames && input.coFounderNames.length > 0)) ? 90 : 40;
    const businessComp = (input.productsServices || input.operationsDescription) ? 95 : 50;
    const financialComp = (input.currentRevenue && input.ebitdaMargin) ? 100 : 70;
    const fundingComp = (input.fundingRequired && input.valuation) ? 90 : 50;
    const docComp = (input.documents && input.documents.length > 0) ? Math.min(100, input.documents.length * 25) : 40;
    const overallComp = Math.round((profileComp + kycComp + teamComp + businessComp + financialComp + fundingComp + docComp) / 7);

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
      dcfEnterpriseValue: Number(dcfEnterpriseValue.toFixed(1)),
      dcfEquityValue: Number(dcfEquityValue.toFixed(1)),
      fairSharePrice: Number(fairSharePrice.toFixed(2)),
      priceUpsidePercent: Number(priceUpsidePercent.toFixed(1)),
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
        documents: docComp,
        assessment: 75,
        overall: overallComp,
      },
    };
  }
}
