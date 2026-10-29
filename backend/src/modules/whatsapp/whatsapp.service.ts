import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiVersion: string;
  private readonly http: AxiosInstance;

  constructor() {
    this.apiVersion = process.env.META_API_VERSION || 'v20.0';
    this.http = axios.create({
      baseURL: `https://graph.facebook.com/${this.apiVersion}`,
      timeout: 10000,
    });
  }

  /**
   * Envía un mensaje de texto simple
   */
  async sendText(
    phoneNumberId: string,
    accessToken: string,
    to: string,
    body: string,
    previewUrl = false,
  ) {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: previewUrl,
        body,
      },
    };
    return this.postMessage(phoneNumberId, accessToken, payload);
  }

  /**
   * Envía un mensaje interactivo con hasta 3 botones
   */
  async sendButtons(
    phoneNumberId: string,
    accessToken: string,
    to: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>,
    headerText?: string,
    footerText?: string,
  ) {
    if (buttons.length > 3) {
      throw new Error('Meta permite un máximo de 3 botones interactivos por mensaje');
    }

    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: {
          buttons: buttons.map((btn) => ({
            type: 'reply',
            reply: {
              id: btn.id,
              title: btn.title.substring(0, 20), // Meta limita títulos de botones a 20 caracteres
            },
          })),
        },
      },
    };

    if (headerText) {
      payload.interactive.header = { type: 'text', text: headerText };
    }
    if (footerText) {
      payload.interactive.footer = { text: footerText };
    }

    return this.postMessage(phoneNumberId, accessToken, payload);
  }

  /**
   * Envía un mensaje interactivo de tipo Lista (hasta 10 opciones)
   */
  async sendList(
    phoneNumberId: string,
    accessToken: string,
    to: string,
    bodyText: string,
    buttonLabel: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>,
    headerText?: string,
    footerText?: string,
  ) {
    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: bodyText },
        action: {
          button: buttonLabel.substring(0, 20),
          sections: sections.map((sec) => ({
            title: sec.title.substring(0, 24),
            rows: sec.rows.map((row) => ({
              id: row.id,
              title: row.title.substring(0, 24),
              description: row.description ? row.description.substring(0, 72) : undefined,
            })),
          })),
        },
      },
    };

    if (headerText) {
      payload.interactive.header = { type: 'text', text: headerText };
    }
    if (footerText) {
      payload.interactive.footer = { text: footerText };
    }

    return this.postMessage(phoneNumberId, accessToken, payload);
  }

  /**
   * Envía una vCard de contacto (Handoff directo a un asesor/ajustador)
   */
  async sendContactVCard(
    phoneNumberId: string,
    accessToken: string,
    to: string,
    contact: {
      formattedName: string;
      firstName: string;
      lastName?: string;
      phone: string;
      organization?: string;
      email?: string;
    },
  ) {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'contacts',
      contacts: [
        {
          name: {
            formatted_name: contact.formattedName,
            first_name: contact.firstName,
            last_name: contact.lastName || '',
          },
          org: contact.organization ? { company: contact.organization } : undefined,
          phones: [
            {
              phone: contact.phone,
              type: 'CELL',
              wa_id: contact.phone.replace(/[^0-9]/g, ''),
            },
          ],
          emails: contact.email ? [{ email: contact.email, type: 'WORK' }] : undefined,
        },
      ],
    };

    return this.postMessage(phoneNumberId, accessToken, payload);
  }

  /**
   * Envía mensaje disparador de un WhatsApp Flow oficial nativo
   */
  async sendFlow(
    phoneNumberId: string,
    accessToken: string,
    to: string,
    bodyText: string,
    flowId: string,
    flowToken: string,
    flowCtaText = 'Completar formulario',
    screenId = 'FIRST_SCREEN',
  ) {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'flow',
        body: { text: bodyText },
        action: {
          name: 'flow',
          parameters: {
            flow_message_version: '3',
            flow_token: flowToken,
            flow_id: flowId,
            flow_cta: flowCtaText,
            flow_action: 'navigate',
            flow_action_payload: {
              screen: screenId,
            },
          },
        },
      },
    };

    return this.postMessage(phoneNumberId, accessToken, payload);
  }

  /**
   * Petición HTTP POST genérica hacia Meta Graph API con reintentos para fallos transitorios de red/DNS
   */
  private async postMessage(
    phoneNumberId: string,
    accessToken: string,
    payload: any,
    maxRetries = 2,
  ) {
    if (!accessToken || accessToken.startsWith('mock_')) {
      this.logger.log(`[MOCK WHATSAPP OUTBOUND] (${phoneNumberId}) -> A ${payload.to}: [${payload.type}] ${JSON.stringify(payload.text || payload.interactive || payload.contacts)}`);
      return {
        messaging_product: 'whatsapp',
        contacts: [{ input: payload.to, wa_id: payload.to }],
        messages: [{ id: `wamid.mock_${Date.now()}` }],
      };
    }

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const response = await this.http.post(`/${phoneNumberId}/messages`, payload, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        return response.data;
      } catch (error: any) {
        const isNetworkOrDnsError =
          error.code === 'EAI_AGAIN' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNRESET' ||
          error.code === 'ECONNABORTED' ||
          (error.response?.status && error.response.status >= 500);

        if (attempt <= maxRetries && isNetworkOrDnsError) {
          const delayMs = attempt * 1000;
          this.logger.warn(
            `Error transitorio (${error.code || error.response?.status}) enviando mensaje a WhatsApp API. Reintentando intento ${attempt}/${maxRetries} en ${delayMs}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        const errDetails = error.response?.data?.error || error.message;
        this.logger.error(`Error enviando mensaje a WhatsApp API (${phoneNumberId}):`, errDetails);
        throw error;
      }
    }
  }
}
