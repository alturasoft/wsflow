import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Calendar,
  Mail,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  ShieldCheck,
} from 'lucide-react';
import { TenantIntegration } from '../types/flow';

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId?: string;
}
import { API_BASE } from '../config';

export const IntegrationsModal: React.FC<IntegrationsModalProps> = ({
  isOpen,
  onClose,
  tenantId = 'default_tenant',
}) => {
  const [integrations, setIntegrations] = useState<TenantIntegration[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedType, setSelectedType] = useState<'GOOGLE_CALENDAR' | 'SMTP_EMAIL'>('GOOGLE_CALENDAR');

  // Form states
  const [name, setName] = useState('');
  // Google Calendar
  const [googleAuthType, setGoogleAuthType] = useState<'service_account' | 'oauth2'>('service_account');
  const [clientEmail, setClientEmail] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [calendarId, setCalendarId] = useState('primary');
  // SMTP
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [fromName, setFromName] = useState('Seguros Altura');
  const [fromEmail, setFromEmail] = useState('');

  const fetchIntegrations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/integrations?tenantId=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data);
      }
    } catch (e) {
      console.error('Error fetching integrations', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchIntegrations();
      setIsAdding(false);
      setTestResult(null);
    }
  }, [isOpen, tenantId]);

  const handleTest = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/integrations/${id}/test`, { method: 'POST' });
      const data = await res.json();
      setTestResult({ id, success: data.success, message: data.message || (data.success ? 'Conexión verificada exitosamente' : 'Fallo de conexión') });
    } catch (e: any) {
      setTestResult({ id, success: false, message: e.message || 'Error de red al probar conexión' });
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Deseas eliminar esta integración?')) return;
    try {
      await fetch(`${API_BASE}/integrations/${id}`, { method: 'DELETE' });
      fetchIntegrations();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    let config: any = {};

    if (selectedType === 'GOOGLE_CALENDAR') {
      config = {
        type: googleAuthType,
        calendarId: calendarId || 'primary',
        clientEmail: googleAuthType === 'service_account' ? clientEmail : undefined,
        privateKey: googleAuthType === 'service_account' ? privateKey : undefined,
        clientId: googleAuthType === 'oauth2' ? clientId : undefined,
        clientSecret: googleAuthType === 'oauth2' ? clientSecret : undefined,
        refreshToken: googleAuthType === 'oauth2' ? refreshToken : undefined,
      };
    } else {
      config = {
        host: smtpHost,
        port: Number(smtpPort),
        user: smtpUser,
        pass: smtpPass,
        fromName,
        fromEmail: fromEmail || smtpUser,
      };
    }

    try {
      const res = await fetch(`${API_BASE}/integrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          name: name || (selectedType === 'GOOGLE_CALENDAR' ? 'Google Calendar' : 'Servidor SMTP'),
          type: selectedType,
          config,
          isActive: true,
        }),
      });

      if (res.ok) {
        setIsAdding(false);
        setName('');
        setPrivateKey('');
        setSmtpPass('');
        fetchIntegrations();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          background: '#0d131f',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '14px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#131b2e',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderRadius: '8px' }}>
              <Sliders size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Integraciones y Conexiones
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Conecta cuentas de correo y calendarios para tus nodos No-Code
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {!isAdding ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Cuentas activas en esta organización: <b>{integrations.length}</b>
                </span>
                <button
                  onClick={() => setIsAdding(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#10b981',
                    color: '#000',
                    fontWeight: 700,
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={16} /> Conectar Nueva Cuenta
                </button>
              </div>

              {isLoading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  Cargando integraciones...
                </div>
              ) : integrations.length === 0 ? (
                <div
                  style={{
                    padding: '36px',
                    textAlign: 'center',
                    background: '#151d2f',
                    borderRadius: '10px',
                    border: '1px dashed rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <ShieldCheck size={40} style={{ color: '#64748b', margin: '0 auto 12px auto' }} />
                  <p style={{ color: '#cbd5e1', fontSize: '0.9rem', fontWeight: 600, margin: '0 0 6px 0' }}>
                    No tienes cuentas de Calendario ni SMTP conectadas
                  </p>
                  <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0 0 16px 0' }}>
                    Conecta Google Calendar o un servidor SMTP para que los nodos del flujo agenden citas y envíen correos en vivo.
                  </p>
                  <button
                    onClick={() => setIsAdding(true)}
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#34d399',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    + Configurar primera integración
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {integrations.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: '16px',
                        background: '#151d2f',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              padding: '8px',
                              borderRadius: '8px',
                              background:
                                item.type === 'GOOGLE_CALENDAR'
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : 'rgba(56, 189, 248, 0.15)',
                              color: item.type === 'GOOGLE_CALENDAR' ? '#34d399' : '#38bdf8',
                            }}
                          >
                            {item.type === 'GOOGLE_CALENDAR' ? <Calendar size={18} /> : <Mail size={18} />}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
                              {item.type === 'GOOGLE_CALENDAR'
                                ? `Google Calendar (ID: ${item.config?.calendarId || 'primary'})`
                                : `Servidor SMTP (${item.config?.host}:${item.config?.port})`}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => handleTest(item.id)}
                            disabled={testingId === item.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              color: '#cbd5e1',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                            }}
                          >
                            <RefreshCw size={12} className={testingId === item.id ? 'spin' : ''} />
                            Probar
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            style={{
                              background: 'rgba(244, 63, 94, 0.1)',
                              border: 'none',
                              color: '#f43f5e',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Resultado de prueba */}
                      {testResult && testResult.id === item.id && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.75rem',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                            color: testResult.success ? '#34d399' : '#f43f5e',
                            border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`,
                          }}
                        >
                          {testResult.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                          <span>{testResult.message}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedType('GOOGLE_CALENDAR')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: selectedType === 'GOOGLE_CALENDAR' ? 'rgba(16, 185, 129, 0.15)' : '#151d2f',
                    border: `1px solid ${selectedType === 'GOOGLE_CALENDAR' ? '#10b981' : 'rgba(255, 255, 255, 0.1)'}`,
                    color: selectedType === 'GOOGLE_CALENDAR' ? '#34d399' : '#94a3b8',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                  }}
                >
                  <Calendar size={18} /> Google Calendar
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType('SMTP_EMAIL')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: selectedType === 'SMTP_EMAIL' ? 'rgba(56, 189, 248, 0.15)' : '#151d2f',
                    border: `1px solid ${selectedType === 'SMTP_EMAIL' ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
                    color: selectedType === 'SMTP_EMAIL' ? '#38bdf8' : '#94a3b8',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                  }}
                >
                  <Mail size={18} /> Correo SMTP
                </button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                  Nombre de la Conexión
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={selectedType === 'GOOGLE_CALENDAR' ? 'Ej. Calendario Asesorías' : 'Ej. Correo Notificaciones'}
                  style={{
                    width: '100%',
                    background: '#151d2f',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#fff',
                    padding: '8px 12px',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              {selectedType === 'GOOGLE_CALENDAR' ? (
                <>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Método de Autenticación:</label>
                    <label style={{ fontSize: '0.75rem', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="radio"
                        checked={googleAuthType === 'service_account'}
                        onChange={() => setGoogleAuthType('service_account')}
                      />
                      Service Account (Recomendado)
                    </label>
                    <label style={{ fontSize: '0.75rem', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="radio"
                        checked={googleAuthType === 'oauth2'}
                        onChange={() => setGoogleAuthType('oauth2')}
                      />
                      OAuth2 (Client ID & Secret)
                    </label>
                  </div>

                  {googleAuthType === 'service_account' ? (
                    <>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                          Client Email (Cuenta de Servicio de Google Cloud)
                        </label>
                        <input
                          type="email"
                          required
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          placeholder="bot-citas@tu-proyecto.iam.gserviceaccount.com"
                          style={{
                            width: '100%',
                            background: '#151d2f',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px',
                            color: '#fff',
                            padding: '8px 12px',
                            fontSize: '0.85rem',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                          Private Key (Clave privada PEM cifrada con AES-256)
                        </label>
                        <textarea
                          rows={3}
                          required
                          value={privateKey}
                          onChange={(e) => setPrivateKey(e.target.value)}
                          placeholder="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----"
                          style={{
                            width: '100%',
                            background: '#151d2f',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px',
                            color: '#fff',
                            padding: '8px 12px',
                            fontSize: '0.75rem',
                            fontFamily: 'monospace',
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.725rem', color: '#94a3b8', marginBottom: '4px' }}>Client ID</label>
                        <input
                          type="text"
                          value={clientId}
                          onChange={(e) => setClientId(e.target.value)}
                          style={{ width: '100%', background: '#151d2f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', padding: '8px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.725rem', color: '#94a3b8', marginBottom: '4px' }}>Client Secret</label>
                        <input
                          type="password"
                          value={clientSecret}
                          onChange={(e) => setClientSecret(e.target.value)}
                          style={{ width: '100%', background: '#151d2f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', padding: '8px' }}
                        />
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '0.725rem', color: '#94a3b8', marginBottom: '4px' }}>Refresh Token</label>
                        <input
                          type="password"
                          value={refreshToken}
                          onChange={(e) => setRefreshToken(e.target.value)}
                          style={{ width: '100%', background: '#151d2f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', padding: '8px' }}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                      Calendar ID (Opcional, por defecto "primary")
                    </label>
                    <input
                      type="text"
                      value={calendarId}
                      onChange={(e) => setCalendarId(e.target.value)}
                      placeholder="primary o tu_calendario@group.calendar.google.com"
                      style={{
                        width: '100%',
                        background: '#151d2f',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        color: '#fff',
                        padding: '8px 12px',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                        Servidor Host SMTP
                      </label>
                      <input
                        type="text"
                        required
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        placeholder="smtp.gmail.com o smtp.office365.com"
                        style={{
                          width: '100%',
                          background: '#151d2f',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: '#fff',
                          padding: '8px 12px',
                          fontSize: '0.85rem',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                        Puerto
                      </label>
                      <input
                        type="number"
                        required
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(Number(e.target.value))}
                        style={{
                          width: '100%',
                          background: '#151d2f',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: '#fff',
                          padding: '8px 12px',
                          fontSize: '0.85rem',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                        Usuario / Correo SMTP
                      </label>
                      <input
                        type="text"
                        required
                        value={smtpUser}
                        onChange={(e) => setSmtpUser(e.target.value)}
                        placeholder="notificaciones@miempresa.com"
                        style={{
                          width: '100%',
                          background: '#151d2f',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: '#fff',
                          padding: '8px 12px',
                          fontSize: '0.85rem',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                        Contraseña / App Password
                      </label>
                      <input
                        type="password"
                        required
                        value={smtpPass}
                        onChange={(e) => setSmtpPass(e.target.value)}
                        placeholder="••••••••••••"
                        style={{
                          width: '100%',
                          background: '#151d2f',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: '#fff',
                          padding: '8px 12px',
                          fontSize: '0.85rem',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                        Nombre del Remitente
                      </label>
                      <input
                        type="text"
                        value={fromName}
                        onChange={(e) => setFromName(e.target.value)}
                        placeholder="Seguros Altura"
                        style={{
                          width: '100%',
                          background: '#151d2f',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: '#fff',
                          padding: '8px 12px',
                          fontSize: '0.85rem',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                        Correo Remitente (From)
                      </label>
                      <input
                        type="email"
                        value={fromEmail}
                        onChange={(e) => setFromEmail(e.target.value)}
                        placeholder="Opcional si es igual al usuario"
                        style={{
                          width: '100%',
                          background: '#151d2f',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: '#fff',
                          padding: '8px 12px',
                          fontSize: '0.85rem',
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#cbd5e1',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#10b981',
                    color: '#000',
                    fontWeight: 700,
                    border: 'none',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                  }}
                >
                  Guardar y Activar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
