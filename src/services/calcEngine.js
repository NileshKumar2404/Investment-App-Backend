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

    // 1. Calculate 5-Year Revenue & FCF Projections
    const projectedRevenues = [];
    const projectedFCF = [];
    let currentRev = rev;

    for (let yr = 1; yr <= 5; yr++) {
      currentRev = currentRev * (1 + growth);
      projectedRevenues.push(Number(currentRev.toFixed(2)));

      // Free Cash Flow estimated as 75% of EBITDA
      const fcf = currentRev * ebitdaMargin * 0.75;
      projectedFCF.push(Number(fcf.toFixed(2)));
    }

    // 2. DCF Valuation (Discounting 5-year FCFs)
    let pvFCFSum = 0.0;
    for (let i = 0; i < projectedFCF.length; i++) {
      const year = i + 1;
      const pv = projectedFCF[i] / Math.pow(1 + discountRate, year);
      pvFCFSum += pv;
    }

    // Terminal Value
    const terminalYearFCF = projectedFCF[4] * (1 + terminalGrowthRate);
    const terminalValue = terminalYearFCF / Math.max(0.01, discountRate - terminalGrowthRate);
    const pvTerminalValue = terminalValue / Math.pow(1 + discountRate, 5);

    const dcfEnterpriseValue = pvFCFSum + pvTerminalValue;
    const dcfEquityValue = Math.max(0, dcfEnterpriseValue + cash - debt);
    const fairSharePrice = shares > 0 ? dcfEquityValue / shares : 0.0;
    const priceUpsidePercent = currentPrice > 0 ? ((fairSharePrice - currentPrice) / currentPrice) * 100 : 0.0;

    // 3. Overall Risk Matrix Score (Weighted average of 5 sliders)
    const finRisk = input.financialRisk || 25.0;
    const mktRisk = input.marketRisk || 25.0;
    const opsRisk = input.operationalRisk || 25.0;
    const regRisk = input.regulatoryRisk || 20.0;
    const techRisk = input.techRisk || 20.0;

    const overallRiskScore = (finRisk * 0.25) + (mktRisk * 0.25) + (opsRisk * 0.20) + (regRisk * 0.15) + (techRisk * 0.15);

    // 4. Financial Health Score (0 - 100)
    let healthScore = 50.0;
    healthScore += Math.min(30, (growth * 100) * 0.6);
    healthScore += Math.min(25, (ebitdaMargin * 100) * 0.8);
    healthScore += Math.min(15, (grossMargin * 100) * 0.2);

    if (debt > cash * 2) healthScore -= 15;
    if (cash > debt) healthScore += 10;
    healthScore -= (overallRiskScore * 0.2);

    healthScore = Math.max(0.0, Math.min(100.0, healthScore));

    // 5. Investment Recommendation
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

    return {
      companyName: input.companyName || 'Unnamed Company',
      ticker: input.ticker || 'NEW',
      sector: input.sector || 'General Industry',
      currentRevenue: rev,
      revenueGrowthRate: input.revenueGrowthRate || 15.0,
      ebitdaMargin: input.ebitdaMargin || 20.0,
      grossMargin: input.grossMargin || 50.0,
      cashBalance: cash,
      totalDebt: debt,
      discountRate: input.discountRate || 10.0,
      terminalGrowthRate: input.terminalGrowthRate || 3.0,
      currentSharePrice: currentPrice,
      sharesOutstanding: shares,
      financialRisk: finRisk,
      marketRisk: mktRisk,
      operationalRisk: opsRisk,
      regulatoryRisk: regRisk,
      techRisk: techRisk,
      healthScore: Number(healthScore.toFixed(1)),
      overallRiskScore: Number(overallRiskScore.toFixed(1)),
      dcfEnterpriseValue: Number(dcfEnterpriseValue.toFixed(1)),
      dcfEquityValue: Number(dcfEquityValue.toFixed(1)),
      fairSharePrice: Number(fairSharePrice.toFixed(2)),
      priceUpsidePercent: Number(priceUpsidePercent.toFixed(1)),
      recommendation,
      recommendationColorHex,
      projectedRevenues,
      projectedFCF
    };
  }
}
