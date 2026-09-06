import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { RingClient } from '../client';
import { InitiateWhepStreamSchema, TerminateWhepStreamSchema } from '../schemas/stream';

interface InitiateWhepArgs {
  deviceId: string;
  sdpOffer: string;
}

interface TerminateWhepArgs {
  sessionUrl: string;
}

export function registerStreamTools(server: McpServer, client: RingClient): void {
  server.tool(
    'ring_initiate_whep_stream',
    'Start a live WebRTC WHEP video streaming session with a Ring camera by ID or name and exchanging a client SDP offer.',
    InitiateWhepStreamSchema.shape,
    async (args: InitiateWhepArgs) => {
      const { deviceId, sdpOffer } = args;
      try {
        const result = await client.initiateWhepStream(deviceId, sdpOffer);
        const responseData = {
          success: true,
          targetDevice: deviceId,
          sessionUrl: result.sessionUrl,
          sdpAnswer: result.sdpAnswer,
          instructions: 'WebRTC WHEP session established. Keep sessionUrl to terminate via ring_terminate_whep_stream when finished.',
        };
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(responseData, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: error instanceof Error ? error.message : `Failed to initiate WHEP stream for ${deviceId}.`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'ring_terminate_whep_stream',
    'Cleanly terminate an active WebRTC WHEP live streaming session using its session control URL.',
    TerminateWhepStreamSchema.shape,
    async (args: TerminateWhepArgs) => {
      const { sessionUrl } = args;
      try {
        const result = await client.terminateWhepStream(sessionUrl);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: error instanceof Error ? error.message : 'Failed to terminate WHEP stream.',
            },
          ],
        };
      }
    }
  );
}
