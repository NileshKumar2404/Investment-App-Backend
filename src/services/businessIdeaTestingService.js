const EVIDENCE_SCORES = { NONE: 0, LOW: 35, MEDIUM: 70, HIGH: 100 };

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

export const decideHypothesis = (hypothesis, experiments = []) => {
  const completed = experiments.filter((experiment) => experiment.resultStatus !== "PLANNED");
  const successful = completed.filter((experiment) => experiment.resultStatus === "SUCCESS");
  const failed = completed.filter((experiment) => experiment.resultStatus === "FAILURE");
  const inconclusive = completed.filter((experiment) => experiment.resultStatus === "INCONCLUSIVE");

  if (completed.length === 0) {
    return {
      decision: "INCONCLUSIVE",
      confidence: 0,
      rationale: "No completed experiment is available yet.",
      recommendedNextAction: "Run an experiment that directly tests the stated success criteria.",
      status: "OPEN",
    };
  }

  const evidenceScore = completed.reduce(
    (sum, experiment) => sum + EVIDENCE_SCORES[experiment.evidenceQuality] / completed.length,
    0,
  );
  const successRate = successful.length / completed.length;
  const failureRate = failed.length / completed.length;
  const confidence = Math.round(clamp(evidenceScore * 0.5 + successRate * 50));

  if (successful.length > 0 && successRate >= 0.6 && evidenceScore >= 60) {
    return {
      decision: "VALIDATE",
      confidence,
      rationale: `${successful.length} of ${completed.length} completed experiments support the hypothesis with meaningful evidence.`,
      recommendedNextAction: "Increase sample size and validate the hypothesis with a larger customer or market segment.",
      status: "VALIDATED",
    };
  }

  if (failed.length > 0 && failureRate >= 0.6 && evidenceScore >= 50) {
    return {
      decision: "REJECT",
      confidence,
      rationale: `${failed.length} of ${completed.length} completed experiments contradict the hypothesis.`,
      recommendedNextAction: "Reject the assumption or replace it with a materially different hypothesis.",
      status: "REJECTED",
    };
  }

  if (inconclusive.length === completed.length || (successful.length > 0 && failed.length > 0)) {
    return {
      decision: "INCONCLUSIVE",
      confidence,
      rationale: "The available evidence is mixed or inconclusive and does not support a clear decision.",
      recommendedNextAction: "Run a more targeted experiment with a stronger success criterion and better evidence quality.",
      status: "INCONCLUSIVE",
    };
  }

  return {
    decision: "ITERATE",
    confidence,
    rationale: "The evidence shows a directional signal but is not strong enough for validation.",
    recommendedNextAction: "Refine the hypothesis and run the next experiment against the weakest assumption.",
    status: "ITERATE",
  };
};

export const calculateValidationReadiness = ({ hypotheses = [], experiments = [] }) => {
  const totalHypotheses = hypotheses.length;
  const testedHypotheses = hypotheses.filter((hypothesis) => experiments.some(
    (experiment) => experiment.hypothesisId?.toString() === hypothesis._id?.toString(),
  )).length;
  const completedExperiments = experiments.filter((experiment) => experiment.resultStatus !== "PLANNED");
  const successfulExperiments = completedExperiments.filter((experiment) => experiment.resultStatus === "SUCCESS");
  const highRiskUnresolved = hypotheses.filter((hypothesis) =>
    ["HIGH", "CRITICAL"].includes(hypothesis.riskLevel) &&
    !["VALIDATED", "REJECTED"].includes(hypothesis.status),
  ).length;

  const hypothesisCoverage = totalHypotheses > 0 ? testedHypotheses / totalHypotheses : 0;
  const experimentCompletion = experiments.length > 0 ? completedExperiments.length / experiments.length : 0;
  const evidenceQuality = completedExperiments.length > 0
    ? completedExperiments.reduce((sum, experiment) => sum + EVIDENCE_SCORES[experiment.evidenceQuality], 0) /
      completedExperiments.length / 100
    : 0;
  const successRate = completedExperiments.length > 0 ? successfulExperiments.length / completedExperiments.length : 0;
  const riskPenalty = totalHypotheses > 0 ? Math.min(0.3, highRiskUnresolved / totalHypotheses * 0.3) : 0;

  const score = Math.round(clamp(
    hypothesisCoverage * 25 +
    experimentCompletion * 25 +
    evidenceQuality * 25 +
    successRate * 25 -
    riskPenalty * 100,
  ));

  let verdict = "NOT_READY";
  if (score >= 75) verdict = "VALIDATION_READY";
  else if (score >= 50) verdict = "NEEDS_MORE_EVIDENCE";
  else if (score >= 25) verdict = "EARLY_VALIDATION";

  return {
    score,
    verdict,
    totalHypotheses,
    testedHypotheses,
    totalExperiments: experiments.length,
    completedExperiments: completedExperiments.length,
    successfulExperiments: successfulExperiments.length,
    highRiskUnresolved,
  };
};
