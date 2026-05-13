export type Role = 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE';
export type CycleStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';
export type CardStatus = 'PENDING' | 'EMPLOYEE_SUBMITTED' | 'MANAGER_SUBMITTED' | 'FINAL';
export type Quarter = 'Q1' | 'Q3';

export interface User {
  id: string;
  name_ar: string;
  name_en: string;
  email: string;
  role: Role;
  manager_id: string | null;
  department: string;
  is_active: boolean;
  force_password_change: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppraisalResult {
  id: string;
  card_id: string;
  goals_score: number;
  competencies_score: number;
  total_score: number;
  rating_label: string;
  hr_notes: string;
  finalized_by: string;
  finalized_at: string;
}

export const RATING_LABELS: Array<{ min: number; max: number; label_ar: string; label_en: string }> = [
  { min: 4.5, max: 5.0, label_ar: 'استثنائي', label_en: 'Exceptional' },
  { min: 3.5, max: 4.4, label_ar: 'يتخطى التوقعات', label_en: 'Exceeds Expectations' },
  { min: 2.5, max: 3.4, label_ar: 'يحقق التوقعات', label_en: 'Meets Expectations' },
  { min: 1.5, max: 2.4, label_ar: 'دون التوقعات', label_en: 'Below Expectations' },
  { min: 1.0, max: 1.4, label_ar: 'غير مقبول', label_en: 'Unsatisfactory' },
];
