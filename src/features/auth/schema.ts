import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const registerSchema = z.object({
  email: z.email("Enter a valid email address."),
  // Matches the API's own bound so the user sees the error before the round trip.
  password: z.string().min(8, "Use at least 8 characters.").max(128),
  name: z.string().max(120).optional(),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
