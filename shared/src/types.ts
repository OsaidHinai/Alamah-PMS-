export type Role = 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'CEO';

export type CycleStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';

export type CardStatus =
  | 'PENDING'
  | 'EMPLOYEE_SUBMITTED'
  | 'MANAGER_SUBMITTED'
  | 'GOALS_SUBMITTED'
  | 'GOALS_APPROVED'
  | 'REVIEW_SUBMITTED'
  | 'MANAGER_REVIEWED'
  | 'FINAL';

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

export interface PerformanceCycle {
  id: string;
  name: string;
  year: number;
  status: CycleStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  phase1_start: string | null;
  phase1_end: string | null;
  phase2_start: string | null;
  phase2_end: string | null;
}

export interface Goal {
  id: string;
  card_id: string;
  order: number;
  title_ar: string;
  title_en: string;
  description: string;
  weight: number;
  employee_rating: number | null;
  employee_comment: string | null;
  manager_rating: number | null;
  manager_comment: string | null;
  final_score: number | null;
}

export interface Competency {
  id: string;
  card_id: string;
  order: number;
  title_ar: string;
  title_en: string;
  description: string;
  weight: number;
  employee_rating: number | null;
  employee_comment: string | null;
  manager_rating: number | null;
  manager_comment: string | null;
  final_score: number | null;
}

export interface NextCycleGoal {
  id: string;
  card_id: string;
  order: number;
  title_ar: string;
  title_en: string;
  description: string;
  created_at: string;
}

export interface PerformanceCard {
  id: string;
  cycle_id: string;
  employee_id: string;
  status: CardStatus;
  goals_manager_comment: string | null;
  created_at: string;
  updated_at: string;
  employee?: User;
  goals?: Goal[];
  competencies?: Competency[];
  next_cycle_goals?: NextCycleGoal[];
}

export interface CheckIn {
  id: string;
  card_id: string;
  quarter: Quarter;
  notes: string;
  submitted_by: string;
  submitted_at: string;
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

export interface CompetencyTemplate {
  id: string;
  title_ar: string;
  title_en: string;
  description: string;
}

export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: Omit<User, 'password_hash'>;
}

export interface ChangePasswordRequest {
  new_password: string;
  confirm_password: string;
}

export interface CreateUserRequest {
  name_ar: string;
  name_en: string;
  email: string;
  role: Role;
  manager_id?: string;
  department: string;
}

export interface CreateCycleRequest {
  name: string;
  year: number;
}

export interface UpdateGoalRequest {
  title_ar?: string;
  title_en?: string;
  description?: string;
  weight?: number;
  employee_rating?: number;
  employee_comment?: string;
  manager_rating?: number;
  manager_comment?: string;
  final_score?: number;
}

export interface UpdateCompetencyRequest {
  title_ar?: string;
  title_en?: string;
  description?: string;
  weight?: number;
  employee_rating?: number;
  employee_comment?: string;
  manager_rating?: number;
  manager_comment?: string;
  final_score?: number;
}

export interface FinalizeCardRequest {
  hr_notes: string;
}

export interface CreateCheckInRequest {
  quarter: Quarter;
  notes: string;
}

export const RATING_LABELS: Array<{ min: number; max: number; label_ar: string; label_en: string }> = [
  { min: 4.5, max: 5.0, label_ar: 'استثنائي', label_en: 'Exceptional' },
  { min: 3.5, max: 4.4, label_ar: 'يتخطى التوقعات', label_en: 'Exceeds Expectations' },
  { min: 2.5, max: 3.4, label_ar: 'يحقق التوقعات', label_en: 'Meets Expectations' },
  { min: 1.5, max: 2.4, label_ar: 'دون التوقعات', label_en: 'Below Expectations' },
  { min: 1.0, max: 1.4, label_ar: 'غير مقبول', label_en: 'Unsatisfactory' },
];
