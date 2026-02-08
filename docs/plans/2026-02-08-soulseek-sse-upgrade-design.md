# Soulseek + SSE Notification Upgrade Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace slsk-client with a vendored fork of soulseek-ts (extended with queue management + connection resilience), and upgrade the notification system from HTTP polling to SSE for real-time download progress and instant notifications.

**Architecture:** Vendor soulseek-ts into backend/src/lib/soulseek/, extend with Soulseek protocol messages for queue management (codes 43/44/50/51) and NAT traversal (code 18). Add a typed EventBus singleton that all services emit to. Single SSE endpoint streams events to the frontend, replacing all polling intervals. Existing React Query hooks keep their structure but swap poll-based refetching for SSE-driven cache invalidation.

**Tech Stack:** soulseek-ts (ISC license, vendored), native EventEmitter, native SSE (EventSource API), React Query cache invalidation

**Core Principle:** No parallel systems. When SSE goes in, polling comes out. When soulseek-ts goes in, slsk-client gets deleted. No dead code, no fallback hedging.

---

## Part 1: EventBus + SSE Transport

### What gets built

**EventBus** (`backend/src/services/eventBus.ts`): Typed EventEmitter singleton. Single-process, in-memory. Any backend service can emit events scoped to a userId.

```typescript
type EventType =
  | "notification"
  | "download:progress"
  | "download:queued"
  | "download:complete"
  | "download:failed"
  | "notification:cleared"

interface SSEEvent {
  type: EventType;
  userId: string;
  payload: Record<string, unknown>;
}
```

**SSE Endpoint** (`backend/src/routes/events.ts`): `GET /api/events?token=<jwt>` with JWT auth via query param (EventSource API can't set headers). Manages `Map<string, Set<Response>>` for multi-tab support. 30s heartbeat. Cleanup on `res.close`.

**Frontend SSE Hook** (`frontend/hooks/useEventSource.ts`): Connects at app layout level. On each event, invalidates the relevant React Query cache key:
- `"notification"` / `"notification:cleared"` -> invalidate `["notifications"]`
- `"download:*"` -> invalidate `["active-downloads"]`, `["download-status"]`

Download progress (high frequency) stored in a `Map<string, DownloadProgress>` context, not React Query.

### What gets deleted

- All `refetchInterval` in `useNotifications`, `useActiveDownloads`, `useDownloadStatus`
- Adaptive polling logic (5s/10s/30s interval function) in `useDownloadStatus.ts`
- `CustomEvent("download-status-changed")` dispatch + listener
- `CustomEvent("playlist-created")` dispatch + listener (SSE replaces this)

### What gets modified

- `notificationService.ts` - emit to EventBus after DB write
- `simpleDownloadManager.ts` - emit download events to EventBus
- App layout component - mount `useEventSource` hook

---

## Part 2: Vendored Soulseek Client

### What gets built

**Vendored soulseek-ts** at `backend/src/lib/soulseek/`: Copy source from soulseek-ts (ISC license), extend with:

**Queue management** (new peer message handlers):
- Peer Code 43 `QueueUpload` - request file download
- Peer Code 44 `PlaceInQueueResponse` - receive queue position
- Peer Code 51 `PlaceInQueueRequest` - poll queue position
- Peer Code 50 `UploadDenied` - handle rejection with reason

**Connection resilience** (new logic):
- Server Code 18 `ConnectToPeer` - firewall piercing via server relay
- Exponential backoff reconnect (replace fixed cooldown)
- Per-peer connection state tracking (direct vs relayed vs failed)

**Events emitted to EventBus**:
- `download:progress` - `{ jobId, filename, bytesReceived, totalBytes }`
- `download:queued` - `{ jobId, filename, position, username }`
- `download:complete` - `{ jobId, filename, path }`
- `download:failed` - `{ jobId, filename, error }`

**Service wrapper** (`backend/src/services/soulseek.ts` - rewritten): Thin wrapper over vendored client exposing same public API surface: `searchTrack`, `searchAndDownload`, `searchAndDownloadBatch`, `connect`, `disconnect`. Reads credentials from DB (SystemSettings).

### What gets deleted

- `slsk-client` from package.json dependencies
- Entire current `backend/src/services/soulseek.ts` (1280 lines) - replaced by rewrite
- Dead slskd references in comments: `library.ts`, `playlistLogger.ts`, `simpleDownloadManager.ts`

### What gets modified

- `acquisitionService.ts` - import path stays same (soulseek.ts rewritten in place), minimal API changes
- `systemSettings.ts` test endpoint - use new client
- `backend/package.json` - remove slsk-client, add any soulseek-ts transitive deps (typed-emitter, zlib)

---

## Part 3: Frontend Progress UI

### What gets built

- Progress context provider wrapping app layout (holds `Map<string, DownloadProgress>`)
- Progress bar component in activity panel download items:
  - Indeterminate when queued (shows "Position N in queue")
  - Determinate when transferring (shows bytes/total)
  - Transitions to normal notification flow on complete/failed

### What gets deleted

- Nothing additional beyond Part 1 deletions

### What stays untouched

- Notification DB schema, notification policy service, notification API routes
- Toast system (ephemeral, client-side - orthogonal to SSE)
- React Query cache structure in hooks (just loses polling config, gains SSE invalidation)
- Onboarding flow (credentials still saved to DB, new client reads from DB)

---

## Deletion Checklist

This is the complete list of code that must be removed:

- [ ] `slsk-client` from `backend/package.json`
- [ ] Current `backend/src/services/soulseek.ts` (1280 lines, replaced by rewrite)
- [ ] `refetchInterval: 30000` in `useNotifications` hook
- [ ] `refetchInterval` (adaptive 10s/30s) in `useActiveDownloads` hook
- [ ] `refetchInterval` + adaptive polling function in `useDownloadStatus` hook
- [ ] `CustomEvent("download-status-changed")` dispatch in `useDownloadStatus.ts`
- [ ] `CustomEvent("download-status-changed")` listener in `useDownloadStatus.ts`
- [ ] `CustomEvent("playlist-created")` dispatch in `NotificationsTab.tsx`
- [ ] `CustomEvent("playlist-created")` listener in `Sidebar.tsx`
- [ ] Dead slskd comments in `library.ts`
- [ ] Dead slskd comment in `playlistLogger.ts`
- [ ] Dead slskd reference in `simpleDownloadManager.ts`
- [ ] `2026-02-08-slskd-download-directory.md` plan (obsolete)
- [ ] `2026-02-07-slskd-integration.md` plan (obsolete)
