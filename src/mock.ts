import {
  RingDevice,
  DeviceStatus,
  DeviceCapabilities,
  DeviceConfigurations,
  EventHistoryItem,
  WhepSessionResult,
} from './types';

export const MOCK_DEVICES: RingDevice[] = [
  {
    id: 'urn:ring:device:front-door-101',
    name: 'Front Door Video Doorbell',
    online: true,
    capabilities: {
      video: true,
      audio: true,
      night_vision: true,
    },
  },
  {
    id: 'urn:ring:device:backyard-floodlight-202',
    name: 'Backyard Floodlight Cam',
    online: true,
    capabilities: {
      video: true,
      audio: true,
      siren: true,
      floodlight: true,
    },
  },
];

export function getMockDeviceStatus(deviceId: string): DeviceStatus {
  return {
    online: true,
    batteryPercentage: 94,
    signalStrengthRssi: -58,
    firmwareVersion: '1.4.12',
    lastSeenTimestamp: new Date().toISOString(),
    raw: {
      device_id: deviceId,
      mock_mode: true,
    },
  };
}

export function getMockCapabilities(deviceId: string): DeviceCapabilities {
  return {
    maxResolution: '1080p',
    codecs: ['H.264', 'H.265'],
    enhancements: ['hdr', 'color_night_vision'],
    features: {
      two_way_audio: true,
      motion_zones: true,
    },
    raw: {
      device_id: deviceId,
      mock_mode: true,
      video: {
        max_resolution: '1080p',
        codecs: ['H.264', 'H.265'],
      },
      image_enhancements: {
        configurations: ['hdr', 'color_night_vision'],
      },
    },
  };
}

export function getMockConfigurations(deviceId: string): DeviceConfigurations {
  return {
    motionDetectionEnabled: true,
    motionZonesCount: 3,
    privacyZonesCount: 1,
    settings: {
      motion_detection_enabled: true,
      motion_zones_count: 3,
      privacy_zones_count: 1,
      alert_snooze_active: false,
    },
    raw: {
      device_id: deviceId,
      mock_mode: true,
      motion_detection: {
        enabled: true,
        motion_zones: [{}, {}, {}],
      },
      image_enhancements: {
        privacy_zones: [{}],
      },
    },
  };
}

export function getMockEvents(deviceId?: string, limit = 10): EventHistoryItem[] {
  const targetId = deviceId || 'urn:ring:device:front-door-101';
  const now = Date.now();
  const events: EventHistoryItem[] = [
    {
      id: 'mock-event-001',
      type: 'motion',
      timestamp: new Date(now - 300000).toISOString(),
      attributes: {
        deviceId: targetId,
        confidence: 0.96,
        zone: 'Driveway Front',
      },
    },
    {
      id: 'mock-event-002',
      type: 'ding',
      timestamp: new Date(now - 1200000).toISOString(),
      attributes: {
        deviceId: targetId,
        action: 'doorbell_press',
      },
    },
    {
      id: 'mock-event-003',
      type: 'motion',
      timestamp: new Date(now - 3600000).toISOString(),
      attributes: {
        deviceId: targetId,
        confidence: 0.89,
        zone: 'Sidewalk',
      },
    },
  ];
  return events.slice(0, limit);
}

export const MOCK_WHEP_SESSION: WhepSessionResult = {
  sdpAnswer:
    'v=0\r\no=- 123456789 2 IN IP4 127.0.0.1\r\ns=Ring WHEP Mock Session\r\nt=0 0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\n',
  sessionUrl:
    'https://api.amazonvision.com/v1/devices/mock/media/streaming/whep/sessions/mock-session-12345',
};
