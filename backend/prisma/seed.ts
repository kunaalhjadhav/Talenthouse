import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial data...');
  const admin = await prisma.user.upsert({ where: { mobile: '9999999999' }, create: { mobile: '9999999999', name: 'Platform Super Admin', role: UserRole.SUPER_ADMIN, status: UserStatus.ACTIVE, wallet: { create: {} } }, update: {} });
  console.log('Super admin ready:', admin.mobile);

  await prisma.commissionRule.upsert({ where: { scope_key: { scope: 'CONTEST', key: 'GLOBAL' } }, create: { scope: 'CONTEST', key: 'GLOBAL', percentage: 25 }, update: {} });
  await prisma.commissionRule.upsert({ where: { scope_key: { scope: 'BOOKING', key: 'GLOBAL' } }, create: { scope: 'BOOKING', key: 'GLOBAL', percentage: 15 }, update: {} });
  await prisma.commissionRule.upsert({ where: { scope_key: { scope: 'VOTING', key: 'GLOBAL' } }, create: { scope: 'VOTING', key: 'GLOBAL', percentage: 20 }, update: {} });

  const contentCategories = ['Dance', 'Music', 'Singing', 'Acting', 'Stunts', 'Craft', 'Comedy', 'Fashion', 'Beauty', 'Cooking', 'Fitness', 'Sports', 'Gaming', 'Travel', 'Lifestyle', 'Vlog', 'Art', 'Photography', 'Tech', 'Kids', 'Pets', 'Mimicry', 'Motivation', 'Education', 'Other'];
  for (const [i, name] of contentCategories.entries()) {
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    await prisma.category.upsert({ where: { type_slug: { type: 'CONTEST', slug } }, create: { type: 'CONTEST', name, slug, sortOrder: i }, update: {} });
    await prisma.category.upsert({ where: { type_slug: { type: 'REEL', slug } }, create: { type: 'REEL', name, slug, sortOrder: i }, update: {} });
  }

  const talentCategories = ['Singer', 'Dancer', 'Actor', 'Comedian', 'MC/Anchor', 'DJ', 'Musician', 'Photographer', 'Videographer', 'Makeup Artist', 'Choreographer', 'Fitness Trainer', 'Magician', 'Model', 'Influencer', 'Other'];
  for (const [i, name] of talentCategories.entries()) {
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    await prisma.category.upsert({ where: { type_slug: { type: 'TALENT', slug } }, create: { type: 'TALENT', name, slug, sortOrder: i }, update: {} });
  }

  const auditionCategories = ['Movies', 'Web Series', 'TV', 'Advertisements', 'Music Videos', 'Modelling', 'Voice-over', 'Theatre', 'Dance Shows', 'Reality Shows', 'Other'];
  for (const [i, name] of auditionCategories.entries()) {
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    await prisma.category.upsert({ where: { type_slug: { type: 'AUDITION', slug } }, create: { type: 'AUDITION', name, slug, sortOrder: i }, update: {} });
  }

  console.log('Seeding complete.');
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
