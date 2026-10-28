import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Send,
  UserCheck,
  Bot,
  Clock,
  Phone,
  CheckCheck,
  RotateCcw,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
}

interface MessageItem {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  senderType: 'USER' | 'BOT' | 'AGENT' | 'SYSTEM';
  type: string;
  content: any;
  status: string;
  createdAt: string;
}

interface ConversationItem {
  id: string;
  tenantId: string;
  contact: Contact;
  status: 'BOT_ACTIVE' | 'HANDED_OFF' | 'CLOSED';
  variables: Record<string, any>;
  lastMessageAt: string;
  windowExpiresAt: string;
  messages: Array<{
    content: any;
    createdAt: string;
    senderType: string;
  }>;
}
import { API_BASE } from '../config';

export const HumanInbox: React.FC = () => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isWindowActive, setIsWindowActive] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    try {
      const query = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      const res = await fetch(`${API_BASE}/conversations${query}`);
      const data = await res.json();
      setConversations(data);
      if (!selectedConvId && data.length > 0) {
        setSelectedConvId(data[0].id);
      }
    } catch (e) {
      console.error('Error cargando conversaciones:', e);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000); // Polling suave para chats
    return () => clearInterval(interval);
  }, [statusFilter]);

  const loadConversationDetails = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/conversations/${id}`);
      const data = await res.json();
      setActiveConversation(data.conversation);
      setMessages(data.messages);
      setIsWindowActive(data.isWindowActive);
    } catch (e) {
      console.error('Error cargando mensajes:', e);
    }
  };

  useEffect(() => {
    if (selectedConvId) {
      loadConversationDetails(selectedConvId);
    }
  }, [selectedConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedConvId || isSending) return;

    const textToSend = replyText.trim();
    setReplyText('');
    setIsSending(true);

    try {
      await fetch(`${API_BASE}/conversations/${selectedConvId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSend }),
      });
      await loadConversationDetails(selectedConvId);
      await fetchConversations();
    } catch (err) {
      alert('Error enviando mensaje');
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdateStatus = async (newStatus: 'BOT_ACTIVE' | 'HANDED_OFF' | 'CLOSED') => {
    if (!selectedConvId) return;
    try {
      await fetch(`${API_BASE}/conversations/${selectedConvId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      await loadConversationDetails(selectedConvId);
      await fetchConversations();
    } catch (e) {
      alert('Error actualizando estado');
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const nameMatch = c.contact?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const phoneMatch = c.contact?.phoneNumber?.includes(searchQuery);
    return nameMatch || phoneMatch;
  });

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', width: '100vw', background: '#0a0e17' }}>
      {/* Columna Izquierda: Lista de Conversaciones */}
      <aside
        style={{
          width: '360px',
          background: '#0d131f',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {/* Barra de Búsqueda y Filtros */}
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#151d2f',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '8px 12px',
              marginBottom: '12px',
            }}
          >
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>

          {/* Filtros de Pestaña */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'HANDED_OFF', label: 'Humano' },
              { id: 'BOT_ACTIVE', label: 'Bot' },
              { id: 'CLOSED', label: 'Cerrados' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                style={{
                  flex: 1,
                  background: statusFilter === f.id ? 'rgba(37, 211, 102, 0.15)' : 'transparent',
                  color: statusFilter === f.id ? '#25d366' : '#94a3b8',
                  border: statusFilter === f.id ? '1px solid rgba(37, 211, 102, 0.4)' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '6px',
                  padding: '6px 4px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista Scrollable */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredConversations.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
              No hay conversaciones en esta categoría.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === selectedConvId;
              const lastMsg = conv.messages?.[0];
              const snippet = lastMsg?.content?.text || (lastMsg?.content?.buttons ? 'Botones interactivos' : 'Mensaje multimedia');

              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    background: isSelected ? '#151d2f' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = '#111726';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.9rem' }}>
                      {conv.contact?.name || 'Cliente'}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <Phone size={11} color="#64748b" />
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{conv.contact?.phoneNumber}</span>
                  </div>

                  <p
                    style={{
                      fontSize: '0.775rem',
                      color: isSelected ? '#cbd5e1' : '#64748b',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {snippet}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background:
                          conv.status === 'HANDED_OFF'
                            ? 'rgba(168, 85, 247, 0.2)'
                            : conv.status === 'BOT_ACTIVE'
                            ? 'rgba(37, 211, 102, 0.15)'
                            : 'rgba(100, 116, 139, 0.2)',
                        color:
                          conv.status === 'HANDED_OFF'
                            ? '#c084fc'
                            : conv.status === 'BOT_ACTIVE'
                            ? '#25d366'
                            : '#94a3b8',
                      }}
                    >
                      {conv.status === 'HANDED_OFF'
                        ? 'HUMANO'
                        : conv.status === 'BOT_ACTIVE'
                        ? 'BOT ACTIVO'
                        : 'CERRADO'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Columna Derecha: Vista de Chat Seleccionado */}
      {activeConversation ? (
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', background: '#0b141a' }}>
          {/* Cabecera del Chat Activo */}
          <div
            style={{
              padding: '12px 20px',
              background: '#111726',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#1f2c34',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: '#25d366',
                }}
              >
                {activeConversation.contact?.name?.substring(0, 2).toUpperCase() || 'CL'}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
                    {activeConversation.contact?.name || 'Cliente'}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    ({activeConversation.contact?.phoneNumber})
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.7rem',
                      color: isWindowActive ? '#34d399' : '#f43f5e',
                    }}
                  >
                    <Clock size={11} />
                    {isWindowActive ? 'Ventana Meta 24h: Abierta' : 'Ventana Meta 24h: Expirada (Requiere Plantilla)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Acciones de Estado */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {activeConversation.status !== 'BOT_ACTIVE' && (
                <button
                  onClick={() => handleUpdateStatus('BOT_ACTIVE')}
                  title="Devolver control al bot automático"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(37, 211, 102, 0.12)',
                    color: '#25d366',
                    border: '1px solid rgba(37, 211, 102, 0.3)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Bot size={14} /> Reanudar Bot
                </button>
              )}

              {activeConversation.status !== 'HANDED_OFF' && (
                <button
                  onClick={() => handleUpdateStatus('HANDED_OFF')}
                  title="Silenciar bot y tomar control humano"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(168, 85, 247, 0.15)',
                    color: '#c084fc',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <UserCheck size={14} /> Tomar Control
                </button>
              )}

              {activeConversation.status !== 'CLOSED' && (
                <button
                  onClick={() => handleUpdateStatus('CLOSED')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#1e293b',
                    color: '#94a3b8',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  Cerrar Caso
                </button>
              )}
            </div>
          </div>

          {/* Historial de Mensajes */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          >
            {/* Panel de Variables Capturadas */}
            {activeConversation.variables && Object.keys(activeConversation.variables).length > 0 && (
              <div
                style={{
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '10px',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#60a5fa', fontWeight: 600 }}>
                  <FileText size={13} />
                  <span>Datos de Sesión:</span>
                </div>
                {Object.entries(activeConversation.variables).map(([k, v]) => (
                  <span key={k} style={{ color: '#cbd5e1' }}>
                    <b style={{ color: '#94a3b8' }}>{k}:</b> {String(v)}
                  </span>
                ))}
              </div>
            )}

            {messages.map((m) => {
              const isUser = m.direction === 'INBOUND';
              const isAgent = m.senderType === 'AGENT';
              const isBot = m.senderType === 'BOT';

              return (
                <div
                  key={m.id}
                  style={{
                    alignSelf: isUser ? 'flex-start' : 'flex-end',
                    maxWidth: '75%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      background: isUser ? '#202c33' : isAgent ? '#005c4b' : '#1f2c34',
                      color: '#e9edef',
                      borderRadius: isUser ? '8px 8px 8px 0' : '8px 8px 0 8px',
                      padding: '10px 14px',
                      fontSize: '0.85rem',
                      lineHeight: '1.45',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      borderLeft: isBot ? '3px solid #3b82f6' : isAgent ? '3px solid #10b981' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '0.675rem', fontWeight: 700 }}>
                      {isUser && <span style={{ color: '#94a3b8' }}>CLIENTE</span>}
                      {isBot && <span style={{ color: '#60a5fa' }}>🤖 BOT AUTOMÁTICO</span>}
                      {isAgent && <span style={{ color: '#34d399' }}>👤 OPERADOR HUMANO</span>}
                    </div>

                    <div>{m.content?.text || JSON.stringify(m.content)}</div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '4px',
                        marginTop: '6px',
                        fontSize: '0.675rem',
                        color: '#8696a0',
                      }}
                    >
                      <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {!isUser && <CheckCheck size={14} color="#53bdeb" />}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Formulario de Respuesta del Agente Humano */}
          <form
            onSubmit={handleSendReply}
            style={{
              padding: '14px 20px',
              background: '#111726',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <input
              type="text"
              placeholder={
                isWindowActive
                  ? 'Escribe un mensaje de respuesta para el cliente en WhatsApp...'
                  : '⚠️ Ventana de 24h expirada. Solo se pueden enviar plantillas aprobadas.'
              }
              disabled={!isWindowActive || isSending}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              style={{
                flex: 1,
                background: '#151d2f',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
                padding: '10px 14px',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />

            <button
              type="submit"
              disabled={!isWindowActive || isSending || !replyText.trim()}
              style={{
                background: isWindowActive && replyText.trim() ? '#25d366' : '#1e293b',
                color: isWindowActive && replyText.trim() ? '#000' : '#64748b',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: isWindowActive && replyText.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s',
              }}
            >
              <Send size={15} />
              <span>{isSending ? 'Enviando...' : 'Responder'}</span>
            </button>
          </form>
        </main>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '0.9rem' }}>
          Selecciona una conversación de la izquierda para ver el historial y responder.
        </div>
      )}
    </div>
  );
};
