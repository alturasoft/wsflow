export type FlowNodeType =
  | 'start'
  | 'message'
  | 'buttons'
  | 'list'
  | 'capture'
  | 'condition'
  | 'api_call'
  | 'appointment'
  | 'send_email'
  | 'handoff'
  | 'end';

export interface ButtonItem {
  id: string;
  title: string;
}

export interface ListRow {
  id: string;
  title: string;
  description?: string;
}

export interface ListSection {
  title: string;
  rows: ListRow[];
}

export interface ApiMapping {
  jsonPath: string;
  variableName: string;
}

export interface ContactVCardData {
  name: string;
  phone: string;
  organization: string;
  email?: string;
}

export interface NodeData {
  label?: string;
  // Start Node
  triggerType?: 'all' | 'keywords';
  triggerKeywords?: string[];
  triggerDescription?: string;
  isDefaultFlow?: boolean;
  // Message & Common
  text?: string;
  // Buttons
  buttons?: ButtonItem[];
  // List
  buttonLabel?: string;
  sections?: ListSection[];
  // Capture
  prompt?: string;
  variableName?: string;
  validationType?: 'text' | 'number' | 'email' | 'phone';
  retryMessage?: string;
  // Condition
  operator?: '==' | '!=' | '>' | '<' | 'contains';
  targetValue?: string;
  // API Call
  url?: string;
  method?: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
  body?: string;
  responseMappings?: ApiMapping[];
  // Appointment (Calendar)
  integrationId?: string;
  summary?: string;
  description?: string;
  attendeeEmail?: string;
  attendeeName?: string;
  startTime?: string;
  durationMinutes?: number;
  generateMeetingLink?: boolean;
  // Send Email (SMTP)
  to?: string;
  subject?: string;
  emailBody?: string;
  isHtml?: boolean;
  // Handoff
  handoffType?: 'vcard' | 'inbox' | 'email';
  contactVCard?: ContactVCardData;
  destinationEmail?: string;
  // End
  closingMessage?: string;
}

export interface TenantIntegration {
  id: string;
  tenantId: string;
  name: string;
  type: 'GOOGLE_CALENDAR' | 'OUTLOOK_CALENDAR' | 'SMTP_EMAIL' | 'WEBHOOK_REST' | 'CRM_CUSTOM';
  isActive: boolean;
  createdAt: string;
  config?: any;
}

export interface FlowVersion {
  id: string;
  flowId: string;
  versionNumber: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  definition: {
    nodes: any[];
    edges: any[];
  };
  changelog?: string;
  publishedAt?: string;
}

export interface Flow {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  triggerKeywords: string[];
  isActive: boolean;
  activeVersionId?: string;
  versions: FlowVersion[];
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  whatsappAccounts: Array<{
    id: string;
    name: string;
    displayPhoneNumber: string;
    phoneNumberId: string;
    isActive: boolean;
    defaultFlowId?: string | null;
  }>;
}
