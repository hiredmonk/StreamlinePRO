# Email Notifications Provider - FEATURE_BLUEPRINT

## Pattern Map
| Concern | Existing Pattern | Source File(s) | Reuse Decision |
|---|---|---|---|
| Notification write model | Notification rows inserted with `channel` and payload json | `lib/domain/inbox/events.ts` | Reuse event model and channel semantics |
| Due notification batching | Scheduler scans tasks and deduplicates notification inserts | `lib/domain/inbox/scheduler.ts` | Reuse batch summary output style for email dispatch runs |
| Protected job endpoint | Token-protected background route with JSON summary | `app/api/jobs/due-notifications/route.ts` | Reuse for future email dispatch job endpoint contract |
| Env validation | Required provider and sender env keys via Zod | `lib/env.ts` | Reuse env contract and strict parse behavior |
| Error handling style | Throw on infra failures; return typed failures to callers | `lib/actions/types.ts`, `lib/domain/inbox/events.ts` | Reuse typed action outputs for provider operations |
| Testing pattern | Unit tests assert scan/candidate/create/skip summary | `tests/unit/domain/inbox-scheduler.test.ts` | Reuse summary assertions for provider dispatch contract |
| Product scope constraint | Email is optional but supported path for notifications | `PRD/StreamlinePRO.md`, `Todo.md` | Keep in-app model primary; email as channel extension |

## Interface (Engineering Drawings)
These interfaces are the engineering drawings for production-grade email notification delivery contracts.

## Feature List
- Production-grade email notification delivery (code-side interface)

### Input Types
```ts
export type EmailProviderName = 'resend';

export interface EmailProviderConfig {
  provider: EmailProviderName;
  apiKey: string;
  fromAddress: string;
}

export interface EmailNotificationPayload {
  notificationId: string;
  workspaceId: string;
  recipientUserId: string;
  recipientEmail: string;
  type: 'assignment' | 'mention' | 'due_soon' | 'overdue' | 'comment' | 'system';
  entityType: 'task' | 'project' | 'comment' | 'workspace';
  entityId: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
  dedupeKey: string;
}

export interface SendNotificationEmailInput {
  payload: EmailNotificationPayload;
  providerConfig: EmailProviderConfig;
  attempt: number;
}

export interface DispatchNotificationBatchInput {
  now?: string;
  batchSize: number;
  maxAttempts: number;
}

export interface MapNotificationToEmailPayloadInput {
  notificationId: string;
  actorUserId?: string;
}
```

### Output Types
```ts
export interface SendNotificationEmailOutput {
  notificationId: string;
  accepted: boolean;
  providerMessageId?: string;
  status: 'sent' | 'retryable_error' | 'permanent_error';
  errorCode?: string;
  errorMessage?: string;
}

export interface DispatchNotificationBatchOutput {
  scanned: number;
  attempted: number;
  sent: number;
  retryableErrors: number;
  permanentErrors: number;
}

export interface MapNotificationToEmailPayloadOutput {
  payload: EmailNotificationPayload;
}
```

### Function Signatures
```ts
export type SendNotificationEmail = (
  input: SendNotificationEmailInput
) => Promise<SendNotificationEmailOutput>;

export type DispatchNotificationBatch = (
  input: DispatchNotificationBatchInput
) => Promise<DispatchNotificationBatchOutput>;

export type MapNotificationToEmailPayload = (
  input: MapNotificationToEmailPayloadInput
) => Promise<MapNotificationToEmailPayloadOutput>;
```

## Edge Cases
- Provider API key missing or invalid at runtime.
- Notification references user without deliverable email.
- Duplicate dispatch attempts for same `dedupeKey`.
- Provider timeout should classify as retryable error.
- Provider hard rejection (invalid from-domain/recipient) should classify as permanent error.
- Batch partially succeeds; summary must preserve exact sent/error counts.

## Out of Scope (No Logic Yet)
- Actual Resend SDK/API integration logic.
- Provider retry queue storage schema.
- DNS/domain verification and credential provisioning steps.
