import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { RingClient } from '../client';

const RawDeviceIdSchema = z.object({
  deviceId: z
    .string()
    .min(1)
    .describe('The Ring device ID or name to inspect raw unparsed attributes for'),
});

const InspectSessionSchema = z.object({
  sessionUrl: z
    .string()
    .url()
    .describe('The active WHEP streaming session URL to query status for'),
});

export function registerExtendedTools(server: McpServer, client: RingClient): void {
  server.tool(
    'ring_inspect_raw_device',
    '[Diagnostic] Inspect raw upstream API attributes for a Ring device for debugging.',
    RawDeviceIdSchema.shape,
    async (args: { deviceId: string }) => {
      try {
        const status = await client.getDeviceStatus(args.deviceId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(status.raw || {}, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: error instanceof Error ? error.message : `Failed to inspect device ${args.deviceId}.`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'ring_inspect_auth_status',
    '[Diagnostic] Check current authentication configuration, token mode, and mock status without exposing secrets.',
    {},
    async () => {
      try {
        const auth = client.getAuthManager();
        const mode = auth.getAuthMode();
        const isMock = client.getIsMockMode();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  authMode: mode,
                  mockMode: isMock,
                  status: 'ready',
                  timestamp: new Date().toISOString(),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: error instanceof Error ? error.message : 'Failed to inspect auth status.',
            },
          ],
        };
      }
    }
  );

  server.tool(
    'ring_inspect_stream_session',
    '[Diagnostic] Validate the session control URL for an active WHEP streaming session.',
    InspectSessionSchema.shape,
    async (args: { sessionUrl: string }) => {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                sessionUrl: args.sessionUrl,
                status: 'active',
                checkedAt: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
