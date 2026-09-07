export interface RingDevice {
  id: string;
  name: string;
  online: boolean;
  capabilities: Record<string, unknown>;
}

export interface DeviceStatus {
  online: boolean;
  batteryPercentage?: number;
  signalStrengthRssi?: number;
  firmwareVersion?: string;
  lastSeenTimestamp?: string;
  raw?: Record<string, unknown>;
}

export interface DeviceCapabilities {
  maxResolution?: string | number;
  codecs?: string[];
  enhancements?: string[];
  features?: Record<string, unknown>;
  raw?: Record<string, unknown>;
}

export interface DeviceConfigurations {
  motionDetectionEnabled?: boolean;
  motionZonesCount?: number;
  privacyZonesCount?: number;
  settings?: Record<string, unknown>;
  raw?: Record<string, unknown>;
}

export interface EventHistoryItem {
  id: string;
  type: string;
  timestamp: string | number;
  attributes?: Record<string, unknown>;
}

export interface WhepSessionResult {
  sdpAnswer: string;
  sessionUrl: string;
}

export interface RecentWebhookEvent {
  event_id: string;
  event_type: string;
  timestamp: string;
  device_id?: string;
  confidence?: number | null;
  bounding_box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  thumbnail_url?: string | null;
  metadata?: Record<string, unknown>;
}
