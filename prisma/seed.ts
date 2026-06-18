import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";

const BCRYPT_ROUNDS = 12;

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@property.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const username = process.env.SEED_ADMIN_USERNAME ?? "super_admin";

  const superAdminRole = await prisma.role.findUnique({
    where: { name: "super_admin" },
  });

  if (!superAdminRole) {
    throw new Error("super_admin role not found. Run migrations first.");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const adminUser = await prisma.user.upsert({
    where: { email },
    update: {
      username,
      passwordHash,
      accountStatus: "ACTIVE",
      isLocked: false,
      loginAttempts: 0,
      lockedUntil: null,
    },
    create: {
      email,
      username,
      passwordHash,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: superAdminRole.id,
      },
    },
    update: { isActive: true },
    create: {
      userId: adminUser.id,
      roleId: superAdminRole.id,
      isActive: true,
    },
  });

  const viewerRole = await prisma.role.findUnique({ where: { name: "viewer" } });
  if (viewerRole) {
    const viewerEmail = "viewer@property.local";
    const viewerPasswordHash = await bcrypt.hash("Viewer123!", BCRYPT_ROUNDS);

    const viewerUser = await prisma.user.upsert({
      where: { email: viewerEmail },
      update: { passwordHash: viewerPasswordHash },
      create: {
        email: viewerEmail,
        username: "viewer_user",
        passwordHash: viewerPasswordHash,
      },
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: viewerUser.id,
          roleId: viewerRole.id,
        },
      },
      update: { isActive: true },
      create: {
        userId: viewerUser.id,
        roleId: viewerRole.id,
        isActive: true,
      },
    });

    console.log(`Viewer user seeded: ${viewerEmail} / Viewer123!`);
  }

  console.log(`Admin user seeded: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
