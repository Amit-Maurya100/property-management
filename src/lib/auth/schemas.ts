import { z } from "zod";

const trimmedString = z.string().trim();

export const registerUserSchema = z
  .object({
    username: trimmedString.min(2, "Username must be at least 2 characters").max(100),
    email: trimmedString.email("Invalid email address").max(255),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    confirmPassword: z.string().min(8, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
