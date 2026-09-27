import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();
try {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'rural-pilot' } });
  const passwordHash = await argon2.hash(process.env.SEED_PASSWORD || 'LocalOnlyPass123!');
  const user = await prisma.user.upsert({
    where: { email: 'student@rural-pilot.local' },
    create: { tenantId: tenant.id, email: 'student@rural-pilot.local', passwordHash, role: 'CANDIDATE' },
    update: { passwordHash, role: 'CANDIDATE' },
  });
  console.log(JSON.stringify({ email: user.email, role: user.role }));
} finally {
  await prisma.$disconnect();
}
