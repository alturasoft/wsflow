import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { EncryptionService } from '../../common/encryption/encryption.service';
import { IntegrationsService } from '../integrations/integrations.service';
import axios from 'axios';

export interface DAGNode {
  id: string;
  type:
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
  data: any;
}

export interface DAGEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string; // Por ejemplo el ID del botón específico
  label?: string;
}

export interface FlowDefinition {
  nodes: DAGNode[];
  edges: DAGEdge[];
}

@Injectable()
export class DagEngineService {
  private readonly logger = new Logger(DagEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly whatsapp: WhatsAppService,
    private readonly encryption: EncryptionService,
    private readonly integrations: IntegrationsService,
  ) {}

  /**
   * Procesa un mensaje entrante dentro del contexto del DAG multi-tenant
   */
  async processIncomingMessage(params: {
    phoneNumberId: string;
    from: string; // E.164
    profileName?: string;
    textBody?: string;
    buttonReplyId?: string;
    listReplyId?: string;
    flowResponseJson?: string;
  }) {
    const { phoneNumberId, from, profileName, textBody, buttonReplyId, listReplyId, flowResponseJson } = params;

    // 1. Obtener la cuenta de WhatsApp registrada
    let account = await this.prisma.whatsAppAccount.findUnique({
      where: { phoneNumberId },
      include: { tenant: true },
    });

    if (!account) {
      account = await this.prisma.whatsAppAccount.findFirst({
        where: { isActive: true },
        include: { tenant: true },
      });
      if (account) {
        this.logger.log(`Vinculando dinámicamente phoneNumberId ${phoneNumberId} a la cuenta WABA "${account.name}"`);
        account = await this.prisma.whatsAppAccount.update({
          where: { id: account.id },
          data: { phoneNumberId },
          include: { tenant: true },
        });
      }
    }

    if (!account || !account.isActive) {
      this.logger.warn(`Cuenta WABA no encontrada o inactiva para phoneNumberId: ${phoneNumberId}`);
      return;
    }

    const tenantId = account.tenantId;
    const accessToken = this.encryption.decrypt(account.accessTokenEncrypted) || account.accessTokenEncrypted;

    // 2. Obtener o crear el Contacto en este Tenant
    let contact = await this.prisma.contact.findUnique({
      where: {
        tenantId_phoneNumber: {
          tenantId,
          phoneNumber: from,
        },
      },
    });

    if (!contact) {
      contact = await this.prisma.contact.create({
        data: {
          tenantId,
          phoneNumber: from,
          name: profileName || null,
          customFields: {},
        },
      });
    } else if (profileName && !contact.name) {
      contact = await this.prisma.contact.update({
        where: { id: contact.id },
        data: { name: profileName },
      });
    }

    // 3. Consultar sesión activa en caliente (Redis)
    let session = await this.redis.getSession(tenantId, from);

    // 4. Si no existe en Redis, buscar en PostgreSQL
    if (!session) {
      const dbSession = await this.prisma.conversation.findFirst({
        where: {
          tenantId,
          contactId: contact.id,
          status: { in: ['BOT_ACTIVE', 'HANDED_OFF'] },
        },
        include: {
          flowVersion: true,
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (dbSession) {
        session = {
          conversationId: dbSession.id,
          flowVersionId: dbSession.flowVersionId,
          currentNodeId: dbSession.currentNodeId,
          status: dbSession.status,
          variables: (dbSession.variables as any) || {},
          definition: dbSession.flowVersion ? (dbSession.flowVersion.definition as any) : null,
        };
        await this.redis.saveSession(tenantId, from, session);
      }
    }

    // 5. Manejo de atención humana (HANDED_OFF)
    if (session && session.status === 'HANDED_OFF') {
      const lowerText = (textBody || '').trim().toLowerCase();
      const isResetCommand = ['reiniciar', 'reset', 'menu', 'bot', 'volver'].includes(lowerText);

      if (isResetCommand) {
        this.logger.log(`Usuario ${from} solicitó reactivar el bot con comando "${lowerText}". Cerrando estado HANDED_OFF.`);
        await this.prisma.conversation.update({
          where: { id: session.conversationId },
          data: { status: 'CLOSED' },
        });
        await this.redis.deleteSession(tenantId, from);
        session = null; // Continuar hacia el inicio de una nueva sesión abajo
      } else {
        this.logger.log(`Conversación con ${from} en estado HANDED_OFF. Bot silenciado para operador humano.`);
        // Solo registramos el mensaje para la bandeja del operador
        await this.prisma.message.create({
          data: {
            tenantId,
            conversationId: session.conversationId,
            direction: 'INBOUND',
            senderType: 'USER',
            type: 'TEXT',
            content: { text: textBody || buttonReplyId || listReplyId },
            status: 'DELIVERED',
          },
        });
        return;
      }
    }

    // 5.1 Si el usuario escribe palabras de saludo/reinicio ("hola", "menu", "reiniciar") o palabras clave de otro flujo:
    // IMPORTANTE: Solo aplica si es un MENSAJE DE TEXTO libre escrito por el usuario.
    // NUNCA si es una respuesta interactiva (botón, lista o Meta Flow) donde Meta incluye buttonReplyId/listReplyId.
    const isInteractiveReply = Boolean(buttonReplyId || listReplyId || flowResponseJson);

    if (!isInteractiveReply && session && session.status === 'BOT_ACTIVE' && textBody) {
      const lower = textBody.trim().toLowerCase();
      const isResetWord = ['hola', 'menu', 'inicio', 'reiniciar', 'reset', 'empezar'].includes(lower);

      // Verificar si el mensaje coincide estrictamente con palabras clave de algún OTRO flujo del tenant
      const keywordFlow = await this.findFlowByKeyword(tenantId, textBody);

      if (isResetWord || (keywordFlow && keywordFlow.activeVersion.id !== session.flowVersionId)) {
        this.logger.log(`Usuario ${from} envió palabra de inicio o trigger ("${textBody}"). Cerrando sesión previa para iniciar nuevo flujo.`);
        await this.prisma.conversation.update({
          where: { id: session.conversationId },
          data: { status: 'CLOSED' },
        });
        await this.redis.deleteSession(tenantId, from);
        session = null; // Forza a arrancar una nueva sesión limpia en el paso 6
      }
    }

    // 6. Si no hay sesión previa o la sesión ya concluyó: Iniciar nueva sesión con Flujo
    if (!session || !session.currentNodeId || session.status === 'CLOSED') {
      const activeFlow = await this.resolveInitialFlow(tenantId, account.defaultFlowId, textBody);
      if (!activeFlow || !activeFlow.activeVersion) {
        this.logger.warn(`No hay flujo activo configurado para el tenant ${tenantId}`);
        return;
      }

      const definition = activeFlow.activeVersion.definition as unknown as FlowDefinition;
      const startNode = definition.nodes.find((n) => n.type === 'start');

      if (!startNode) {
        this.logger.error(`El flujo ${activeFlow.id} no tiene un nodo de tipo 'start'`);
        return;
      }

      // Crear conversación en PostgreSQL
      const newConv = await this.prisma.conversation.create({
        data: {
          tenantId,
          whatsappAccountId: account.id,
          contactId: contact.id,
          flowVersionId: activeFlow.activeVersion.id,
          currentNodeId: startNode.id,
          status: 'BOT_ACTIVE',
          variables: {
            nombre_cliente: contact.name || 'Cliente',
            telefono_cliente: from,
          },
          windowExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      session = {
        conversationId: newConv.id,
        flowVersionId: activeFlow.activeVersion.id,
        currentNodeId: startNode.id,
        status: 'BOT_ACTIVE',
        variables: {
          nombre_cliente: contact.name || 'Cliente',
          telefono_cliente: from,
        },
        definition,
      };

      // Registrar mensaje entrante de inicio
      await this.prisma.message.create({
        data: {
          tenantId,
          conversationId: session.conversationId,
          direction: 'INBOUND',
          senderType: 'USER',
          type: 'TEXT',
          content: { text: textBody || 'Hola' },
          status: 'DELIVERED',
        },
      });

      // Avanzar desde el StartNode al primer nodo ejecutable
      const initialEdge = definition.edges.find((e) => e.source === startNode.id);
      if (initialEdge) {
        await this.executeNodeChain({
          tenantId,
          phoneNumberId,
          accessToken,
          to: from,
          session,
          targetNodeId: initialEdge.target,
        });
      }
      return;
    }

    // 7. Si hay sesión activa en un nodo interactivo/espera: Evaluar respuesta
    const definition: FlowDefinition = session.definition;
    const currentNode = definition.nodes.find((n) => n.id === session.currentNodeId);

    if (!currentNode) {
      this.logger.warn(`Nodo actual ${session.currentNodeId} no existe en la definición del flujo`);
      return;
    }

    // Guardar mensaje entrante
    await this.prisma.message.create({
      data: {
        tenantId,
        conversationId: session.conversationId,
        direction: 'INBOUND',
        senderType: 'USER',
        type: 'TEXT',
        content: { text: textBody, buttonReplyId, listReplyId, flowResponseJson },
        status: 'DELIVERED',
      },
    });

    let nextNodeId: string | null = null;

    // A) Si el nodo actual era de botones o lista:
    if (currentNode.type === 'buttons' || currentNode.type === 'list') {
      let selectedId = buttonReplyId || listReplyId;

      // Si el usuario escribió texto en lugar de presionar el botón interactivo de Meta:
      if (!selectedId && textBody && currentNode.type === 'buttons') {
        const textLower = textBody.trim().toLowerCase();
        const buttons = (currentNode.data?.buttons || []) as Array<{ id: string; title: string }>;
        const matchedBtn = buttons.find(
          (b, idx) =>
            b.title.trim().toLowerCase() === textLower ||
            textLower === String(idx + 1) ||
            textLower.includes(b.title.trim().toLowerCase()),
        );
        if (matchedBtn) {
          selectedId = matchedBtn.id;
        }
      }

      // Si el usuario escribió texto en lugar de seleccionar de la lista interactiva de Meta:
      if (!selectedId && textBody && currentNode.type === 'list') {
        const textLower = textBody.trim().toLowerCase();
        const sections = (currentNode.data?.sections || []) as Array<{
          title: string;
          rows: Array<{ id: string; title: string; description?: string }>;
        }>;
        for (const sec of sections) {
          const matchedRow = (sec.rows || []).find(
            (r, idx) =>
              r.title.trim().toLowerCase() === textLower ||
              textLower === String(idx + 1) ||
              textLower.includes(r.title.trim().toLowerCase()),
          );
          if (matchedRow) {
            selectedId = matchedRow.id;
            break;
          }
        }
      }

      // Buscar conexión que coincida con el sourceHandle del botón o fila
      const matchedEdge =
        definition.edges.find((e) => e.source === currentNode.id && e.sourceHandle === selectedId) ||
        definition.edges.find((e) => e.source === currentNode.id && !e.sourceHandle);

      if (matchedEdge) {
        nextNodeId = matchedEdge.target;
      } else {
        const isKnownButton = (currentNode.data?.buttons || []).some((b: any) => b.id === selectedId);
        const isKnownListOpt = (currentNode.data?.sections || []).some((s: any) =>
          (s.rows || []).some((r: any) => r.id === selectedId),
        );

        if (isKnownButton || isKnownListOpt) {
          this.logger.warn(`Opción "${selectedId}" seleccionada pero no tiene arista conectada en el flujo.`);
          await this.whatsapp.sendText(
            phoneNumberId,
            accessToken,
            from,
            'ℹ️ Esta opción aún no tiene una acción conectada en el diseñador de flujos. Por favor selecciona otra de las opciones disponibles:',
          );
        } else {
          this.logger.log(`Respuesta "${textBody}" no coincide con opciones válidas de botones/lista. Reenviando opciones a ${from}.`);
        }

        // Reenviar opciones del nodo actual para mantener la interacción viva
        if (currentNode.type === 'buttons') {
          const retryButtons = (currentNode.data?.buttons || []).map((b: any) => ({
            id: b.id,
            title: b.title,
          }));
          if (retryButtons.length > 0) {
            await this.whatsapp.sendButtons(
              phoneNumberId,
              accessToken,
              from,
              currentNode.data?.text || 'Por favor selecciona una de las siguientes opciones:',
              retryButtons,
            );
          }
        } else if (currentNode.type === 'list') {
          const buttonLabel = currentNode.data?.buttonLabel || 'Ver opciones';
          const sections = currentNode.data?.sections || [];
          await this.whatsapp.sendList(
            phoneNumberId,
            accessToken,
            from,
            currentNode.data?.text || 'Opciones:',
            buttonLabel,
            sections,
          );
        }
        return;
      }
    }
    // B) Si el nodo actual era de captura de datos:
    else if (currentNode.type === 'capture') {
      const varName = currentNode.data?.variableName || 'captura';
      const inputVal = textBody?.trim() || '';

      // Validación simple de tipo si está configurada
      const validationType = currentNode.data?.validationType;
      let isValid = true;
      if (validationType === 'email') {
        isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputVal);
      } else if (validationType === 'number') {
        isValid = /^\d+$/.test(inputVal);
      }

      if (!isValid) {
        // Enviar mensaje de error y mantenerse en el mismo nodo
        const retryText = currentNode.data?.retryMessage || 'El formato ingresado no es válido. Por favor, intenta de nuevo:';
        await this.whatsapp.sendText(phoneNumberId, accessToken, from, retryText);
        return;
      }

      session.variables[varName] = inputVal;
      const outgoingEdge = definition.edges.find((e) => e.source === currentNode.id);
      if (outgoingEdge) {
        nextNodeId = outgoingEdge.target;
      }
    } else {
      // Por defecto, seguir la arista de salida
      const defaultEdge = definition.edges.find((e) => e.source === currentNode.id);
      if (defaultEdge) {
        nextNodeId = defaultEdge.target;
      }
    }

    if (nextNodeId) {
      await this.executeNodeChain({
        tenantId,
        phoneNumberId,
        accessToken,
        to: from,
        session,
        targetNodeId: nextNodeId,
      });
    }
  }

  /**
   * Ejecuta la cadena de nodos hasta encontrar un nodo interactivo que requiera esperar input del usuario
   */
  private async executeNodeChain(params: {
    tenantId: string;
    phoneNumberId: string;
    accessToken: string;
    to: string;
    session: any;
    targetNodeId: string;
  }) {
    const { tenantId, phoneNumberId, accessToken, to, session } = params;
    let currentId = params.targetNodeId;
    const definition: FlowDefinition = session.definition;

    while (currentId) {
      const node = definition.nodes.find((n) => n.id === currentId);
      if (!node) break;

      session.currentNodeId = node.id;

      // 1. NODO MENSAJE
      if (node.type === 'message') {
        const text = this.interpolate(node.data?.text || '', session.variables);
        await this.whatsapp.sendText(phoneNumberId, accessToken, to, text);
        await this.recordBotMessage(tenantId, session.conversationId, { text });

        const nextEdge = definition.edges.find((e) => e.source === node.id);
        currentId = nextEdge ? nextEdge.target : null;
      }
      // 2. NODO BOTONES (INTERACTIVO) -> Se envía y se DETIENE a esperar respuesta
      else if (node.type === 'buttons') {
        const text = this.interpolate(node.data?.text || 'Selecciona una opción:', session.variables);
        const buttons = (node.data?.buttons || []).map((b: any) => ({
          id: b.id,
          title: this.interpolate(b.title, session.variables),
        }));

        await this.whatsapp.sendButtons(phoneNumberId, accessToken, to, text, buttons);
        await this.recordBotMessage(tenantId, session.conversationId, { text, buttons });
        // Se detiene la cadena; se espera que el usuario presione un botón
        break;
      }
      // 3. NODO LISTA (INTERACTIVO) -> Se envía y se DETIENE a esperar respuesta
      else if (node.type === 'list') {
        const text = this.interpolate(node.data?.text || 'Opciones:', session.variables);
        const buttonLabel = node.data?.buttonLabel || 'Ver opciones';
        const sections = node.data?.sections || [];

        await this.whatsapp.sendList(phoneNumberId, accessToken, to, text, buttonLabel, sections);
        await this.recordBotMessage(tenantId, session.conversationId, { text, sections });
        break;
      }
      // 4. NODO CAPTURA DE DATOS -> Envía la pregunta y se DETIENE a esperar el texto del usuario
      else if (node.type === 'capture') {
        const promptText = this.interpolate(node.data?.prompt || 'Por favor ingresa la información:', session.variables);
        await this.whatsapp.sendText(phoneNumberId, accessToken, to, promptText);
        await this.recordBotMessage(tenantId, session.conversationId, { text: promptText });
        break;
      }
      // 5. NODO CONDICIÓN (AUTOMÁTICO) -> Evalúa variable y sigue camino TRUE o FALSE
      else if (node.type === 'condition') {
        const varName = node.data?.variableName;
        const operator = node.data?.operator || '==';
        const targetValue = node.data?.targetValue;
        const actualValue = session.variables[varName];

        const isTrue = this.evaluateCondition(actualValue, operator, targetValue);
        const branchHandle = isTrue ? 'true' : 'false';

        const branchEdge = definition.edges.find(
          (e) => e.source === node.id && (e.sourceHandle === branchHandle || (!e.sourceHandle && isTrue)),
        );
        currentId = branchEdge ? branchEdge.target : null;
      }
      // 6. NODO API CALL (AUTOMÁTICO) -> Consulta externa e inyección en variables
      else if (node.type === 'api_call') {
        const url = this.interpolate(node.data?.url || '', session.variables);
        const method = (node.data?.method || 'GET').toUpperCase();
        const headers = node.data?.headers || {};
        const body = node.data?.body ? JSON.parse(this.interpolate(JSON.stringify(node.data.body), session.variables)) : undefined;

        try {
          const res = await axios({ method, url, headers, data: body, timeout: 5000 });
          // Mapear respuesta a variables si está configurado
          if (node.data?.responseMappings) {
            for (const map of node.data.responseMappings) {
              session.variables[map.variableName] = res.data[map.jsonPath] || null;
            }
          }
        } catch (error: any) {
          this.logger.error(`Fallo en nodo API Call (${url}):`, error.message);
          // Si hay una arista de error/fallback:
          const fallbackEdge = definition.edges.find((e) => e.source === node.id && e.sourceHandle === 'error');
          if (fallbackEdge) {
            currentId = fallbackEdge.target;
            continue;
          }
        }

        const nextEdge = definition.edges.find((e) => e.source === node.id && e.sourceHandle !== 'error');
        currentId = nextEdge ? nextEdge.target : null;
      }
      // 7. NODO AGENDAR CITA (CALENDARIO)
      else if (node.type === 'appointment') {
        const summary = this.interpolate(node.data?.summary || 'Cita de Asesoría', session.variables);
        const description = this.interpolate(node.data?.description || '', session.variables);
        const attendeeEmail = this.interpolate(node.data?.attendeeEmail || '', session.variables);
        const attendeeName = this.interpolate(node.data?.attendeeName || '', session.variables);
        const startTime = this.interpolate(node.data?.startTime || '', session.variables);
        const durationMinutes = Number(node.data?.durationMinutes) || 30;
        const generateMeetingLink = Boolean(node.data?.generateMeetingLink !== false);
        const integrationId = node.data?.integrationId;

        try {
          const appResult = await this.integrations.executeAppointment(tenantId, integrationId, {
            summary,
            description,
            attendeeEmail,
            attendeeName,
            startTime,
            durationMinutes,
            generateMeetingLink,
          });

          if (appResult.success) {
            session.variables['appointment_id'] = appResult.eventId || '';
            session.variables['appointment_link'] = appResult.meetLink || appResult.htmlLink || '';
            session.variables['appointment_meet_link'] = appResult.meetLink || '';
            session.variables['appointment_html_link'] = appResult.htmlLink || '';
            session.variables['appointment_start'] = appResult.startTime || startTime;
            session.variables['appointment_end'] = appResult.endTime || '';

            const successEdge = definition.edges.find(
              (e) => e.source === node.id && (e.sourceHandle === 'success' || !e.sourceHandle || e.sourceHandle !== 'error'),
            );
            currentId = successEdge ? successEdge.target : null;
          } else {
            session.variables['appointment_error'] = appResult.error || 'Error agendando cita';
            const errorEdge = definition.edges.find((e) => e.source === node.id && e.sourceHandle === 'error');
            currentId = errorEdge ? errorEdge.target : null;
          }
        } catch (err: any) {
          this.logger.error(`Error en ejecución de nodo appointment: ${err.message}`);
          session.variables['appointment_error'] = err.message;
          const errorEdge = definition.edges.find((e) => e.source === node.id && e.sourceHandle === 'error');
          currentId = errorEdge ? errorEdge.target : null;
        }
      }
      // 8. NODO ENVIAR CORREO ELECTRÓNICO (SMTP)
      else if (node.type === 'send_email') {
        const toEmail = this.interpolate(node.data?.to || '', session.variables);
        const subject = this.interpolate(node.data?.subject || 'Notificación', session.variables);
        const body = this.interpolate(node.data?.body || '', session.variables);
        const isHtml = Boolean(node.data?.isHtml);
        const integrationId = node.data?.integrationId;

        try {
          const emailResult = await this.integrations.executeSendEmail(tenantId, integrationId, {
            to: toEmail,
            subject,
            html: isHtml ? body : undefined,
            text: isHtml ? undefined : body,
          });

          if (emailResult.success) {
            session.variables['email_status'] = 'SENT';
            session.variables['email_message_id'] = emailResult.messageId || '';
            const successEdge = definition.edges.find(
              (e) => e.source === node.id && (e.sourceHandle === 'success' || !e.sourceHandle || e.sourceHandle !== 'error'),
            );
            currentId = successEdge ? successEdge.target : null;
          } else {
            session.variables['email_status'] = 'FAILED';
            session.variables['email_error'] = emailResult.error || 'Error enviando correo';
            const errorEdge = definition.edges.find((e) => e.source === node.id && e.sourceHandle === 'error');
            currentId = errorEdge ? errorEdge.target : null;
          }
        } catch (err: any) {
          this.logger.error(`Error en ejecución de nodo send_email: ${err.message}`);
          session.variables['email_status'] = 'FAILED';
          session.variables['email_error'] = err.message;
          const errorEdge = definition.edges.find((e) => e.source === node.id && e.sourceHandle === 'error');
          currentId = errorEdge ? errorEdge.target : null;
        }
      }
      // 9. NODO HANDOFF / DERIVACIÓN
      else if (node.type === 'handoff') {
        const handoffType = node.data?.handoffType || 'vcard';

        if (handoffType === 'vcard' && node.data?.contactVCard) {
          const vcard = node.data.contactVCard;
          await this.whatsapp.sendContactVCard(phoneNumberId, accessToken, to, {
            formattedName: vcard.name,
            firstName: vcard.name,
            phone: vcard.phone,
            organization: vcard.organization,
          });
        }

        // Marcar sesión como derivada a humano (bot silenciado)
        session.status = 'HANDED_OFF';
        await this.prisma.conversation.update({
          where: { id: session.conversationId },
          data: { status: 'HANDED_OFF' },
        });
        break;
      }
      // 8. NODO FIN
      else if (node.type === 'end') {
        if (node.data?.closingMessage) {
          const msg = this.interpolate(node.data.closingMessage, session.variables);
          await this.whatsapp.sendText(phoneNumberId, accessToken, to, msg);
        }
        session.status = 'CLOSED';
        await this.prisma.conversation.update({
          where: { id: session.conversationId },
          data: { status: 'CLOSED' },
        });
        break;
      } else {
        const defaultEdge = definition.edges.find((e) => e.source === node.id);
        currentId = defaultEdge ? defaultEdge.target : null;
      }
    }

    // Persistir estado de sesión en Redis y PostgreSQL
    await this.redis.saveSession(tenantId, to, session);
    await this.prisma.conversation.update({
      where: { id: session.conversationId },
      data: {
        currentNodeId: session.currentNodeId,
        status: session.status,
        variables: session.variables,
        lastMessageAt: new Date(),
        windowExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  }

  private interpolate(text: string, vars: Record<string, any>): string {
    if (!text) return '';
    return text.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (_, key) => {
      return vars[key] !== undefined ? String(vars[key]) : `{{${key}}}`;
    });
  }

  private evaluateCondition(actual: any, operator: string, target: any): boolean {
    switch (operator) {
      case '==':
        return String(actual).toLowerCase() === String(target).toLowerCase();
      case '!=':
        return String(actual).toLowerCase() !== String(target).toLowerCase();
      case '>':
        return Number(actual) > Number(target);
      case '<':
        return Number(actual) < Number(target);
      case 'contains':
        return String(actual).toLowerCase().includes(String(target).toLowerCase());
      default:
        return false;
    }
  }

  private async recordBotMessage(tenantId: string, conversationId: string, content: any) {
    await this.prisma.message.create({
      data: {
        tenantId,
        conversationId,
        direction: 'OUTBOUND',
        senderType: 'BOT',
        type: content.buttons ? 'INTERACTIVE_BUTTON' : content.sections ? 'INTERACTIVE_LIST' : 'TEXT',
        content,
        status: 'SENT',
      },
    });
  }

  private async findFlowByKeyword(tenantId: string, text?: string) {
    if (!text) return null;
    const lower = text.trim().toLowerCase();
    const allFlows = await this.prisma.flow.findMany({
      where: { tenantId, isActive: true },
      include: {
        versions: {
          where: { status: 'PUBLISHED' },
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    const matchedFlow = allFlows.find((f) => {
      const keywords = Array.isArray(f.triggerKeywords) ? (f.triggerKeywords as string[]) : [];
      return keywords.some((kw) => {
        const k = String(kw).trim().toLowerCase();
        if (!k) return false;
        return lower === k || lower.split(/\s+/).includes(k) || lower.includes(k);
      });
    });

    if (matchedFlow && matchedFlow.versions.length > 0) {
      return { id: matchedFlow.id, activeVersion: matchedFlow.versions[0] };
    }

    return null;
  }

  private async resolveInitialFlow(tenantId: string, defaultFlowId?: string | null, text?: string) {
    // 1. Si el usuario envió una palabra clave (trigger keyword) de algún flujo:
    if (text) {
      const keywordFlow = await this.findFlowByKeyword(tenantId, text);
      if (keywordFlow) {
        this.logger.log(`Iniciando flujo id: "${keywordFlow.id}" por coincidencia de palabra clave.`);
        return keywordFlow;
      }
    }

    // 2. Si no coincide ninguna palabra clave, usar el flujo por defecto:
    if (defaultFlowId) {
      const flow = await this.prisma.flow.findUnique({
        where: { id: defaultFlowId },
        include: {
          versions: {
            where: { status: 'PUBLISHED' },
            orderBy: { versionNumber: 'desc' },
            take: 1,
          },
        },
      });
      if (flow && flow.versions.length > 0) {
        return { id: flow.id, activeVersion: flow.versions[0] };
      }
    }

    // 3. Fallback: buscar cualquier flujo activo para este tenant
    const flow = await this.prisma.flow.findFirst({
      where: { tenantId, isActive: true },
      include: {
        versions: {
          where: { status: 'PUBLISHED' },
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (flow && flow.versions.length > 0) {
      return { id: flow.id, activeVersion: flow.versions[0] };
    }

    return null;
  }
}
