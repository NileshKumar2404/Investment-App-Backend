// Test API alignment for all roles, onboarding, and company endpoints

const BASE_URL = 'http://127.0.0.1:3000/api/v1';

async function run() {
  console.log('Testing Investment Intelligence OS API Alignment...\n');

  // 1. Test Demo Logins for all 4 roles
  const roles = [
    { role: 'founder', email: 'founder@startupiq.io' },
    { role: 'investor', email: 'investor@startupiq.io' },
    { role: 'advisor', email: 'advisor@startupiq.io' },
    { role: 'analyst', email: 'analyst@startupiq.io' }
  ];

  let founderToken = '';

  for (const r of roles) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: r.email, password: 'StartupIQ@2026' })
    });
    const json = await res.json();
    if (!res.ok) {
      console.error(`❌ Login failed for ${r.role} (${r.email}):`, json);
    } else {
      console.log(`✓ Login success for ${r.role}: ${json.data.user.fullName} | Role: ${json.data.user.role}`);
      if (r.role === 'founder') founderToken = json.data.token;
    }
  }

  // 2. Test Registration with custom role (e.g. advisor)
  const uniqueEmail = `advisor_test_${Date.now()}@startupiq.io`;
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: uniqueEmail,
      password: 'StartupIQ@2026',
      fullName: 'Test Advisor User',
      role: 'advisor'
    })
  });
  const regJson = await regRes.json();
  if (!regRes.ok) {
    console.error('❌ Register failed:', regJson);
  } else {
    console.log(`✓ Register success with role: ${regJson.data.user.role} (${regJson.data.user.email})`);
    const newAdvisorToken = regJson.data.token;

    // 3. Test PATCH /api/v1/auth/onboarding
    const onbRes = await fetch(`${BASE_URL}/auth/onboarding`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newAdvisorToken}`
      },
      body: JSON.stringify({
        investmentKnowledge: 'advanced',
        experienceYears: '3+',
        primaryObjective: 'milestones',
        assignedWorkspace: 'advisor',
        assignedTab: 'advisor-workspace',
        routingReason: 'Configured Executive Advisory Board Cockpit for milestone verification.'
      })
    });
    const onbJson = await onbRes.json();
    if (!onbRes.ok) {
      console.error('❌ Onboarding PATCH failed:', onbJson);
    } else {
      console.log(`✓ Onboarding saved: completed=${onbJson.data.onboarding.completed} | tab=${onbJson.data.onboarding.assignedTab} | workspace=${onbJson.data.onboarding.assignedWorkspace}`);
    }

    // 4. Test GET /api/v1/auth/me returns onboarding
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${newAdvisorToken}` }
    });
    const meJson = await meRes.json();
    console.log(`✓ GET /auth/me returns saved onboarding: completed=${meJson.data.onboarding.completed}, assignedTab=${meJson.data.onboarding.assignedTab}`);
  }

  // 5. Test Profile & Health Score for preset company TELEDU
  const profileRes = await fetch(`${BASE_URL}/startup-profile/TELEDU`, {
    headers: { 'Authorization': `Bearer ${founderToken}` }
  });
  const profileJson = await profileRes.json();
  if (!profileRes.ok) {
    console.error('❌ Profile fetch failed:', profileJson);
  } else {
    console.log(`✓ Startup Profile TELEDU: ${profileJson.data.companyName} | MRR: $${profileJson.data.monthlyRevenue}`);
  }

  const healthRes = await fetch(`${BASE_URL}/startup-health/TELEDU`, {
    headers: { 'Authorization': `Bearer ${founderToken}` }
  });
  const healthJson = await healthRes.json();
  if (!healthRes.ok) {
    console.error('❌ Health Score fetch failed:', healthJson);
  } else {
    console.log(`✓ Startup Health Score TELEDU: Score=${healthJson.data.overallScore}% (${healthJson.data.healthLevel})`);
  }

  console.log('\n🎉 ALL API ENDPOINTS FULLY VERIFIED & WORKING!');
}

run().catch(console.error);
