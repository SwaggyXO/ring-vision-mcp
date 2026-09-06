# ring-vision-mcp

Model Context Protocol (MCP) server for Ring cameras and doorbells, built on the official 2026 Amazon Vision Partner API (`api.amazonvision.com`).

> **Disclaimer**: This is an independent open-source project. It is not affiliated with, endorsed by, or sponsored by Amazon, Ring, or their affiliates (yet!).

---

## Features

- **Official 2026 Vision Partner API**: Communicates directly with `api.amazonvision.com` endpoints for device inventory, real-time health telemetry, event history, and WebRTC HTTP Egress Protocol (WHEP) live streaming.
- **Dual Authentication Modes**:
  - **Developer Playground**: Quick start using direct access tokens generated from the Amazon Vision Developer Portal.
  - **Production OAuth 2.0**: Long-running sessions using client credentials (`client_id` and `client_secret`) with automated token refresh.
- **Flexible Transports**:
  - **stdio** (default): Native integration with desktop LLM clients (Claude Desktop, Cursor, Antigravity).
  - **HTTP SSE**: Standalone Server-Sent Events server (`--http`) for networked or containerized agent deployments.
- **Human-Friendly Device Resolution**: Tools accept either upstream device UUIDs or friendly name substrings (e.g. `"Front Door"`, `"backyard"`).
- **Offline Mock Mode**: Enables full development, UI preview, and automated CI testing without live hardware or active credentials via `--mock` or `RING_MOCK_MODE=true`.
- **Privacy-First Architecture**:
  - Excludes user personal identity information (account profile, name, email, billing).
  - Excludes raw device GPS coordinates.
  - Diagnostic tools for raw payload inspection are quarantined behind an explicit `--extended` runtime flag.

---

## Architecture

```text
+---------------------+       stdio JSON-RPC       +--------------------+
|                     | <========================> |                    |
|   LLM Client        |                            |  ring-vision-mcp   |
|  (Claude / Cursor)  |      or HTTP SSE (:3001)   |                    |
+---------------------+ <------------------------> +---------+----------+
                                                             |
                                                             | HTTPS (Bearer Token)
                                                             v
                                                   +--------------------+
                                                   | Amazon Vision API  |
                                                   | api.amazonvision   |
                                                   +--------------------+
```

---

## Quick Start

### Option 1: Run via npx

You can run the server directly without manual installation:

```bash
# Using a developer playground token
RING_ACCESS_TOKEN="your-access-token" npx -y ring-vision-mcp

# Or in offline mock mode (no credentials needed)
npx -y ring-vision-mcp --mock
```

### Option 2: Clone and Build Locally

```bash
# Clone the repository
git clone https://github.com/SwaggyXO/ring-vision-mcp.git
cd ring-vision-mcp

# Install dependencies
npm install

# Run automated tests
npm test

# Build production bundle to dist/
npm run build

# Start local server
node dist/index.js
```

---

## Client Configuration

### Claude Desktop

Add the server to your `claude_desktop_config.json`:

#### Developer Playground Token Mode

```json
{
  "mcpServers": {
    "ring-vision": {
      "command": "npx",
      "args": ["-y", "ring-vision-mcp"],
      "env": {
        "RING_ACCESS_TOKEN": "your-developer-access-token"
      }
    }
  }
}
```

#### Production OAuth 2.0 Mode

```json
{
  "mcpServers": {
    "ring-vision": {
      "command": "npx",
      "args": ["-y", "ring-vision-mcp"],
      "env": {
        "RING_CLIENT_ID": "your-client-id",
        "RING_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

#### Offline Mock Mode (No Hardware Required)

```json
{
  "mcpServers": {
    "ring-vision": {
      "command": "npx",
      "args": ["-y", "ring-vision-mcp", "--mock"]
    }
  }
}
```

### Cursor

Add to your project `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "ring-vision": {
      "command": "npx",
      "args": ["-y", "ring-vision-mcp"],
      "env": {
        "RING_ACCESS_TOKEN": "your-developer-access-token"
      }
    }
  }
}
```

---

## MCP Reference

### Resources (Passive State)

Resources provide passive read-only state for clients supporting resource context attachments:

| URI | MIME Type | Description |
| :-- | :-- | :-- |
| `ring://devices` | `application/json` | Complete catalog of all Ring cameras and doorbells registered to the account. |
| `ring://devices/{deviceId}/status` | `application/json` | Real-time health metrics (battery percentage, Wi-Fi RSSI signal strength, firmware version). |
| `ring://events/recent` | `application/json` | Snapshot of the most recent incoming motion alerts and doorbell ring events. |

### Core Operational Tools (Active Operations)

Tools are callable by AI models to query device state, audit configurations, and manage video streaming:

| Tool Name | Parameters | Description |
| :-- | :-- | :-- |
| `ring_list_devices` | `includeOffline` (boolean, default: `true`) | Lists all cameras and doorbells with online status and hardware capabilities. |
| `ring_get_device_status` | `deviceId` (string: ID or name substring) | Retrieves real-time battery level, Wi-Fi RSSI signal strength, and firmware version. |
| `ring_get_device_capabilities` | `deviceId` (string: ID or name substring) | Inspects supported video codecs (`H.264`, `H.265`), resolutions, two-way audio, and color night vision. |
| `ring_get_device_configurations` | `deviceId` (string: ID or name substring) | Inspects motion detection status, active motion zones count, and privacy zone configurations. |
| `ring_query_event_history` | `deviceId` (optional string), `limit` (number, 1-100) | Retrieves past events. If `deviceId` is omitted, aggregates recent events across all account devices. |
| `ring_initiate_whep_stream` | `deviceId` (string: ID or name), `sdpOffer` (string) | Submits a WebRTC SDP offer to the Ring WHEP gateway; returns the SDP answer and session control URL. |
| `ring_terminate_whep_stream` | `sessionUrl` (string) | Closes an active WebRTC live view session immediately. |

### Extended Diagnostic Tools (`--extended`)

To expose advanced inspection tools for low-level debugging, start the server with the `--extended` flag:

```bash
node dist/index.js --extended
```

| Tool Name | Parameters | Description |
| :-- | :-- | :-- |
| `ring_inspect_raw_device` | `deviceId` (string) | Retrieves unparsed upstream API attributes for a device for troubleshooting. |
| `ring_inspect_auth_status` | _none_ | Validates token configuration, active auth mode, and connectivity without exposing secrets. |
| `ring_inspect_stream_session` | `sessionUrl` (string) | Validates active WHEP session control URL and connection state. |

---

## Environment Variables

| Variable | Type | Description |
| :-- | :-- | :-- |
| `RING_ACCESS_TOKEN` | String | Direct developer access token from the Ring Developer Playground. |
| `RING_CLIENT_ID` | String | OAuth 2.0 Client ID (paired with `RING_CLIENT_SECRET`). |
| `RING_CLIENT_SECRET` | String | OAuth 2.0 Client Secret. |
| `RING_API_BASE` | String | Amazon Vision API base URL. Defaults to `https://api.amazonvision.com`. |
| `RING_TOKEN_URL` | String | OAuth token endpoint. Defaults to `https://api.amazonvision.com/oauth/token`. |
| `RING_MOCK_MODE` | Boolean | Set to `"true"` to run offline with simulated devices and events. |
| `RING_EXTENDED_TOOLS` | Boolean | Set to `"true"` to register extended diagnostic tools. |
| `MCP_TRANSPORT` | String | Set to `"http"` to start the HTTP SSE transport instead of stdio. |
| `MCP_PORT` | Number | Port for the HTTP SSE server (default: `3001`). |

> **Note**: Setting both `RING_ACCESS_TOKEN` and `RING_CLIENT_ID` simultaneously will cause the server to fail fast with a configuration error to prevent credential ambiguity.

---

## Development

```bash
# Run all automated unit and protocol tests
npm test

# Verify TypeScript types
npm run typecheck

# Build release bundle
npm run build
```

---

## License

MIT License. See [LICENSE](./LICENSE) for details.
