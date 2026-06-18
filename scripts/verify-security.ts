import "dotenv/config";
import { authenticateUser } from "../src/lib/security/login";
import { prisma } from "../src/lib/db";
import { userHasPermissionInDb } from "../src/lib/permissions/db";

async function resetAdminLockout(email: string) {
  await prisma.user.updateMany({
    where: { email },
    data: {
      loginAttempts: 0,
      lockedUntil: null,
      isLocked: false,
      accountStatus: "ACTIVE",
    },
  });
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@property.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const viewerEmail = "viewer@property.local";

  console.log("1. Admin login...");
  const admin = await authenticateUser(adminEmail, adminPassword, {
    ip: "127.0.0.1",
    userAgent: "verify-script",
  });
  console.log(`   OK: ${admin.email}, roles=${admin.roles.join(",")}`);

  console.log("2. Failed login lockout (7 attempts)...");
  await resetAdminLockout(adminEmail);
  for (let attempt = 1; attempt <= 7; attempt += 1) {
    try {
      await authenticateUser(adminEmail, "wrong-password", { ip: "127.0.0.1" });
      throw new Error("Expected failure");
    } catch {
      // expected
    }
  }

  const lockedUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!lockedUser?.isLocked) {
    throw new Error("Admin should be locked after 7 failures");
  }
  console.log("   OK: account locked");

  const auditCount = await prisma.loginAudit.count({
    where: { email: adminEmail, attemptType: { in: ["FAILURE", "LOCKED"] } },
  });
  if (auditCount < 7) {
    throw new Error("Expected login audit entries for failures");
  }
  console.log(`   OK: ${auditCount} audit entries`);

  console.log("3. Permission checks...");
  const adminCanUpdate = await userHasPermissionInDb(admin.id, "user", "update");
  const viewer = await prisma.user.findUnique({ where: { email: viewerEmail } });
  if (!viewer) {
    throw new Error("Viewer user missing");
  }
  const viewerCanUpdate = await userHasPermissionInDb(viewer.id, "user", "update");

  if (!adminCanUpdate || viewerCanUpdate) {
    throw new Error("Permission mismatch for admin/viewer");
  }
  console.log("   OK: admin has user:update, viewer does not");

  console.log("4. Unlock admin and login again...");
  await resetAdminLockout(adminEmail);
  await authenticateUser(adminEmail, adminPassword);
  const unlocked = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (unlocked?.loginAttempts !== 0 || unlocked?.isLocked) {
    throw new Error("Successful login should reset lockout state");
  }
  console.log("   OK: login resets lockout");

  console.log("5. Admin unlock permission boundaries...");
  const { adminUnlockUser } = await import("../src/lib/security/login");
  const denied = await adminUnlockUser(viewer.id, adminEmail, "test");
  if (denied.success) {
    throw new Error("Viewer should not be allowed to unlock accounts");
  }
  const allowed = await adminUnlockUser(admin.id, viewerEmail, "test");
  if (!allowed.success) {
    throw new Error("Admin should be allowed to unlock accounts");
  }
  console.log("   OK: unlock permissions enforced");

  console.log("\nAll security verification checks passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
