import {
  resolveItemScore,
  calculateGoalsScore,
  calculateCompetenciesScore,
  calculateTotalScore,
  getRatingLabel,
  computeCardScores,
} from './scoring.service';

describe('resolveItemScore', () => {
  it('returns final_score when set', () => {
    expect(resolveItemScore({ employee_rating: 3, manager_rating: 4, final_score: 5 })).toBe(5);
  });

  it('averages employee and manager rating when no final_score', () => {
    expect(resolveItemScore({ employee_rating: 3, manager_rating: 5, final_score: null })).toBe(4);
  });

  it('returns null when ratings incomplete', () => {
    expect(resolveItemScore({ employee_rating: null, manager_rating: 4, final_score: null })).toBeNull();
    expect(resolveItemScore({ employee_rating: 4, manager_rating: null, final_score: null })).toBeNull();
    expect(resolveItemScore({ employee_rating: null, manager_rating: null, final_score: null })).toBeNull();
  });
});

describe('calculateGoalsScore', () => {
  it('returns null for empty array', () => {
    expect(calculateGoalsScore([])).toBeNull();
  });

  it('returns null when any item has incomplete scoring', () => {
    const goals = [
      { employee_rating: 4, manager_rating: 4, final_score: null },
      { employee_rating: null, manager_rating: 4, final_score: null },
      { employee_rating: 4, manager_rating: 4, final_score: null },
    ];
    expect(calculateGoalsScore(goals)).toBeNull();
  });

  it('calculates correctly: average(4,4,4) * 0.6 = 2.4', () => {
    const goals = [
      { employee_rating: 4, manager_rating: 4, final_score: null },
      { employee_rating: 4, manager_rating: 4, final_score: null },
      { employee_rating: 4, manager_rating: 4, final_score: null },
    ];
    expect(calculateGoalsScore(goals)).toBeCloseTo(2.4, 4);
  });

  it('uses final_score override', () => {
    const goals = [
      { employee_rating: 2, manager_rating: 2, final_score: 5 },
      { employee_rating: 4, manager_rating: 4, final_score: null },
      { employee_rating: 4, manager_rating: 4, final_score: null },
    ];
    // scores: [5, 4, 4] avg = 4.333... * 0.6
    expect(calculateGoalsScore(goals)).toBeCloseTo(2.6, 1);
  });
});

describe('calculateCompetenciesScore', () => {
  it('calculates correctly: average(3,3,3) * 0.4 = 1.2', () => {
    const comps = [
      { employee_rating: 3, manager_rating: 3, final_score: null },
      { employee_rating: 3, manager_rating: 3, final_score: null },
      { employee_rating: 3, manager_rating: 3, final_score: null },
    ];
    expect(calculateCompetenciesScore(comps)).toBeCloseTo(1.2, 4);
  });
});

describe('calculateTotalScore', () => {
  it('sums goals and competencies scores', () => {
    expect(calculateTotalScore(2.4, 1.6)).toBeCloseTo(4.0, 4);
  });
});

describe('getRatingLabel', () => {
  it('returns Exceptional for 5.0', () => {
    const label = getRatingLabel(5.0);
    expect(label.label_ar).toBe('استثنائي');
    expect(label.label_en).toBe('Exceptional');
  });

  it('returns Exceptional for 4.5', () => {
    expect(getRatingLabel(4.5).label_en).toBe('Exceptional');
  });

  it('returns Exceeds Expectations for 4.4', () => {
    expect(getRatingLabel(4.4).label_en).toBe('Exceeds Expectations');
  });

  it('returns Meets Expectations for 3.0', () => {
    expect(getRatingLabel(3.0).label_en).toBe('Meets Expectations');
  });

  it('returns Below Expectations for 2.0', () => {
    expect(getRatingLabel(2.0).label_en).toBe('Below Expectations');
  });

  it('returns Unsatisfactory for 1.0', () => {
    expect(getRatingLabel(1.0).label_en).toBe('Unsatisfactory');
  });
});

describe('computeCardScores', () => {
  it('returns null when scoring is incomplete', () => {
    const goals = [
      { employee_rating: null, manager_rating: 4, final_score: null },
      { employee_rating: 4, manager_rating: 4, final_score: null },
      { employee_rating: 4, manager_rating: 4, final_score: null },
    ];
    const comps = [
      { employee_rating: 3, manager_rating: 3, final_score: null },
      { employee_rating: 3, manager_rating: 3, final_score: null },
      { employee_rating: 3, manager_rating: 3, final_score: null },
    ];
    expect(computeCardScores(goals, comps)).toBeNull();
  });

  it('computes full score correctly', () => {
    const goals = [
      { employee_rating: 4, manager_rating: 4, final_score: null },
      { employee_rating: 4, manager_rating: 4, final_score: null },
      { employee_rating: 4, manager_rating: 4, final_score: null },
    ];
    const comps = [
      { employee_rating: 4, manager_rating: 4, final_score: null },
      { employee_rating: 4, manager_rating: 4, final_score: null },
      { employee_rating: 4, manager_rating: 4, final_score: null },
    ];
    const result = computeCardScores(goals, comps);
    expect(result).not.toBeNull();
    expect(result!.goals_score).toBeCloseTo(2.4, 4);
    expect(result!.competencies_score).toBeCloseTo(1.6, 4);
    expect(result!.total_score).toBeCloseTo(4.0, 4);
    expect(result!.rating_label).toContain('يتخطى التوقعات');
  });

  it('exceptional: all 5s gives total 5.0', () => {
    const items = (n: number) => Array(n).fill({ employee_rating: 5, manager_rating: 5, final_score: null });
    const result = computeCardScores(items(3), items(3));
    expect(result!.total_score).toBeCloseTo(5.0, 4);
    expect(result!.rating_label).toContain('استثنائي');
  });
});
