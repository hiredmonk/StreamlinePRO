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

export interface SendNotificationEmailOutput {
  notificationId: string;
  accepted: boolean;
  providerMessageId?: string;
  status: 'sent' | 'retryable_error' | 'permanent_error';
  errorCode?: string;
  errorMessage?: string;
}

export interface DispatchNotificationBatchInput {
  now?: string;
  batchSize: number;
  maxAttempts: number;
}

export interface DispatchNotificationBatchOutput {
  scanned: number;
  attempted: number;
  sent: number;
  retryableErrors: number;
  permanentErrors: number;
}

export interface MapNotificationToEmailPayloadInput {
  notificationId: string;
  actorUserId?: string;
}

export interface MapNotificationToEmailPayloadOutput {
  payload: EmailNotificationPayload;
}

export type SendNotificationEmail = (
  input: SendNotificationEmailInput
) => Promise<SendNotificationEmailOutput>;

export type DispatchNotificationBatch = (
  input: DispatchNotificationBatchInput
) => Promise<DispatchNotificationBatchOutput>;

export type MapNotificationToEmailPayload = (
  input: MapNotificationToEmailPayloadInput
) => Promise<MapNotificationToEmailPayloadOutput>;
