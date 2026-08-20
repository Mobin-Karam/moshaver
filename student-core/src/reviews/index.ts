export function nextReviewInterval(daysSinceLastReview: number): number {
  if (daysSinceLastReview <= 1) return 1;
  if (daysSinceLastReview <= 3) return 3;
  if (daysSinceLastReview <= 7) return 7;
  return 14;
}
