import { PrismaClient, UserRole, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial data...');

  // Super admin (log in via OTP using this mobile number in a dev/staging environment)
  const admin = await prisma.user.upsert({
    where: { mobile: '9999999999' },
    create: {
      mobile: '9999999999',
      name: 'Platform Super Admin',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      wallet: { create: {} },
    },
    update: {},
  });
  console.log('Super admin ready:', admin.mobile);

  // Default commission rules — matches PRD defaults, fully editable later from Admin Dashboard
  await prisma.commissionRule.upsert({
    where: { scope_key: { scope: 'CONTEST', key: 'GLOBAL' } },
    create: { scope: 'CONTEST', key: 'GLOBAL', percentage: 25 },
    update: {},
  });
  await prisma.commissionRule.upsert({
    where: { scope_key: { scope: 'BOOKING', key: 'GLOBAL' } },
    create: { scope: 'BOOKING', key: 'GLOBAL', percentage: 15 },
    update: {},
  });
  await prisma.commissionRule.upsert({
    where: { scope_key: { scope: 'VOTING', key: 'GLOBAL' } },
    create: { scope: 'VOTING', key: 'GLOBAL', percentage: 20 },
    update: {},
  });

  // Reel categories from PRD section 3.1
  const reelCategories = [
    'Singing', 'Dance', 'Acting', 'Comedy', 'Troll', 'Sports', 'Stunts', 'Challenges',
    'Fitness', 'Music', 'Instrumental', 'Mimicry', 'Stand-up', 'Fashion', 'Beauty',
    'Cooking', 'Gaming', 'Travel', 'Lifestyle', 'Kids', 'Pets', 'Educational', 'Other',
  ];
  for (const [i, name] of reelCategories.entries()) {
    await prisma.category.upsert({
      where: { type_slug: { type: 'REEL', slug: name.toLowerCase().replace(/\s+/g, '-') } },
      create: { type: 'REEL', name, slug: name.toLowerCase().replace(/\s+/g, '-'), sortOrder: i },
      update: {},
    });
  }

  // Talent categories from PRD section 14
  const talentCategories = [
    'Singer', 'Dancer', 'Actor', 'Comedian', 'MC/Anchor', 'DJ', 'Musician', 'Photographer',
    'Videographer', 'Makeup Artist', 'Choreographer', 'Fitness Trainer', 'Magician',
    'Performer', 'Model', 'Influencer', 'Content Creator', 'Other',
  ];
  for (const [i, name] of talentCategories.entries()) {
    await prisma.category.upsert({
      where: { type_slug: { type: 'TALENT', slug: name.toLowerCase().replace(/\s+/g, '-') } },
      create: { type: 'TALENT', name, slug: name.toLowerCase().replace(/\s+/g, '-'), sortOrder: i },
      update: {},
    });
  }

  // Audition categories (PRD §11)
  const auditionCategories = [
    'Movies', 'Web Series', 'TV', 'Advertisements', 'Music Videos', 'Events',
    'Dance Shows', 'Reality Shows', 'Theatre', 'Modelling', 'Voice-over',
    'Photography', 'Influencer Campaigns', 'Brand Campaigns', 'Other',
  ];
  for (const [i, name] of auditionCategories.entries()) {
    await prisma.category.upsert({
      where: { type_slug: { type: 'AUDITION', slug: name.toLowerCase().replace(/\s+/g, '-') } },
      create: { type: 'AUDITION', name, slug: name.toLowerCase().replace(/\s+/g, '-'), sortOrder: i },
      update: {},
    });
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
