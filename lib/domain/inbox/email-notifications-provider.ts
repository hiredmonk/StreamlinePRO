import { getClientEnv, getServerEnv } from '@/lib/env';
import {
  buildEmailDedupeKey,
  getEmailDispatchState,
  withEmailDispatchState
} from '@/lib/domain/inbox/email-dispatch-state';
import type {
  DispatchNotificationBatch,
  DispatchNotificationBatchOutput,
  EmailNotificationPayload,
  EmailProviderConfig,
  MapNotificationToEmailPayload,
  SendNotificationEmail,
  SendNotificationEmailOutput
} from '@/lib/contracts/email-notifications-provider';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/types';

type NotificationRow = Pick<
  Database['public']['Tables']['notifications']['Row'],
  'id' | 'workspace_id' | 'user_id' | 'type' | 'entity_type' | 'entity_id' | 'payload_json'
>;

type DispatchStatus = SendNotificationEmailOutput['status'];

class ClassifiedDispatchError extends Error {
  status: DispatchStatus;
  errorCode: string;

  constructor(status: DispatchStatus, errorCode: string, message: string) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
  }
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function toOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function normalizeNow(input?: string) {
  if (!input) {
    return new Date();
  }

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid now value.');
  }

  return parsed;
}

function getNotificationSubject(type: NotificationRow['type']) {
  switch (type) {
    case 'assignment':
      return 'You have a new task assignment';
    case 'mention':
      return 'You were mentioned in StreamlinePRO';
    case 'due_soon':
      return 'Task due soon';
    case 'overdue':
      return 'Task is overdue';
    case 'comment':
      return 'New comment on your task';
    case 'system':
    default:
      return 'StreamlinePRO notification';
  }
}

function getNotificationTextBody(payload: {
  subject: string;
  type: NotificationRow['type'];
  entityType: NotificationRow['entity_type'];
  entityId: string;
  appUrl: string;
}) {
  const inboxUrl = `${payload.appUrl}/inbox`;
  const entityUrl = `${payload.appUrl}/my-tasks?task=${payload.entityId}`;

  return `${payload.subject}\n\nType: ${payload.type}\nEntity: ${payload.entityType}\n\nOpen in StreamlinePRO: ${entityUrl}\nInbox: ${inboxUrl}`;
}

function getNotificationHtmlBody(payload: {
  subject: string;
  type: NotificationRow['type'];
  entityType: NotificationRow['entity_type'];
  entityId: string;
  appUrl: string;
}) {
  const inboxUrl = `${payload.appUrl}/inbox`;
  const entityUrl = `${payload.appUrl}/my-tasks?task=${payload.entityId}`;

  return `<p>${payload.subject}</p><p><strong>Type:</strong> ${payload.type}<br /><strong>Entity:</strong> ${payload.entityType}</p><p><a href="${entityUrl}">Open task</a></p><p><a href="${inboxUrl}">Open inbox</a></p>`;
}

function classifyHttpError(responseStatus: number): DispatchStatus {
  if (responseStatus === 408 || responseStatus === 429 || responseStatus >= 500) {
    return 'retryable_error';
  }

  return 'permanent_error';
}

function parseErrorMessage(body: unknown, fallback: string) {
  const bodyRecord = toRecord(body);
  const nestedError = toRecord(bodyRecord.error);

  return (
    toOptionalString(bodyRecord.message) ??
    toOptionalString(nestedError.message) ??
    toOptionalString(bodyRecord.name) ??
    fallback
  );
}

export const mapNotificationToEmailPayload: MapNotificationToEmailPayload = async (input) => {
  const supabase = createSupabaseAdminClient();
  const { data: notification, error: notificationError } = await supabase
    .from('notifications')
    .select('id, workspace_id, user_id, type, entity_type, entity_id, payload_json')
    .eq('id', input.notificationId)
    .eq('channel', 'email')
    .maybeSingle();

  if (notificationError) {
    throw notificationError;
  }

  if (!notification) {
    throw new ClassifiedDispatchError(
      'permanent_error',
      'notification_not_found',
      'Notification was not found for email dispatch.'
    );
  }

  const { data: userResult, error: userError } = await supabase.auth.admin.getUserById(notification.user_id);
  if (userError) {
    throw userError;
  }

  const recipientEmail = userResult.user?.email?.trim();
  if (!recipientEmail) {
    throw new ClassifiedDispatchError(
      'permanent_error',
      'recipient_email_missing',
      'Notification recipient does not have a deliverable email.'
    );
  }

  const appUrl = getClientEnv().NEXT_PUBLIC_APP_URL;
  const payloadRecord = toRecord(notification.payload_json);
  const fallbackDedupeKey = buildEmailDedupeKey({
    workspaceId: notification.workspace_id,
    userId: notification.user_id,
    type: notification.type,
    entityType: notification.entity_type,
    entityId: notification.entity_id
  });
  const dispatch = getEmailDispatchState(notification.payload_json, fallbackDedupeKey);
  const subject = toOptionalString(payloadRecord.subject) ?? getNotificationSubject(notification.type);
  const textBody =
    toOptionalString(payloadRecord.textBody) ??
    getNotificationTextBody({
      subject,
      type: notification.type,
      entityType: notification.entity_type,
      entityId: notification.entity_id,
      appUrl
    });
  const htmlBody =
    toOptionalString(payloadRecord.htmlBody) ??
    getNotificationHtmlBody({
      subject,
      type: notification.type,
      entityType: notification.entity_type,
      entityId: notification.entity_id,
      appUrl
    });

  const payload: EmailNotificationPayload = {
    notificationId: notification.id,
    workspaceId: notification.workspace_id,
    recipientUserId: notification.user_id,
    recipientEmail,
    type: notification.type,
    entityType: notification.entity_type,
    entityId: notification.entity_id,
    subject,
    textBody,
    htmlBody,
    dedupeKey: dispatch.dedupeKey
  };

  return { payload };
};

export const sendNotificationEmail: SendNotificationEmail = async (input) => {
  const endpoint = 'https://api.resend.com/emails';
  const timeoutMs = 10_000;
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.providerConfig.apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': input.payload.dedupeKey
      },
      body: JSON.stringify({
        from: input.providerConfig.fromAddress,
        to: [input.payload.recipientEmail],
        subject: input.payload.subject,
        text: input.payload.textBody,
        html: input.payload.htmlBody
      }),
      signal: controller.signal
    });
  } catch (error) {
    clearTimeout(timeoutHandle);

    const isTimeoutError = error instanceof Error && error.name === 'AbortError';
    return {
      notificationId: input.payload.notificationId,
      accepted: false,
      status: 'retryable_error',
      errorCode: isTimeoutError ? 'timeout' : 'network_error',
      errorMessage: isTimeoutError ? 'Email provider request timed out.' : 'Failed to reach email provider.'
    };
  }

  clearTimeout(timeoutHandle);

  let responseBody: unknown = null;
  const responseType = response.headers.get('content-type') ?? '';
  if (responseType.includes('application/json')) {
    responseBody = await response.json().catch(() => null);
  } else {
    const text = await response.text().catch(() => '');
    responseBody = text ? { message: text } : null;
  }

  if (response.ok) {
    const bodyRecord = toRecord(responseBody);
    return {
      notificationId: input.payload.notificationId,
      accepted: true,
      providerMessageId: toOptionalString(bodyRecord.id),
      status: 'sent'
    };
  }

  const status = classifyHttpError(response.status);
  return {
    notificationId: input.payload.notificationId,
    accepted: false,
    status,
    errorCode: `http_${response.status}`,
    errorMessage: parseErrorMessage(responseBody, `Email provider responded with ${response.status}.`)
  };
};

async function persistDispatchResult(
  notification: NotificationRow,
  outcome: {
    status: DispatchStatus;
    attemptCount: number;
    dedupeKey: string;
    providerMessageId?: string;
    errorCode?: string;
    errorMessage?: string;
    nowIso: string;
  }
) {
  const supabase = createSupabaseAdminClient();
  const existing = getEmailDispatchState(notification.payload_json, outcome.dedupeKey);
  const payloadJson = withEmailDispatchState(notification.payload_json, {
    dedupeKey: outcome.dedupeKey,
    attemptCount: outcome.attemptCount,
    status: outcome.status,
    providerMessageId: outcome.providerMessageId,
    errorCode: outcome.errorCode,
    errorMessage: outcome.errorMessage,
    lastAttemptAt: outcome.nowIso,
    lastSentAt: outcome.status === 'sent' ? outcome.nowIso : existing.lastSentAt
  });

  const { error: updateError } = await supabase
    .from('notifications')
    .update({ payload_json: payloadJson })
    .eq('id', notification.id);

  if (updateError) {
    throw updateError;
  }
}

function getProviderConfigFromEnv(): EmailProviderConfig {
  const env = getServerEnv();
  return {
    provider: 'resend',
    apiKey: env.EMAIL_PROVIDER_API_KEY,
    fromAddress: env.EMAIL_FROM_ADDRESS
  };
}

export const dispatchNotificationBatch: DispatchNotificationBatch = async (input) => {
  const now = normalizeNow(input.now);
  const nowIso = now.toISOString();
  const supabase = createSupabaseAdminClient();
  const providerConfig = getProviderConfigFromEnv();
  const scanLimit = Math.max(1, input.batchSize) * 5;
  const summary: DispatchNotificationBatchOutput = {
    scanned: 0,
    attempted: 0,
    sent: 0,
    retryableErrors: 0,
    permanentErrors: 0
  };

  const { data: rows, error: rowsError } = await supabase
    .from('notifications')
    .select('id, workspace_id, user_id, type, entity_type, entity_id, payload_json')
    .eq('channel', 'email')
    .order('created_at', { ascending: true })
    .limit(scanLimit);

  if (rowsError) {
    throw rowsError;
  }

  const notifications = (rows ?? []) as NotificationRow[];
  summary.scanned = notifications.length;

  for (const notification of notifications) {
    if (summary.attempted >= input.batchSize) {
      break;
    }

    const fallbackDedupeKey = buildEmailDedupeKey({
      workspaceId: notification.workspace_id,
      userId: notification.user_id,
      type: notification.type,
      entityType: notification.entity_type,
      entityId: notification.entity_id
    });
    const dispatchState = getEmailDispatchState(notification.payload_json, fallbackDedupeKey);
    const isEligible =
      (dispatchState.status === 'pending' || dispatchState.status === 'retryable_error') &&
      dispatchState.attemptCount < input.maxAttempts;

    if (!isEligible) {
      continue;
    }

    summary.attempted += 1;
    const attempt = dispatchState.attemptCount + 1;

    let result: SendNotificationEmailOutput;
    try {
      const mapped = await mapNotificationToEmailPayload({ notificationId: notification.id });
      result = await sendNotificationEmail({
        payload: mapped.payload,
        providerConfig,
        attempt
      });
    } catch (error) {
      if (error instanceof ClassifiedDispatchError) {
        result = {
          notificationId: notification.id,
          accepted: false,
          status: error.status,
          errorCode: error.errorCode,
          errorMessage: error.message
        };
      } else {
        throw error;
      }
    }

    if (result.status === 'sent') {
      summary.sent += 1;
    } else if (result.status === 'retryable_error') {
      summary.retryableErrors += 1;
    } else {
      summary.permanentErrors += 1;
    }

    await persistDispatchResult(notification, {
      status: result.status,
      attemptCount: attempt,
      dedupeKey: dispatchState.dedupeKey,
      providerMessageId: result.providerMessageId,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      nowIso
    });
  }

  return summary;
};

