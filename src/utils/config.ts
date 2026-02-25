import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3000'),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  DEFAULT_LOCATION: z.string().default('New York, NY'),
  FEATURE_INCLUDE_REF_ID: z
    .string()
    .default('false')
    .transform((value) => value.toLowerCase() === 'true'),
  TRACE_STORE_PATH: z.string().default('./data/traces.jsonl'),
  TRACE_STORE_MODE: z.enum(['file', 'memory', 'postgres']).default('file'),
  DATABASE_URL: z.string().url().optional(),
  MAX_INPUT_CHARS: z
    .string()
    .default('400')
    .transform((value) => Number.parseInt(value, 10)),
}).superRefine((values, ctx) => {
  if (values.TRACE_STORE_MODE === 'postgres' && !values.DATABASE_URL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'DATABASE_URL is required when TRACE_STORE_MODE=postgres',
      path: ['DATABASE_URL'],
    });
  }
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return envSchema.parse(env);
}
