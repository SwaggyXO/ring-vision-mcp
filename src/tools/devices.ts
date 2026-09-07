import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { RingClient } from '../client';
import { ListDevicesSchema, DeviceIdOrNameSchema } from '../schemas/devices';

interface ListDevicesArgs {
  includeOffline?: boolean;
}

interface DeviceIdArgs {
  deviceId: string;
}

export function registerDeviceTools(server: McpServer, client: RingClient): void {
  server.tool(
    'ring_list_devices',
    'List all connected Ring cameras and doorbells with online status and hardware capabilities.',
    ListDevicesSchema.shape,
    async (args: ListDevicesArgs) => {
      try {
        const devices = await client.listDevices(args.includeOffline ?? true);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(devices, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: error instanceof Error ? error.message : 'Failed to list Ring devices.',
            },
          ],
        };
      }
    }
  );

  server.tool(
    'ring_get_device_status',
    'Retrieve online/offline connectivity status and any device-reported telemetry (such as battery percentage or Wi-Fi signal metrics when available) by ID or name.',
    DeviceIdOrNameSchema.shape,
    async (args: DeviceIdArgs) => {
      const { deviceId } = args;
      try {
        const status = await client.getDeviceStatus(deviceId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: error instanceof Error ? error.message : `Failed to get status for device ${deviceId}.`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'ring_get_device_capabilities',
    'Inspect hardware and streaming capabilities (supported video codecs, max resolution, two-way audio, and image enhancements when reported by the camera) by ID or name.',
    DeviceIdOrNameSchema.shape,
    async (args: DeviceIdArgs) => {
      const { deviceId } = args;
      try {
        const capabilities = await client.getDeviceCapabilities(deviceId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(capabilities, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: error instanceof Error ? error.message : `Failed to get capabilities for device ${deviceId}.`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'ring_get_device_configurations',
    'Retrieve motion detection status, motion zones, and privacy zones for a Ring device by ID or name.',
    DeviceIdOrNameSchema.shape,
    async (args: DeviceIdArgs) => {
      const { deviceId } = args;
      try {
        const configurations = await client.getDeviceConfigurations(deviceId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(configurations, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: error instanceof Error ? error.message : `Failed to get configurations for device ${deviceId}.`,
            },
          ],
        };
      }
    }
  );
}
