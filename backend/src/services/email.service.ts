import { User, AppraisalResult } from '@alamah/shared';

export async function sendWelcomeEmail(user: User, temporaryPassword: string): Promise<void> {
  console.log(`[EMAIL] Welcome email to ${user.email} (${user.name_en})`);
  console.log(`[EMAIL] Temporary password: ${temporaryPassword}`);
  console.log(`[EMAIL] Please log in and change your password immediately.`);
}

export async function sendCycleActivatedEmail(employee: User): Promise<void> {
  console.log(`[EMAIL] Cycle activated notification to ${employee.email} (${employee.name_en})`);
  console.log(`[EMAIL] A new performance cycle has been activated. Please log in to complete your self-assessment.`);
}

export async function sendEmployeeSubmittedEmail(manager: User, employee: User): Promise<void> {
  console.log(`[EMAIL] Self-assessment submitted — notifying manager ${manager.email} (${manager.name_en})`);
  console.log(`[EMAIL] ${employee.name_en} has submitted their self-assessment. Please log in to complete your rating.`);
}

export async function sendManagerSubmittedEmail(hrAdmin: User, employee: User): Promise<void> {
  console.log(`[EMAIL] Manager rating submitted — notifying HR Admin ${hrAdmin.email} (${hrAdmin.name_en})`);
  console.log(`[EMAIL] Manager rating for ${employee.name_en} has been submitted and is ready for calibration.`);
}

export async function sendCardFinalizedEmail(
  employee: User,
  manager: User,
  result: AppraisalResult,
): Promise<void> {
  console.log(`[EMAIL] Card finalized — notifying employee ${employee.email} (${employee.name_en})`);
  console.log(`[EMAIL] Your appraisal has been finalized. Total score: ${result.total_score} — ${result.rating_label}`);
  console.log(`[EMAIL] Card finalized — notifying manager ${manager.email} (${manager.name_en})`);
}
