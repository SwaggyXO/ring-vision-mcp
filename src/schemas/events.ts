import { z } from 'zod';

export const QueryEventHistorySchema = z.object({
  deviceId: z
    .string()
    .optional()
    .describe('Optional Ring device ID or name. If omitted, aggregates recent events across all account devices'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10)
    .describe('Maximum number of past events to retrieve from the official history API'),
});
