export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string; // WABA ID
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<WhatsAppIncomingMessage>;
        statuses?: Array<WhatsAppMessageStatus>;
      };
      field: string;
    }>;
  }>;
}

export interface WhatsAppIncomingMessage {
  from: string; // Phone number in E.164 without '+'
  id: string; // wamid
  timestamp: string;
  type: 'text' | 'interactive' | 'button' | 'image' | 'document' | 'audio' | 'location' | 'contacts';
  text?: {
    body: string;
  };
  interactive?: {
    type: 'button_reply' | 'list_reply' | 'nfm_reply'; // nfm_reply = WhatsApp Flow response
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
    nfm_reply?: {
      response_json: string;
      body: string;
      name: string;
    };
  };
  button?: {
    payload: string;
    text: string;
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  document?: {
    id: string;
    filename: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
}

export interface WhatsAppMessageStatus {
  id: string; // wamid
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{
    code: number;
    title: string;
    message: string;
    error_data?: {
      details: string;
    };
  }>;
}
