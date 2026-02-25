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
  TRACE_STORE_MODE: z.enum(['file', 'memory']).default('file'),
  MAX_INPUT_CHARS: z
    .string()
    .default('400')
    .transform((value) => Number.parseInt(value, 10)),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return envSchema.parse(env);
}
