import { z } from "zod";

export const StandardFixtureSchema = z.object({
  id: z.string(),
  input: z.record(z.unknown()),
  expectedOutput: z.record(z.unknown()).optional(),
});

export type StandardFixture = z.infer<typeof StandardFixtureSchema>;

export function validateFixture(data: unknown): StandardFixture {
  const result = StandardFixtureSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid fixture data: ${result.error.message}`);
  }
  return result.data;
}
