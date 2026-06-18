import type { AttemptType } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

const loginAuditSelect = {
  id: true,
  email: true,
  attemptType: true,
  attemptTime: true,
  ipAddress: true,
  userAgent: true,
  failureReason: true,
  user: {
    select: {
      id: true,
      username: true,
      email: true,
    },
  },
} as const;

export type ListLoginAuditsOptions = {
  page?: number;
  limit?: number;
  search?: string;
  attemptType?: AttemptType;
};

export async function listLoginAudits(options: ListLoginAuditsOptions = {}) {
  const page = Math.max(options.page ?? 1, 1);
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const skip = (page - 1) * limit;

  const search = options.search?.trim();
  const where = {
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" as const } },
            {
              user: {
                is: {
                  username: { contains: search, mode: "insensitive" as const },
                },
              },
            },
            {
              user: {
                is: {
                  email: { contains: search, mode: "insensitive" as const },
                },
              },
            },
          ],
        }
      : {}),
    ...(options.attemptType ? { attemptType: options.attemptType } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.loginAudit.findMany({
      where,
      select: loginAuditSelect,
      orderBy: { attemptTime: "desc" },
      skip,
      take: limit,
    }),
    prisma.loginAudit.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
