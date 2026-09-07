import {
  RingDevice,
  DeviceStatus,
  DeviceCapabilities,
  DeviceConfigurations,
  EventHistoryItem,
} from './types';

export function parseDeviceList(data: {
  data?: Array<{
    id: string;
    attributes?: {
      name?: string;
      description?: string;
      online?: boolean;
      capabilities?: Record<string, unknown>;
    };
  }>;
}): RingDevice[] {
  return (data.data || []).map((item) => ({
    id: item.id,
    name: item.attributes?.name || item.attributes?.description || 'Ring Device',
    online: item.attributes?.online ?? false,
    capabilities: item.attributes?.capabilities || {},
  }));
}

export function parseDeviceStatus(data: {
  data?: {
    attributes?: {
      online?: boolean;
      battery_level?: number;
      battery_percentage?: number;
      signal_strength?: number;
      rssi?: number;
      firmware_version?: string;
      last_seen?: string;
      last_seen_timestamp?: string;
      [key: string]: unknown;
    };
  };
}): DeviceStatus {
  const attrs = data.data?.attributes;
  return {
    online: attrs?.online ?? false,
    batteryPercentage: attrs?.battery_percentage ?? attrs?.battery_level,
    signalStrengthRssi: attrs?.rssi ?? attrs?.signal_strength,
    firmwareVersion: attrs?.firmware_version,
    lastSeenTimestamp: attrs?.last_seen_timestamp ?? attrs?.last_seen,
    raw: (attrs as Record<string, unknown>) || {},
  };
}

export function parseEventHistory(data: {
  data?: Array<{
    id: string;
    type: string;
    attributes?: {
      timestamp?: string | number;
      [key: string]: unknown;
    };
  }>;
}): EventHistoryItem[] {
  return (data.data || []).map((item) => ({
    id: item.id,
    type: item.type,
    timestamp: item.attributes?.timestamp ?? Date.now(),
    attributes: item.attributes || {},
  }));
}

export function parseDeviceCapabilities(data: {
  data?: {
    attributes?: {
      video?: {
        max_resolution?: string | number;
        codecs?: string[];
      };
      video_codecs?: string[];
      codecs?: string[];
      image_enhancements?: {
        configurations?: string[];
      };
      motion_detection?: unknown;
      features?: Record<string, unknown>;
      [key: string]: unknown;
    };
  };
}): DeviceCapabilities {
  const attrs = data.data?.attributes;
  const videoObj = attrs?.video;
  const imageEnhancements = attrs?.image_enhancements;

  return {
    maxResolution: videoObj?.max_resolution,
    codecs: videoObj?.codecs ?? attrs?.video_codecs ?? attrs?.codecs,
    enhancements: imageEnhancements?.configurations,
    features: attrs?.features,
    raw: (attrs as Record<string, unknown>) || {},
  };
}

export function parseDeviceConfigurations(data: {
  data?: {
    attributes?: {
      motion_detection?: {
        enabled?: boolean;
        motion_zones?: unknown[];
      };
      image_enhancements?: {
        privacy_zones?: unknown[];
      };
      [key: string]: unknown;
    };
  };
}): DeviceConfigurations {
  const attrs = data.data?.attributes;
  const motion = attrs?.motion_detection;
  const imageEnhancements = attrs?.image_enhancements;

  return {
    motionDetectionEnabled: motion?.enabled,
    motionZonesCount: Array.isArray(motion?.motion_zones) ? motion.motion_zones.length : undefined,
    privacyZonesCount: Array.isArray(imageEnhancements?.privacy_zones)
      ? imageEnhancements.privacy_zones.length
      : undefined,
    settings: (attrs as Record<string, unknown>) || {},
    raw: (attrs as Record<string, unknown>) || {},
  };
}
