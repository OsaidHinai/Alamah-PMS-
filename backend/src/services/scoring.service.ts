import { RATING_LABELS } from '@alamah/shared';

export interface ScoringItem {
  employee_rating: number | null;
  manager_rating: number | null;
  final_score: number | null;
}

export function resolveItemScore(item: ScoringItem): number | null {
  if (item.final_score !== null) return Number(item.final_score);
  if (item.employee_rating !== null && item.manager_rating !== null) {
    return (item.employee_rating + item.manager_rating) / 2;
  }
  return null;
}

export function calculateGoalsScore(goals: ScoringItem[]): number | null {
  if (goals.length === 0) return null;
  const scores = goals.map(resolveItemScore);
  if (scores.some((s) => s === null)) return null;
  const avg = (scores as number[]).reduce((sum, s) => sum + s, 0) / scores.length;
  return parseFloat((avg * 0.6).toFixed(4));
}

export function calculateCompetenciesScore(competencies: ScoringItem[]): number | null {
  if (competencies.length === 0) return null;
  const scores = competencies.map(resolveItemScore);
  if (scores.some((s) => s === null)) return null;
  const avg = (scores as number[]).reduce((sum, s) => sum + s, 0) / scores.length;
  return parseFloat((avg * 0.4).toFixed(4));
}

export function calculateTotalScore(goalsScore: number, competenciesScore: number): number {
  return parseFloat((goalsScore + competenciesScore).toFixed(4));
}

export function getRatingLabel(totalScore: number): { label_ar: string; label_en: string } {
  for (const entry of RATING_LABELS) {
    if (totalScore >= entry.min && totalScore <= entry.max) {
      return { label_ar: entry.label_ar, label_en: entry.label_en };
    }
  }
  return { label_ar: 'غير محدد', label_en: 'Undetermined' };
}

export interface ScoreResult {
  goals_score: number;
  competencies_score: number;
  total_score: number;
  rating_label: string;
}

export function computeCardScores(goals: ScoringItem[], competencies: ScoringItem[]): ScoreResult | null {
  const goalsScore = calculateGoalsScore(goals);
  const competenciesScore = calculateCompetenciesScore(competencies);
  if (goalsScore === null || competenciesScore === null) return null;
  const totalScore = calculateTotalScore(goalsScore, competenciesScore);
  const { label_ar, label_en } = getRatingLabel(totalScore);
  return {
    goals_score: goalsScore,
    competencies_score: competenciesScore,
    total_score: totalScore,
    rating_label: `${label_ar} (${label_en})`,
  };
}
