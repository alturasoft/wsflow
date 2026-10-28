import React, { useState, useEffect, useRef } from 'react';
import { X, Send, RotateCcw, CheckCheck, Phone, Video, MoreVertical } from 'lucide-react';
import { Node, Edge } from '@xyflow/react';
import { NodeData } from '../types/flow';
import { API_BASE } from '../config';

interface SimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: Node[];
  edges: Edge[];
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text?: string;
  buttons?: Array<{ id: string; title: string }>;
  list?: {
    buttonLabel: string;
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>;
  };
  vcard?: any;
  timestamp: string;
}

export const Simulator: React.FC<SimulatorProps> = ({ isOpen, onClose, nodes, edges }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [variables, setVariables] = useState<Record<string, any>>({
    nombre_cliente: 'Mariana Rocha',
    telefono_cliente: '59170011223',
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Iniciar la simulación cuando se abre
  useEffect(() => {
    if (isOpen) {
      restartFlow();
    }
  }, [isOpen]);

  const restartFlow = () => {
    setMessages([]);
    setVariables({
      nombre_cliente: 'Mariana Rocha',
      telefono_cliente: '59170011223',
    });

    const startNode = nodes.find((n) => n.type === 'start');
    if (!startNode) return;

    // Ejecutar transición desde start al primer nodo
    const initialEdge = edges.find((e) => e.source === startNode.id);
    if (initialEdge) {
      executeFlowStep(initialEdge.target, {
        nombre_cliente: 'Mariana Rocha',
        telefono_cliente: '59170011223',
      });
    }
  };

  const interpolate = (text: string, vars: Record<string, any>) => {
    if (!text) return '';
    return text.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (_, key) => {
      return vars[key] !== undefined ? String(vars[key]) : `{{${key}}}`;
    });
  };

  const addBotMessage = (msg: Omit<ChatMessage, 'id' | 'sender' | 'timestamp'>) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [
      ...prev,
      {
        ...msg,
        id: `bot_${Date.now()}_${Math.random()}`,
        sender: 'bot',
        timestamp: time,
      },
    ]);
  };

  const addUserMessage = (text: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [
      ...prev,
      {
        id: `user_${Date.now()}`,
        sender: 'user',
        text,
        timestamp: time,
      },
    ]);
  };

  const executeFlowStep = async (targetId: string, currentVars: Record<string, any>) => {
    let activeId: string | null = targetId;
    let localVars = { ...currentVars };

    while (activeId) {
      const node = nodes.find((n) => n.id === activeId);
      if (!node) break;

      const data = node.data as unknown as NodeData;
      setCurrentNodeId(node.id);

      // 1. Mensaje de Texto
      if (node.type === 'message') {
        const text = interpolate(data.text || '', localVars);
        addBotMessage({ text });
        const nextEdge = edges.find((e) => e.source === node.id);
        activeId = nextEdge ? nextEdge.target : null;
      }
      // 2. Botones Interactivos -> Envía y se detiene a esperar interacción
      else if (node.type === 'buttons') {
        const text = interpolate(data.text || 'Selecciona una opción:', localVars);
        const buttons = (data.buttons || []).map((b) => ({
          id: b.id,
          title: interpolate(b.title, localVars),
        }));
        addBotMessage({ text, buttons });
        break;
      }
      // 2.1 Lista Interactiva -> Envía menú y se detiene a esperar selección
      else if (node.type === 'list') {
        const text = interpolate(data.text || 'Selecciona una opción de la lista:', localVars);
        const buttonLabel = data.buttonLabel || 'Ver opciones';
        const sections = data.sections || [];
        addBotMessage({ text, list: { buttonLabel, sections } });
        break;
      }
      // 3. Captura de Datos -> Envía prompt y se detiene a esperar texto
      else if (node.type === 'capture') {
        const text = interpolate(data.prompt || 'Por favor ingresa un dato:', localVars);
        addBotMessage({ text });
        break;
      }
      // 4. Condición -> Evalúa y toma la rama TRUE o FALSE
      else if (node.type === 'condition') {
        const val = localVars[data.variableName || ''];
        const isTrue = String(val).toLowerCase() === String(data.targetValue).toLowerCase();
        const branchHandle = isTrue ? 'true' : 'false';
        const branchEdge = edges.find(
          (e) => e.source === node.id && (e.sourceHandle === branchHandle || (!e.sourceHandle && isTrue)),
        );
        activeId = branchEdge ? branchEdge.target : null;
      }
      // 5. Consulta API -> Emula respuesta exitosa
      else if (node.type === 'api_call') {
        addBotMessage({ text: `⚡ [API Call simulada a ${data.url}]` });
        const nextEdge = edges.find((e) => e.source === node.id && e.sourceHandle !== 'error');
        activeId = nextEdge ? nextEdge.target : null;
      }
      // 5.1 Agendar Cita (Calendario) -> Llama en vivo a Google Calendar real
      else if (node.type === 'appointment') {
        const attendeeEmail = interpolate(data.attendeeEmail || '', localVars) || 'cliente@correo.com';
        const startVal = interpolate(data.startTime || '', localVars) || '2026-10-25 15:00';
        const summary = interpolate(data.summary || 'Cita de Asesoría', localVars);

        addBotMessage({ text: '⏳ Conectando con Google Calendar para agendar tu cita real...' });

        try {
          const res = await fetch(`${API_BASE}/integrations/schedule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenantId: 'e7a052fa-34d0-42d9-9976-9e09bd8986f2',
              integrationId: data.integrationId,
              summary,
              description: interpolate(data.description || '', localVars),
              attendeeEmail,
              attendeeName: localVars.nombre_cliente || 'Cliente',
              startTime: startVal,
              durationMinutes: data.durationMinutes || 30,
              generateMeetingLink: data.generateMeetingLink !== false,
            }),
          });
          const result = await res.json();

          if (result.success) {
            localVars['appointment_id'] = result.eventId || `id_${Date.now()}`;
            localVars['appointment_link'] = result.meetLink || result.htmlLink || '';
            localVars['appointment_meet_link'] = result.meetLink || '';
            localVars['appointment_start'] = result.startTime ? new Date(result.startTime).toLocaleString() : startVal;
            setVariables({ ...localVars });

            addBotMessage({
              text: `📅 ¡Cita creada en tu Google Calendar real!\n• Evento: ${summary}\n• Fecha: ${localVars['appointment_start']}\n• Enlace Meet: ${localVars['appointment_link']}`,
            });

            const nextEdge = edges.find(
              (e) => e.source === node.id && (e.sourceHandle === 'success' || !e.sourceHandle || e.sourceHandle !== 'error'),
            );
            activeId = nextEdge ? nextEdge.target : null;
          } else {
            addBotMessage({
              text: `⚠️ Fallo en Google Calendar: ${result.error || 'No se pudo crear el evento'}`,
            });
            const errorEdge = edges.find((e) => e.source === node.id && e.sourceHandle === 'error');
            activeId = errorEdge ? errorEdge.target : null;
          }
        } catch (e: any) {
          addBotMessage({ text: `⚠️ Error de conexión: ${e.message}` });
          const errorEdge = edges.find((e) => e.source === node.id && e.sourceHandle === 'error');
          activeId = errorEdge ? errorEdge.target : null;
        }
      }
      // 5.2 Enviar Correo (SMTP) -> Emula despacho de email
      else if (node.type === 'send_email') {
        const toEmail = interpolate(data.to || 'correo@cliente.com', localVars);
        const subj = interpolate(data.subject || 'Notificación', localVars);
        localVars['email_status'] = 'SENT';
        setVariables({ ...localVars });

        addBotMessage({
          text: `✉️ [Correo enviado a ${toEmail} | Asunto: "${subj}"]`,
        });

        const nextEdge = edges.find((e) => e.source === node.id && (e.sourceHandle === 'success' || !e.sourceHandle || e.sourceHandle !== 'error'));
        activeId = nextEdge ? nextEdge.target : null;
      }
      // 6. Handoff -> Envía vCard o notificación de operador
      else if (node.type === 'handoff') {
        if (data.handoffType === 'vcard' && data.contactVCard) {
          addBotMessage({
            text: 'Te enviamos el contacto del asesor asignado:',
            vcard: data.contactVCard,
          });
        } else {
          addBotMessage({
            text: '👤 Un operador humano ha tomado el control de esta conversación. El bot ha sido silenciado.',
          });
        }
        break;
      }
      // 7. Fin
      else if (node.type === 'end') {
        if (data.closingMessage) {
          addBotMessage({ text: interpolate(data.closingMessage, localVars) });
        }
        break;
      } else {
        const nextEdge = edges.find((e) => e.source === node.id);
        activeId = nextEdge ? nextEdge.target : null;
      }
    }

    setVariables(localVars);
  };

  const handleButtonClick = (buttonId: string, buttonTitle: string) => {
    addUserMessage(buttonTitle);

    if (!currentNodeId) return;
    // Buscar conexión que coincida con el sourceHandle del botón
    const matchedEdge = edges.find(
      (e) => e.source === currentNodeId && (!e.sourceHandle || e.sourceHandle === buttonId),
    );

    if (matchedEdge) {
      setTimeout(() => {
        executeFlowStep(matchedEdge.target, variables);
      }, 500);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentNodeId) return;

    const userText = inputText.trim();
    setInputText('');
    addUserMessage(userText);

    const currentNode = nodes.find((n) => n.id === currentNodeId);
    if (!currentNode) return;

    if (currentNode.type === 'capture') {
      const varName = (currentNode.data as any)?.variableName || 'dato';
      const updatedVars = { ...variables, [varName]: userText };
      setVariables(updatedVars);

      const nextEdge = edges.find((e) => e.source === currentNode.id);
      if (nextEdge) {
        setTimeout(() => {
          executeFlowStep(nextEdge.target, updatedVars);
        }, 500);
      }
    } else {
      const nextEdge = edges.find((e) => e.source === currentNode.id);
      if (nextEdge) {
        setTimeout(() => {
          executeFlowStep(nextEdge.target, variables);
        }, 500);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      {/* Marco de Teléfono WhatsApp */}
      <div
        style={{
          width: '380px',
          height: '680px',
          background: '#0c1317',
          borderRadius: '36px',
          border: '10px solid #1f2c34',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 30px rgba(37, 211, 102, 0.2)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Cabecera del Teléfono (Top Bar) */}
        <div
          style={{
            background: '#202c33',
            color: '#e9edef',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#00a884',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              SA
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Seguros Altura
                <span style={{ color: '#25d366', fontSize: '0.8rem' }}>✓</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#8696a0' }}>en línea (Simulador)</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#aebac1' }}>
            <button
              onClick={restartFlow}
              title="Reiniciar Simulación"
              style={{ background: 'transparent', border: 'none', color: '#aebac1', cursor: 'pointer' }}
            >
              <RotateCcw size={18} />
            </button>
            <button
              onClick={onClose}
              title="Cerrar Simulador"
              style={{ background: 'transparent', border: 'none', color: '#aebac1', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Cuerpo del Chat con Fondo WhatsApp */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            background: '#0b141a',
            backgroundImage:
              'radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        >
          <div style={{ textAlign: 'center', margin: '6px 0' }}>
            <span
              style={{
                background: '#182229',
                color: '#8696a0',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.65rem',
              }}
            >
              Hoy • Cifrado de extremo a extremo
            </span>
          </div>

          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '82%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  background: m.sender === 'user' ? '#005c4b' : '#202c33',
                  color: '#e9edef',
                  borderRadius:
                    m.sender === 'user' ? '8px 8px 0 8px' : '8px 8px 8px 0',
                  padding: '8px 12px',
                  fontSize: '0.825rem',
                  lineHeight: '1.4',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                }}
              >
                {m.text}

                {/* Tarjeta de Contacto vCard */}
                {m.vcard && (
                  <div
                    style={{
                      marginTop: '8px',
                      background: '#111b21',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      padding: '10px',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.85rem' }}>
                      {m.vcard.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#8696a0' }}>{m.vcard.organization}</div>
                    <div style={{ fontSize: '0.8rem', color: '#25d366', marginTop: '4px', fontWeight: 600 }}>
                      📞 {m.vcard.phone}
                    </div>
                    <button
                      style={{
                        width: '100%',
                        marginTop: '8px',
                        background: '#00a884',
                        color: '#111b21',
                        border: 'none',
                        padding: '6px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Guardar Contacto
                    </button>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '3px',
                    marginTop: '4px',
                    fontSize: '0.65rem',
                    color: '#8696a0',
                  }}
                >
                  <span>{m.timestamp}</span>
                  {m.sender === 'user' && <CheckCheck size={14} color="#53bdeb" />}
                </div>
              </div>

              {/* Botones Interactivos de WhatsApp */}
              {m.buttons && m.buttons.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  {m.buttons.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => handleButtonClick(b.id, b.title)}
                      style={{
                        background: '#202c33',
                        color: '#00a884',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#2a3942')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#202c33')}
                    >
                      {b.title}
                    </button>
                  ))}
                </div>
              )}

              {/* Lista Interactiva de WhatsApp (Menú de hasta 10 opciones) */}
              {m.list && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                  <div
                    style={{
                      background: '#1f2c34',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        padding: '7px 12px',
                        background: 'rgba(0, 168, 132, 0.12)',
                        color: '#00a884',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      ☰ {m.list.buttonLabel || 'Ver opciones'}
                    </div>
                    {m.list.sections.flatMap((s) => s.rows || []).map((row) => (
                      <button
                        key={row.id}
                        onClick={() => handleButtonClick(row.id, row.title)}
                        style={{
                          width: '100%',
                          background: 'transparent',
                          color: '#e9edef',
                          border: 'none',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          padding: '9px 12px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#2a3942')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#38bdf8' }}>{row.title}</span>
                        {row.description && (
                          <span style={{ fontSize: '0.7rem', color: '#8696a0', marginTop: '2px' }}>
                            {row.description}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Barra Inferior de Entrada */}
        <form
          onSubmit={handleSendMessage}
          style={{
            background: '#202c33',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Escribe un mensaje aquí..."
            style={{
              flex: 1,
              background: '#2a3942',
              border: 'none',
              borderRadius: '8px',
              color: '#e9edef',
              padding: '9px 14px',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: '#00a884',
              color: '#fff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
