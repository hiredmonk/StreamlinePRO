import type { Database, Json } from '@/lib/supabase/types';

type NotificationType = Database['public']['Tables']['notifications']['Row']['type'];
type NotificationEntityType = Database['public']['Tables']['notifications']['Row']['entity_type'];

export type EmailDispatchStatus = 'pending' | 'sent' | 'retryable_error' | 'permanent_error';

export interface EmailDispatchState {
  dedupeKey: string;
  attemptCount: number;
  status: EmailDispatchStatus;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
  lastAttemptAt?: string;
  lastSentAt?: string;
}

const EMAIL_DISPATCH_STATUSES = new Set<EmailDispatchStatus>([
  'pending',
  'sent',
  'retryable_error',
  'permanent_error'
]);

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function toOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

export function buildEmailDedupeKey(input: {
  workspaceId: string;
  userId: string;
  type: NotificationType;
  entityType: NotificationEntityType;
  entityId: string;
}) {
  return `${input.workspaceId}:${input.userId}:${input.type}:${input.entityType}:${input.entityId}:email`;
}

export function getEmailDispatchState(payload: Json | null | undefined, fallbackDedupeKey: string): EmailDispatchState {
  const payloadRecord = toRecord(payload);
  const emailDispatch = toRecord(payloadRecord.emailDispatch);
  const attemptCount =
    typeof emailDispatch.attemptCount === 'number' && emailDispatch.attemptCount >= 0
      ? emailDispatch.attemptCount
      : 0;
  const status = EMAIL_DISPATCH_STATUSES.has(emailDispatch.status as EmailDispatchStatus)
    ? (emailDispatch.status as EmailDispatchStatus)
    : 'pending';

  return {
    dedupeKey: toOptionalString(emailDispatch.dedupeKey) ?? fallbackDedupeKey,
    attemptCount,
    status,
    providerMessageId: toOptionalString(emailDispatch.providerMessageId),
    errorCode: toOptionalString(emailDispatch.errorCode),
    errorMessage: toOptionalString(emailDispatch.errorMessage),
    lastAttemptAt: toOptionalString(emailDispatch.lastAttemptAt),
    lastSentAt: toOptionalString(emailDispatch.lastSentAt)
  };
}

export function withEmailDispatchState(payload: Json | null | undefined, dispatch: EmailDispatchState): Json {
  const payloadRecord = toRecord(payload);
  const emailDispatch: Record<string, Json> = {
    dedupeKey: dispatch.dedupeKey,
    attemptCount: dispatch.attemptCount,
    status: dispatch.status
  };

  if (dispatch.providerMessageId) {
    emailDispatch.providerMessageId = dispatch.providerMessageId;
  }

  if (dispatch.errorCode) {
    emailDispatch.errorCode = dispatch.errorCode;
  }

  if (dispatch.errorMessage) {
    emailDispatch.errorMessage = dispatch.errorMessage;
  }

  if (dispatch.lastAttemptAt) {
    emailDispatch.lastAttemptAt = dispatch.lastAttemptAt;
  }

  if (dispatch.lastSentAt) {
    emailDispatch.lastSentAt = dispatch.lastSentAt;
  }

  return {
    ...payloadRecord,
    emailDispatch
  };
}

