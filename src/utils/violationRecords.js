export function classifyViolationRecord(record) {
  const type = String(record?.violation_type || "").trim().toUpperCase();
  const hasNoHelmet = type.includes("NO HELMET");
  const hasTripleRiding = type.includes("TRIPLE RIDING");
  const legacyCombined = hasNoHelmet && hasTripleRiding;
  const tripleConfirmed = hasTripleRiding && type.includes("CONFIRMED");
  const tripleDismissed = hasTripleRiding && type.includes("DISMISSED");
  const requiresTripleReview = hasTripleRiding && !tripleConfirmed && !tripleDismissed;

  return {
    hasNoHelmet,
    hasTripleRiding,
    legacyCombined,
    tripleConfirmed,
    tripleDismissed,
    requiresTripleReview,
    displayType: legacyCombined
      ? tripleConfirmed
        ? "NO HELMET + TRIPLE RIDING · CONFIRMED"
        : "LEGACY COMBINED · NO HELMET + TRIPLE RIDING · REVIEW"
      : tripleConfirmed
        ? "TRIPLE RIDING · CONFIRMED"
        : tripleDismissed
          ? "TRIPLE RIDING · DISMISSED"
          : hasTripleRiding
            ? "POSSIBLE TRIPLE RIDING · REVIEW"
            : type || "UNKNOWN",
  };
}
