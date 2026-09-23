import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/investment_os';

const DEMO_USERS = [
  {
    email: 'founder@startupiq.io',
    password: 'StartupIQ@2026',
    fullName: 'Alex Morgan',
    role: 'founder',
    country: 'India',
    phone: '+91-9876543210',
    subscription: { plan: 'founder_pro', status: 'active', billingCycle: 'monthly' },
    onboarding: {
      completed: true,
      investmentKnowledge: 'intermediate',
      experienceYears: '1-3',
      primaryObjective: 'fundraise',
      assignedWorkspace: 'founder',
      assignedTab: 'overview',
      routingReason: 'Your Founder Cockpit is initialized with health score metrics, lean testing, and valuation tools.',
      completedAt: new Date()
    }
  },
  {
    email: 'investor@startupiq.io',
    password: 'StartupIQ@2026',
    fullName: 'Victoria Sterling',
    role: 'investor',
    country: 'India',
    phone: '+91-9876543211',
    subscription: { plan: 'investor_pro', status: 'active', billingCycle: 'monthly' },
    onboarding: {
      completed: true,
      investmentKnowledge: 'advanced',
      experienceYears: '3+',
      primaryObjective: 'portfolio',
      assignedWorkspace: 'investor',
      assignedTab: 'investor-portfolio',
      routingReason: 'Your institutional Investor Portfolio and Live Deal Room pipeline are ready for active capital management.',
      completedAt: new Date()
    }
  },
  {
    email: 'advisor@startupiq.io',
    password: 'StartupIQ@2026',
    fullName: 'Dr. Sarah Jenkins',
    role: 'advisor',
    country: 'India',
    phone: '+91-9876543212',
    subscription: { plan: 'all_access_pro', status: 'active', billingCycle: 'monthly' },
    onboarding: {
      completed: true,
      investmentKnowledge: 'advanced',
      experienceYears: '3+',
      primaryObjective: 'milestones',
      assignedWorkspace: 'advisor',
      assignedTab: 'advisor-workspace',
      routingReason: 'Your Advisory Cockpit is ready to track founder quarterly OKRs, review health diagnostics, and verify milestones.',
      completedAt: new Date()
    }
  },
  {
    email: 'analyst@startupiq.io',
    password: 'StartupIQ@2026',
    fullName: 'Marcus Vance',
    role: 'analyst',
    country: 'India',
    phone: '+91-9876543213',
    subscription: { plan: 'all_access_pro', status: 'active', billingCycle: 'monthly' },
    onboarding: {
      completed: true,
      investmentKnowledge: 'advanced',
      experienceYears: '3+',
      primaryObjective: 'screener',
      assignedWorkspace: 'analyst',
      assignedTab: 'analyst-workspace',
      routingReason: 'Your quantitative diligence workbench is initialized with burn multiples, DCF sensitivity, and peer cohort comparisons.',
      completedAt: new Date()
    }
  }
];

const PRESET_COMPANIES = [
  {
    ticker: 'TELEDU',
    companyName: 'Teledu Global Inc',
    stage: 'Series A',
    industry: 'Enterprise AI & EdTech',
    sector: 'Technology',
    businessModel: 'B2B SaaS / Enterprise License',
    revenueModel: 'Annual Subscription + Usage',
    targetCustomer: 'Mid-Market and Enterprise Organizations',
    currentRevenue: 1440000,
    monthlyRevenue: 120000,
    monthlyExpenses: 85000,
    monthlyBurn: 85000,
    cashBalance: 950000,
    cashAvailable: 950000,
    assets: 1400000,
    liabilities: 220000,
    totalDebt: 100000,
    valuation: 18500000,
    growthRate: 24,
    revenueGrowthRate: 24,
    grossMargin: 78,
    ebitdaMargin: 18,
    churnRate: 1.8,
    cac: 650,
    ltv: 5200,
    customers: 340,
    isPreset: true,
    status: 'ACTIVE'
  },
  {
    ticker: 'ALPH',
    companyName: 'AlphaTech Solutions',
    stage: 'Seed',
    industry: 'B2B Cloud Infrastructure',
    sector: 'Technology',
    businessModel: 'B2B SaaS / API Tier',
    monthlyRevenue: 45000,
    monthlyBurn: 32000,
    cashAvailable: 420000,
    growthRate: 18,
    grossMargin: 82,
    churnRate: 2.2,
    customers: 160,
    isPreset: true,
    status: 'ACTIVE'
  },
  {
    ticker: 'TELE',
    companyName: 'teledu',
    stage: 'Seed',
    industry: 'Enterprise Software',
    sector: 'Technology',
    isPreset: true,
    status: 'ACTIVE'
  }
];

async function seed() {
  console.log('Connecting to MongoDB:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection;

  // 1. Seed or update demo users
  const salt = await bcrypt.genSalt(10);
  for (const u of DEMO_USERS) {
    const hashedPassword = await bcrypt.hash(u.password, salt);
    const existing = await db.collection('users').findOne({ email: u.email });
    if (existing) {
      await db.collection('users').updateOne(
        { _id: existing._id },
        {
          $set: {
            password: hashedPassword,
            fullName: u.fullName,
            role: u.role,
            accountStatus: 'Active',
            verified: true,
            subscription: u.subscription,
            onboarding: u.onboarding,
            phone: u.phone,
            country: u.country
          }
        }
      );
      console.log(`✓ Updated demo user: ${u.email} (${u.role})`);
    } else {
      await db.collection('users').insertOne({
        ...u,
        password: hashedPassword,
        accountStatus: 'Active',
        verified: true,
        loginCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`✓ Created demo user: ${u.email} (${u.role})`);
    }
  }

  // 2. Seed or update preset companies
  for (const c of PRESET_COMPANIES) {
    const existing = await db.collection('companies').findOne({ ticker: c.ticker });
    if (existing) {
      await db.collection('companies').updateOne(
        { _id: existing._id },
        { $set: { ...c, updatedAt: new Date() } }
      );
      console.log(`✓ Updated preset company: ${c.ticker} (${c.companyName})`);
    } else {
      await db.collection('companies').insertOne({
        ...c,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`✓ Created preset company: ${c.ticker} (${c.companyName})`);
    }
  }

  await mongoose.disconnect();
  console.log('🎉 Seeding successfully completed!');
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
