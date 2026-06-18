import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/security/login";

const CUSTOMER_ROLE_NAME = "customer";

export async function registerUser(data: {
  username: string;
  email: string;
  password: string;
}) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: data.email }, { username: data.username }] },
  });
  if (existing) {
    throw new Error("CONFLICT:An account with this email or username already exists");
  }

  const customerRole = await prisma.role.findUnique({
    where: { name: CUSTOMER_ROLE_NAME },
    select: { id: true },
  });
  if (!customerRole) {
    throw new Error("BAD_REQUEST:Registration is temporarily unavailable");
  }

  const passwordHash = await hashPassword(data.password);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username: data.username,
        email: data.email,
        passwordHash,
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      },
    });

    await tx.userRole.create({
      data: {
        userId: user.id,
        roleId: customerRole.id,
      },
    });

    return user;
  });
}
