export function classifyViolationRecord(record) {
  const type = String(record?.violation_type || "").trim().toUpperCase();
  const hasNoHelmet = type.includes("NO HELMET");
  const hasTripleRiding = type.includes("TRIPLE RIDING");
  const legacyCombined = hasNoHelmet && hasTripleRiding;

  return {
    hasNoHelmet,
    hasTripleRiding,
    legacyCombined,
    displayType: legacyCombined
      ? "LEGACY COMBINED · NO HELMET + TRIPLE RIDING · REVIEW"
      : hasTripleRiding
        ? "POSSIBLE TRIPLE RIDING · REVIEW"
        : type || "UNKNOWN",
  };
}
