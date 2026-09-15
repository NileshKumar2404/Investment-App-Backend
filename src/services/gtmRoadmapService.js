const clamp = (value) => Math.max(0, Math.min(100, Number(value) || 0));

export const calculatePersonaPriority = (persona) => {
  const score = (
    clamp(persona.problemSeverity) * 0.25 +
    clamp(persona.abilityToPay) * 0.2 +
    clamp(persona.reachability) * 0.2 +
    clamp(persona.strategicFit) * 0.2 +
    (Number(persona.marketSize) > 0 ? 15 : 0)
  );
  const priorityScore = Math.round(clamp(score));
  const priority = priorityScore >= 80 ? "TOP" : priorityScore >= 60 ? "HIGH" : priorityScore >= 40 ? "MEDIUM" : "LOW";
  return { priorityScore, priority };
};

export const calculateChannelPriority = (channel) => {
  const reachScore = channel.estimatedReach > 0 ? Math.min(100, Math.log10(channel.estimatedReach + 1) * 20) : 0;
  const conversionScore = clamp(channel.conversionExpectation) * 0.3;
  const costScore = channel.estimatedCost <= 0 ? 30 : Math.max(0, 30 - Math.min(30, channel.expectedCac / Math.max(1, channel.estimatedCost) * 30));
  const priorityScore = Math.round(clamp(reachScore * 0.4 + conversionScore + costScore));
  return { priorityScore };
};

export const calculateGtmReadiness = ({ personas = [], channels = [], roadmapItems = [] }) => {
  const personaScore = personas.length === 0 ? 0 : Math.min(100, personas.length * 25);
  const topPersonaScore = personas.some((item) => item.priority === "TOP" || item.priority === "HIGH") ? 100 : personaScore;
  const channelScore = channels.length === 0 ? 0 : Math.min(100, channels.length * 20);
  const activeChannelScore = channels.some((item) => ["TESTING", "ACTIVE"].includes(item.status)) ? 100 : channelScore;
  const roadmapScore = Math.min(100, roadmapItems.length / 12 * 100);
  const completedWeeks = new Set(roadmapItems.filter((item) => item.status === "COMPLETED").map((item) => item.week)).size;
  const executionScore = Math.min(100, completedWeeks / 4 * 100);
  const readinessScore = Math.round(topPersonaScore * 0.3 + activeChannelScore * 0.25 + roadmapScore * 0.25 + executionScore * 0.2);
  const verdict = readinessScore >= 80 ? "GTM_READY" : readinessScore >= 60 ? "NEEDS_EXECUTION" : readinessScore >= 35 ? "NEEDS_PLANNING" : "NOT_READY";
  const nextActions = [];
  if (personas.length === 0) nextActions.push("Define and prioritize the first target persona.");
  if (channels.length === 0) nextActions.push("Select and score initial acquisition channels.");
  if (roadmapItems.length < 12) nextActions.push("Build the 12-week GTM roadmap.");
  if (completedWeeks === 0 && roadmapItems.length > 0) nextActions.push("Start executing the highest-priority roadmap item.");
  return { readinessScore, verdict, nextActions };
};
