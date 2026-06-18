import { z } from "zod";

const trimmedString = z.string().trim();

function emptyToUndefined(value: unknown) {
  if (value === "" || value === null) {
    return undefined;
  }
  return value;
}

const roleIdsSchema = z
  .preprocess((value) => (value == null ? [] : value), z.array(z.string().uuid()))
  .default([]);

const permissionIdsSchema = z
  .preprocess((value) => (value == null ? [] : value), z.array(z.string().uuid()))
  .default([]);

export const createUserSchema = z.object({
  username: trimmedString.min(2, "Username must be at least 2 characters").max(100),
  email: trimmedString.email("Invalid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  roleIds: roleIdsSchema,
});

export const updateUserSchema = z.object({
  username: trimmedString.min(2, "Username must be at least 2 characters").max(100).optional(),
  email: trimmedString.email("Invalid email address").max(255).optional(),
  password: z.preprocess(
    emptyToUndefined,
    z.string().min(8, "Password must be at least 8 characters").max(128).optional(),
  ),
  accountStatus: z.enum(["ACTIVE", "LOCKED", "DISABLED", "EXPIRED"]).optional(),
  roleIds: roleIdsSchema.optional(),
});

export const createRoleSchema = z.object({
  name: trimmedString.min(2, "Role name must be at least 2 characters").max(100),
  description: z.preprocess(
    emptyToUndefined,
    trimmedString.max(500).optional(),
  ),
  permissionIds: permissionIdsSchema,
});

export const updateRoleSchema = z.object({
  name: trimmedString.min(2, "Role name must be at least 2 characters").max(100).optional(),
  description: z.preprocess(emptyToUndefined, trimmedString.max(500).nullable().optional()),
  permissionIds: permissionIdsSchema.optional(),
});

export const createPermissionSchema = z.object({
  resourceId: z.string().uuid("Select a valid resource"),
  actionId: z.string().uuid("Select a valid action"),
  description: z.preprocess(
    emptyToUndefined,
    trimmedString.max(500).optional(),
  ),
});

export const updatePermissionSchema = z.object({
  resourceId: z.string().uuid("Select a valid resource").optional(),
  actionId: z.string().uuid("Select a valid action").optional(),
  description: z.preprocess(emptyToUndefined, trimmedString.max(500).nullable().optional()),
});

export const createCatalogSchema = z.object({
  name: trimmedString.min(1, "Name is required").max(100),
  description: z.preprocess(
    emptyToUndefined,
    trimmedString.max(500).optional(),
  ),
  isActive: z.boolean().optional(),
});

export const updateCatalogSchema = z.object({
  name: trimmedString.min(1, "Name is required").max(100).optional(),
  description: z.preprocess(emptyToUndefined, trimmedString.max(500).nullable().optional()),
  isActive: z.boolean().optional(),
});

export const createActionCatalogSchema = z.object({
  name: trimmedString.min(1, "Name is required").max(50),
  description: z.preprocess(
    emptyToUndefined,
    trimmedString.max(500).optional(),
  ),
  isActive: z.boolean().optional(),
});

export const updateActionCatalogSchema = z.object({
  name: trimmedString.min(1, "Name is required").max(50).optional(),
  description: z.preprocess(emptyToUndefined, trimmedString.max(500).nullable().optional()),
  isActive: z.boolean().optional(),
});
