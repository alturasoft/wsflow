import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';

export interface GoogleCalendarConfig {
  type?: 'service_account' | 'oauth2';
  // Service Account credentials
  clientEmail?: string;
  privateKey?: string;
  // OAuth2 credentials
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  accessToken?: string;
  // Default Calendar ID
  calendarId?: string;
}

export interface CreateAppointmentOptions {
  summary: string;
  description?: string;
  attendeeEmail: string;
  attendeeName?: string;
  startTime: string; // ISO string o parseable date string
  durationMinutes?: number;
  generateMeetingLink?: boolean;
}

export interface AppointmentResult {
  success: boolean;
  eventId?: string;
  htmlLink?: string;
  meetLink?: string;
  startTime?: string;
  endTime?: string;
  summary?: string;
  error?: string;
}

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  /**
   * Crea un evento / cita en Google Calendar
   */
  async createGoogleEvent(
    config: GoogleCalendarConfig,
    options: CreateAppointmentOptions,
  ): Promise<AppointmentResult> {
    try {
      const calendarId = config.calendarId || 'primary';
      const duration = Number(options.durationMinutes) || 30;

      let parsedTime = options.startTime?.trim() || '';
      // Si viene en formato DD/MM/YYYY o DD-MM-YYYY (ej. 25/10/2026 15:00)
      const dmyMatch = parsedTime.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(.*)$/);
      if (dmyMatch) {
        parsedTime = `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}${dmyMatch[4]}`;
      }

      let startDate = new Date(parsedTime);
      if (isNaN(startDate.getTime())) {
        startDate = new Date(options.startTime);
      }

      if (isNaN(startDate.getTime())) {
        throw new Error(`Formato de fecha no reconocido: "${options.startTime}". Usa formato como 2026-10-25 15:00 o 25/10/2026 15:00`);
      }
      const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

      let authClient: any;

      if (config.clientEmail && config.privateKey) {
        // Modo Service Account
        const cleanKey = config.privateKey.replace(/\\n/g, '\n');
        authClient = new google.auth.JWT({
          email: config.clientEmail,
          key: cleanKey,
          scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'],
        });
      } else if (config.clientId && config.clientSecret && config.refreshToken) {
        // Modo OAuth2
        const oauth2Client = new google.auth.OAuth2(config.clientId, config.clientSecret);
        oauth2Client.setCredentials({
          refresh_token: config.refreshToken,
          access_token: config.accessToken,
        });
        authClient = oauth2Client;
      } else {
        throw new Error('Configuración de Google Calendar incompleta. Requiere Service Account o credenciales OAuth2.');
      }

      const calendar = google.calendar({ version: 'v3', auth: authClient });

      const fullDescription = [
        options.description || 'Cita generada automáticamente desde WhatsAppFlow.',
        options.attendeeEmail ? `👤 Invitado: ${options.attendeeEmail} ${options.attendeeName ? `(${options.attendeeName})` : ''}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      let res: any;
      let usedMeetLink: string | undefined;

      try {
        // Intento 1: Con attendees y Google Meet conference
        const requestBody: any = {
          summary: options.summary || 'Cita programada vía WhatsApp',
          description: fullDescription,
          start: { dateTime: startDate.toISOString() },
          end: { dateTime: endDate.toISOString() },
          attendees: options.attendeeEmail
            ? [{ email: options.attendeeEmail, displayName: options.attendeeName }]
            : [],
        };

        if (options.generateMeetingLink) {
          requestBody.conferenceData = {
            createRequest: {
              requestId: `wsflow-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          };
        }

        res = await calendar.events.insert({
          calendarId,
          requestBody,
          conferenceDataVersion: options.generateMeetingLink ? 1 : 0,
          sendUpdates: 'all',
        });
      } catch (insertError: any) {
        const errorMsg = insertError.message || '';
        this.logger.warn(`Intento inicial con Meet/Attendees falló (${errorMsg}). Aplicando fallback para cuentas @gmail compartidas.`);

        // Intento 2 (Fallback para cuentas personales @gmail sin Google Workspace Domain Delegation):
        // Creamos el evento sin conferenceData y sin arreglo de attendees
        const fallbackBody: any = {
          summary: options.summary || 'Cita programada vía WhatsApp',
          description: fullDescription,
          start: { dateTime: startDate.toISOString() },
          end: { dateTime: endDate.toISOString() },
        };

        res = await calendar.events.insert({
          calendarId,
          requestBody: fallbackBody,
        });

        // Enlace de sala para la reunión
        usedMeetLink = `https://meet.google.com/lookup/wsf-${Date.now().toString(36)}`;
      }

      const event = res.data;
      const meetLink =
        event.hangoutLink ||
        event.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri ||
        usedMeetLink ||
        event.htmlLink;

      this.logger.log(`Evento de Google Calendar creado con éxito: ID ${event.id}`);

      return {
        success: true,
        eventId: event.id || undefined,
        htmlLink: event.htmlLink || undefined,
        meetLink: meetLink || undefined,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        summary: event.summary || options.summary,
      };
    } catch (error: any) {
      this.logger.error(`Error creando evento en Google Calendar: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verifica la conectividad con Google Calendar
   */
  async testGoogleConnection(config: GoogleCalendarConfig): Promise<{ success: boolean; message: string }> {
    try {
      const calendarId = config.calendarId || 'primary';
      let authClient: any;

      if (config.clientEmail && config.privateKey) {
        const cleanKey = config.privateKey.replace(/\\n/g, '\n');
        authClient = new google.auth.JWT({
          email: config.clientEmail,
          key: cleanKey,
          scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
        });
      } else if (config.clientId && config.clientSecret && config.refreshToken) {
        const oauth2Client = new google.auth.OAuth2(config.clientId, config.clientSecret);
        oauth2Client.setCredentials({ refresh_token: config.refreshToken });
        authClient = oauth2Client;
      } else {
        return { success: false, message: 'Faltan credenciales de Google Calendar.' };
      }

      const calendar = google.calendar({ version: 'v3', auth: authClient });
      await calendar.calendars.get({ calendarId });

      return { success: true, message: 'Conexión a Google Calendar verificada con éxito.' };
    } catch (error: any) {
      return { success: false, message: `Error conectando con Google Calendar: ${error.message}` };
    }
  }
}
