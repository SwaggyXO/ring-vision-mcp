import { z } from 'zod';

export const ListDevicesSchema = z.object({
  includeOffline: z
    .boolean()
    .default(true)
    .describe('Whether to include offline or unreachable devices in the result list'),
});

export const DeviceIdOrNameSchema = z.object({
  deviceId: z
    .string()
    .min(1)
    .describe('The Ring device ID or name substring (e.g. "Front Door", "Backyard Cam")'),
});
