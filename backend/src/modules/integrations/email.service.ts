import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface SmtpConfig {
  host: string;
  port: number;
  secure?: boolean;
  user: string;
  pass: string;
  fromName?: string;
  fromEmail?: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  /**
   * Envía un correo electrónico usando una configuración SMTP específica
   */
  async sendEmail(
    config: SmtpConfig,
    options: SendEmailOptions,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const port = Number(config.port) || 587;
      const secure = config.secure !== undefined ? Boolean(config.secure) : port === 465;

      const transporter = nodemailer.createTransport({
        host: config.host,
        port,
        secure,
        auth: {
          user: config.user,
          pass: config.pass,
        },
        connectionTimeout: 10000,
        greetingTimeout: 5000,
      });

      const fromAddress = config.fromEmail || config.user;
      const fromName = config.fromName || 'Notificaciones';

      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: options.to,
        subject: options.subject,
        text: options.text || (options.html ? options.html.replace(/<[^>]*>?/gm, '') : ''),
        html: options.html,
      });

      this.logger.log(`Correo enviado con éxito a ${options.to}. ID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      this.logger.error(`Error enviando correo a ${options.to}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verifica la conectividad con el servidor SMTP
   */
  async testConnection(config: SmtpConfig): Promise<{ success: boolean; message: string }> {
    try {
      const port = Number(config.port) || 587;
      const secure = config.secure !== undefined ? Boolean(config.secure) : port === 465;

      const transporter = nodemailer.createTransport({
        host: config.host,
        port,
        secure,
        auth: {
          user: config.user,
          pass: config.pass,
        },
        connectionTimeout: 8000,
      });

      await transporter.verify();
      return { success: true, message: 'Conexión SMTP exitosa y verificada.' };
    } catch (error: any) {
      return { success: false, message: `Fallo de verificación SMTP: ${error.message}` };
    }
  }
}
