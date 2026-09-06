import { RingAuthManager } from './auth';
import {
  RingDevice,
  DeviceStatus,
  DeviceCapabilities,
  DeviceConfigurations,
  EventHistoryItem,
  WhepSessionResult,
} from './types';
import {
  MOCK_DEVICES,
  getMockDeviceStatus,
  getMockCapabilities,
  getMockConfigurations,
  getMockEvents,
  MOCK_WHEP_SESSION,
} from './mock';
import {
  parseDeviceList,
  parseDeviceStatus,
  parseEventHistory,
  parseDeviceCapabilities,
  parseDeviceConfigurations,
} from './parsers';

export interface RingClientOptions {
  apiBase?: string;
  authManager?: RingAuthManager;
  mockMode?: boolean;
}

export class RingClient {
  private apiBase: string;
  private authManager: RingAuthManager;
  private isMockMode: boolean;

  constructor(options?: RingClientOptions) {
    this.apiBase = options?.apiBase || process.env.RING_API_BASE || 'https://api.amazonvision.com';
    this.authManager = options?.authManager || new RingAuthManager();
    this.isMockMode = options?.mockMode ?? (process.env.RING_MOCK_MODE === 'true');
  }

  getAuthManager(): RingAuthManager {
    return this.authManager;
  }

  getIsMockMode(): boolean {
    return this.isMockMode;
  }

  async resolveDeviceId(deviceIdOrName: string): Promise<string> {
    const devices = await this.listDevices(true);
    const exact = devices.find((d) => d.id === deviceIdOrName);
    if (exact) {
      return exact.id;
    }

    const lower = deviceIdOrName.toLowerCase().trim();
    const matched = devices.find((d) => d.name.toLowerCase().includes(lower));
    if (matched) {
      return matched.id;
    }

    return deviceIdOrName;
  }

  private async fetchApi(path: string, init?: RequestInit): Promise<Response> {
    const token = await this.authManager.getAccessToken();
    const url = path.startsWith('http') ? path : `${this.apiBase}${path}`;
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${token}`);

    const response = await fetch(url, {
      ...init,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw this.authManager.handleApiError(response.status, errorBody);
    }

    return response;
  }

  async listDevices(includeOffline = true): Promise<RingDevice[]> {
    if (this.isMockMode) {
      return includeOffline ? MOCK_DEVICES : MOCK_DEVICES.filter((d) => d.online);
    }

    const res = await this.fetchApi('/v1/devices');
    const devices = parseDeviceList(await res.json());
    return includeOffline ? devices : devices.filter((d) => d.online);
  }

  async getDeviceStatus(deviceId: string): Promise<DeviceStatus> {
    const resolvedId = await this.resolveDeviceId(deviceId);
    if (this.isMockMode) {
      return getMockDeviceStatus(resolvedId);
    }

    const res = await this.fetchApi(`/v1/devices/${encodeURIComponent(resolvedId)}/status`);
    return parseDeviceStatus(await res.json());
  }

  async getEventHistory(deviceId?: string, limit = 10): Promise<EventHistoryItem[]> {
    if (this.isMockMode) {
      return getMockEvents(deviceId, limit);
    }

    if (deviceId) {
      const resolvedId = await this.resolveDeviceId(deviceId);
      const res = await this.fetchApi(
        `/v1/history/devices/${encodeURIComponent(resolvedId)}/events?limit=${encodeURIComponent(limit)}`
      );
      return parseEventHistory(await res.json());
    }

    const devices = await this.listDevices(true);
    const queryLimit = Math.min(limit, 10);
    const eventPromises = devices.slice(0, 5).map(async (device) => {
      try {
        const res = await this.fetchApi(
          `/v1/history/devices/${encodeURIComponent(device.id)}/events?limit=${encodeURIComponent(queryLimit)}`
        );
        const items = parseEventHistory(await res.json());
        return items.map((item) => ({
          ...item,
          attributes: {
            ...item.attributes,
            deviceId: device.id,
            deviceName: device.name,
          },
        }));
      } catch {
        return [];
      }
    });

    const allResults = await Promise.all(eventPromises);
    const combined = allResults.flat();
    combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return combined.slice(0, limit);
  }

  async initiateWhepStream(deviceId: string, sdpOffer: string): Promise<WhepSessionResult> {
    const resolvedId = await this.resolveDeviceId(deviceId);
    if (this.isMockMode) {
      return MOCK_WHEP_SESSION;
    }

    const whepUrl = `/v1/devices/${encodeURIComponent(resolvedId)}/media/streaming/whep/sessions`;
    const response = await this.fetchApi(whepUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
      },
      body: sdpOffer,
    });

    const sdpAnswer = await response.text();
    const sessionUrl = response.headers.get('Location');
    if (!sessionUrl) {
      throw new Error('WHEP response missing Location header with session URL.');
    }

    return {
      sdpAnswer,
      sessionUrl,
    };
  }

  async terminateWhepStream(sessionUrl: string): Promise<{ success: boolean }> {
    if (this.isMockMode) {
      return { success: true };
    }

    await this.fetchApi(sessionUrl, {
      method: 'DELETE',
    });
    return { success: true };
  }

  async getDeviceCapabilities(deviceId: string): Promise<DeviceCapabilities> {
    const resolvedId = await this.resolveDeviceId(deviceId);
    if (this.isMockMode) {
      return getMockCapabilities(resolvedId);
    }

    const res = await this.fetchApi(`/v1/devices/${encodeURIComponent(resolvedId)}/capabilities`);
    return parseDeviceCapabilities(await res.json());
  }

  async getDeviceConfigurations(deviceId: string): Promise<DeviceConfigurations> {
    const resolvedId = await this.resolveDeviceId(deviceId);
    if (this.isMockMode) {
      return getMockConfigurations(resolvedId);
    }

    const res = await this.fetchApi(`/v1/devices/${encodeURIComponent(resolvedId)}/configurations`);
    return parseDeviceConfigurations(await res.json());
  }
}
