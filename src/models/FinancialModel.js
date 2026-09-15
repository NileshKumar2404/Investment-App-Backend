import mongoose from "mongoose";

const financialModelSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    horizonMonths: { type: Number, enum: [12], default: 12 },
    assumptions: {
      startingMrr: { type: Number, required: true, min: 0 },
      monthlyGrowthRate: { type: Number, required: true, min: -100, max: 1000 },
      grossMargin: { type: Number, required: true, min: 0, max: 100 },
      monthlyFixedCosts: { type: Number, required: true, min: 0 },
      monthlyVariableCostRate: { type: Number, required: true, min: 0, max: 100 },
      startingCash: { type: Number, required: true, min: 0 },
      monthlyNewCustomers: { type: Number, default: 0, min: 0 },
      averageRevenuePerCustomer: { type: Number, default: 0, min: 0 },
      oneTimeFunding: { type: Number, default: 0, min: 0 },
    },
    forecast: [
      {
        month: { type: Number, required: true, min: 1, max: 12 },
        revenue: { type: Number, required: true, min: 0 },
        grossProfit: { type: Number, required: true, min: 0 },
        operatingExpenses: { type: Number, required: true, min: 0 },
        netProfit: { type: Number, required: true },
        cashFlow: { type: Number, required: true },
        endingCash: { type: Number, required: true },
        cumulativeRevenue: { type: Number, required: true, min: 0 },
      },
    ],
    summary: {
      annualRevenue: { type: Number, default: 0 },
      annualGrossProfit: { type: Number, default: 0 },
      annualOperatingExpenses: { type: Number, default: 0 },
      annualNetProfit: { type: Number, default: 0 },
      endingCash: { type: Number, default: 0 },
      averageMonthlyBurn: { type: Number, default: 0 },
      runwayMonths: { type: Number, default: null },
      breakEvenMonth: { type: Number, default: null },
      profitableMonths: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

financialModelSchema.index({ companyId: 1, createdAt: -1 });

export default mongoose.model("FinancialModel", financialModelSchema);
