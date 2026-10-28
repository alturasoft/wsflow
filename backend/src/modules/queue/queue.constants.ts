export const WHATSAPP_QUEUE_NAME = 'whatsapp-events';

export enum WhatsAppJobType {
  INCOMING_MESSAGE = 'INCOMING_MESSAGE',
  MESSAGE_STATUS = 'MESSAGE_STATUS',
}

export interface WhatsAppEventJobData {
  tenantId?: string;
  phoneNumberId: string;
  wabaId?: string;
  messageId: string; // wamid
  from: string; // phone number E.164
  profileName?: string;
  type: string;
  textBody?: string;
  buttonReplyId?: string;
  listReplyId?: string;
  flowResponseJson?: string;
  rawPayload: any;
  receivedAt: string;
}
