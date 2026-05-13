import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set');
  }

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const password_hash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        name_ar: 'الموارد البشرية',
        name_en: 'HR Admin',
        email: adminEmail,
        password_hash,
        role: Role.HR_ADMIN,
        department: 'HR',
        is_active: true,
        force_password_change: false,
      },
    });
    console.log(`Seeded HR Admin: ${adminEmail}`);
  }

  const templates = [
    { title_ar: 'الاحترافية', title_en: 'Professionalism', description: '' },
    { title_ar: 'التعاون', title_en: 'Collaboration', description: '' },
    { title_ar: 'المبادرة والإبداع', title_en: 'Initiative & Creativity', description: '' },
  ];

  for (const template of templates) {
    const exists = await prisma.competencyTemplate.findFirst({
      where: { title_en: template.title_en },
    });
    if (!exists) {
      await prisma.competencyTemplate.create({ data: template });
    }
  }
  console.log('Seeded competency templates');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
