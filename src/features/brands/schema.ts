import { z } from "zod";
import { POST_FORMATS } from "@/lib/formats";

export const brandSchema = z.object({
  name: z.string().min(1, "Give the brand a name.").max(120),
  tagline: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  website: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^https?:\/\/\S+$/i.test(value), {
      message: "Use a full URL, e.g. https://example.com",
    }),
  logo: z.string().trim().optional(),
  // Order matters: the first enabled format is the default for new posts.
  formats: z.array(z.enum(POST_FORMATS)).min(1, "Pick at least one format."),
});

export type BrandValues = z.infer<typeof brandSchema>;
