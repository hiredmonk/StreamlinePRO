import type {
  DispatchNotificationBatchInput,
  DispatchNotificationBatchOutput,
  EmailNotificationPayload,
  MapNotificationToEmailPayloadInput,
  MapNotificationToEmailPayloadOutput,
  SendNotificationEmailInput,
  SendNotificationEmailOutput
} from '@/lib/contracts/email-notifications-provider';
import { getClientEnv, getServerEnv } from '@/lib/env';
import type { Database, Json } from '@/lib/supabase/types';

type NotificationRow = Database['public']['Tables']['notifications']['Row'];
type EmailDeliveryStatus = 'pending' | 'sent' | 'retryable_error' | 'permanent_error';

type EmailDeliveryState = {
  status: EmailDeliveryStatus;
  attempts: number;
  lastAttemptAt?: string;
  sentAt?: string;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
};

const RESEND_SEND_EMAIL_URL = 'https://api.resend.com/emails';
const EMAIL_ELIGIBLE_TYPES = new Set<NotificationRow['type']>(['assignment', 'mention', 'due_soon', 'overdue']);

function getDeliveryState(payload: Json): EmailDeliveryState {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { status: 'pending', attempts: 0 };
  }

  const emailDelivery = (payload as Record<string, unknown>).emailDelivery;
  if (!emailDelivery || typeof emailDelivery !== 'object' || Array.isArray(emailDelivery)) {
    return { status: 'pending', attempts: 0 };
  }

  const state = emailDelivery as Record<string, unknown>;
  const attempts = typeof state.attempts === 'number' && Number.isFinite(state.attempts) ? state.attempts : 0;
  const status =
    state.status === 'sent' ||
    state.status === 'retryable_error' ||
    state.status === 'permanent_error' ||
    state.status === 'pending'
      ? state.status
      : 'pending';

  return {
    status,
    attempts,
    lastAttemptAt: typeof state.lastAttemptAt === 'string' ? state.lastAttemptAt : undefined,
    sentAt: typeof state.sentAt === 'string' ? state.sentAt : undefined,
    providerMessageId: typeof state.providerMessageId === 'string' ? state.providerMessageId : undefined,
    errorCode: typeof state.errorCode === 'string' ? state.errorCode : undefined,
    errorMessage: typeof state.errorMessage === 'string' ? state.errorMessage : undefined
  };
}

function mergeDeliveryState(payload: Json, state: EmailDeliveryState): Json {
  const payloadRecord =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? ({ ...payload } as Record<string, unknown>)
      : {};

  payloadRecord.emailDelivery = state;
  return payloadRecord as Json;
}

function isRetryableHttpStatus(status: number) {
  return status === 429 || status >= 500;
}

function getSubject(type: NotificationRow['type']) {
  if (type === 'assignment') return 'You were assigned a task';
  if (type === 'mention') return 'You were mentioned';
  if (type === 'due_soon') return 'Task due soon';
  if (type === 'overdue') return 'Task overdue';
  return 'Notification from StreamlinePRO';
}

function getTextBody(payload: Pick<EmailNotificationPayload, 'type' | 'entityId'>, appUrl: string) {
  const path = `/my-tasks?task=${payload.entityId}`;
  if (payload.type === 'assignment') return `A task was assigned to you. Open it: ${appUrl}${path}`;
  if (payload.type === 'mention') return `You were mentioned in a task comment. Open it: ${appUrl}${path}`;
  if (payload.type === 'due_soon') return `A task is due soon. Open it: ${appUrl}${path}`;
  if (payload.type === 'overdue') return `A task is overdue. Open it: ${appUrl}${path}`;
  return `You have a new notification. Open it: ${appUrl}${path}`;
}

export async function mapNotificationToEmailPayload(
  supabase: {
    from: (table: string) => any;
    auth: { admin: { getUserById: (userId: string) => Promise<any> } };
  },
  input: MapNotificationToEmailPayloadInput
): Promise<MapNotificationToEmailPayloadOutput> {
  const { data: notification, error } = await supabase
    .from('notifications')
    .select('id, workspace_id, user_id, type, entity_type, entity_id, payload_json, channel')
    .eq('id', input.notificationId)
    .maybeSingle();

  if (error || !notification) {
    throw error ?? new Error('Notification not found.');
  }

  if (notification.channel !== 'email') {
    throw new Error('Notification channel is not email.');
  }

  if (!EMAIL_ELIGIBLE_TYPES.has(notification.type)) {
    throw new Error('Notification type is not eligible for email delivery.');
  }

  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(notification.user_id);
  if (userError) {
    throw userError;
  }

  const recipientEmail = userData?.user?.email;
  if (!recipientEmail) {
    throw new Error('Notification recipient has no deliverable email.');
  }

  const appUrl = getClientEnv().NEXT_PUBLIC_APP_URL;
  const subject = getSubject(notification.type);
  const textBody = getTextBody({ type: notification.type, entityId: notification.entity_id }, appUrl);

  return {
    payload: {
      notificationId: notification.id,
      workspaceId: notification.workspace_id,
      recipientUserId: notification.user_id,
      recipientEmail,
      type: notification.type,
      entityType: notification.entity_type,
      entityId: notification.entity_id,
      subject,
      textBody,
      htmlBody: undefined,
      dedupeKey: `${notification.user_id}:${notification.entity_id}:${notification.type}`
    }
  };
}

export async function sendNotificationEmail(
  input: SendNotificationEmailInput
): Promise<SendNotificationEmailOutput> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(RESEND_SEND_EMAIL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${input.providerConfig.apiKey}`
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

    const json = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
    if (response.ok) {
      return {
        notificationId: input.payload.notificationId,
        accepted: true,
        providerMessageId: json.id,
        status: 'sent'
      };
    }

    return {
      notificationId: input.payload.notificationId,
      accepted: false,
      status: isRetryableHttpStatus(response.status) ? 'retryable_error' : 'permanent_error',
      errorCode: `HTTP_${response.status}`,
      errorMessage: typeof json.message === 'string' ? json.message : 'Email provider request failed.'
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Email provider request failed.';
    return {
      notificationId: input.payload.notificationId,
      accepted: false,
      status: 'retryable_error',
      errorCode: 'NETWORK_ERROR',
      errorMessage: message
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function dispatchNotificationBatch(
  supabase: {
    from: (table: string) => any;
    auth: { admin: { getUserById: (userId: string) => Promise<any> } };
  },
  input: DispatchNotificationBatchInput
): Promise<DispatchNotificationBatchOutput> {
  const serverEnv = getServerEnv();
  const providerConfig = {
    provider: 'resend' as const,
    apiKey: serverEnv.EMAIL_PROVIDER_API_KEY,
    fromAddress: serverEnv.EMAIL_FROM_ADDRESS
  };

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('id, user_id, channel, type, payload_json, created_at')
    .eq('channel', 'email')
    .order('created_at', { ascending: true })
    .limit(input.batchSize);

  if (error) {
    throw error;
  }

  let attempted = 0;
  let sent = 0;
  let retryableErrors = 0;
  let permanentErrors = 0;

  for (const notification of notifications ?? []) {
    const currentState = getDeliveryState(notification.payload_json);
    if (currentState.status === 'sent' || currentState.status === 'permanent_error') {
      continue;
    }

    if (currentState.attempts >= input.maxAttempts) {
      continue;
    }

    attempted += 1;
    const attempt = currentState.attempts + 1;
    const attemptedAt = new Date().toISOString();

    try {
      const mapped = await mapNotificationToEmailPayload(supabase, { notificationId: notification.id });
      const output = await sendNotificationEmail({
        payload: mapped.payload,
        providerConfig,
        attempt
      });

      if (output.status === 'sent') {
        sent += 1;
      } else if (output.status === 'retryable_error') {
        retryableErrors += 1;
      } else {
        permanentErrors += 1;
      }

      const nextState: EmailDeliveryState = {
        status: output.status,
        attempts: attempt,
        lastAttemptAt: attemptedAt,
        sentAt: output.status === 'sent' ? attemptedAt : currentState.sentAt,
        providerMessageId: output.providerMessageId,
        errorCode: output.errorCode,
        errorMessage: output.errorMessage
      };

      const { error: updateError } = await supabase
        .from('notifications')
        .update({
          payload_json: mergeDeliveryState(notification.payload_json, nextState)
        })
        .eq('id', notification.id);

      if (updateError) {
        throw updateError;
      }
    } catch (errorCaught) {
      retryableErrors += 1;
      const errorMessage =
        errorCaught instanceof Error ? errorCaught.message : 'Failed to map notification for email delivery.';

      const { error: updateError } = await supabase
        .from('notifications')
        .update({
          payload_json: mergeDeliveryState(notification.payload_json, {
            status: 'retryable_error',
            attempts: attempt,
            lastAttemptAt: attemptedAt,
            errorCode: 'MAPPING_ERROR',
            errorMessage
          })
        })
        .eq('id', notification.id);

      if (updateError) {
        throw updateError;
      }
    }
  }

  return {
    scanned: notifications?.length ?? 0,
    attempted,
    sent,
    retryableErrors,
    permanentErrors
  };
}
