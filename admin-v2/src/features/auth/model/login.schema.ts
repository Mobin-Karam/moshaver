import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(1, "نام کاربری لازم است"),
  password: z.string().min(1, "رمز عبور لازم است"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
