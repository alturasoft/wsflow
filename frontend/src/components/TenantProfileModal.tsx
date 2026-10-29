import React, { useState, useEffect } from 'react';
import {
  Building2,
  Smartphone,
  Globe,
  Clock,
  Save,
  X,
  Sparkles,
  AlertCircle,
  Activity,
  Code2,
  PauseCircle,
  Hash,
} from 'lucide-react';
import { Tenant } from '../types/flow';
import { authService } from '../services/auth';
import { API_BASE } from '../config';

interface TenantProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant | null;
  onTenantUpdated: (updatedTenant: Tenant) => void;
}

export const TenantProfileModal: React.FC<TenantProfileModalProps> = ({
  isOpen,
  onClose,
  tenant,
  onTenantUpdated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [operationalMode, setOperationalMode] = useState<'ACTIVE' | 'DEVELOPMENT' | 'INACTIVE'>(
    'DEVELOPMENT',
  );
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [timezone, setTimezone] = useState('America/La_Paz');
  const [language, setLanguage] = useState('es');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (tenant) {
      setName(tenant.name || '');
      const settings = tenant.settings || {};
      setDescription(settings.description || '');
      setOperationalMode(settings.operationalMode || (tenant.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'));
      setTimezone(settings.timezone || 'America/La_Paz');
      setLanguage(settings.language || 'es');

      const primaryAccount = tenant.whatsappAccounts?.[0];
      setDisplayPhoneNumber(primaryAccount?.displayPhoneNumber || '');
      setPhoneNumberId(primaryAccount?.phoneNumberId || '');
      setWabaId(primaryAccount?.wabaId || '');
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [tenant, isOpen]);

  if (!isOpen || !tenant) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await authService.authFetch(`${API_BASE}/tenants/${tenant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          operationalMode,
          settings: {
            description: description.trim(),
            timezone,
            language,
          },
          displayPhoneNumber: displayPhoneNumber.trim() || undefined,
          phoneNumberId: phoneNumberId.trim() || undefined,
          wabaId: wabaId.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al actualizar el perfil del inquilino');
      }

      const updated = await res.json();
      onTenantUpdated(updated);
      setSuccessMessage('¡Perfil de la empresa actualizado correctamente!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 10, 20, 0.8)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: "'Inter', sans-serif",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          background: '#0e1626',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '18px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
              }}
            >
              <Building2 size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                  Perfil de la Empresa
                </h3>
                <span
                  style={{
                    fontSize: '0.675rem',
                    fontFamily: 'monospace',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: '#1e293b',
                    color: '#94a3b8',
                  }}
                >
                  {tenant.slug}
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                Administra los datos corporativos, canal de WhatsApp y estado operativo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulario scrolleable */}
        <form onSubmit={handleSave} style={{ padding: '22px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {errorMessage && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '0.775rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={15} color="#ef4444" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#6ee7b7',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '0.775rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Sparkles size={15} color="#10b981" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. Estado Operativo */}
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#cbd5e1', marginBottom: '8px' }}>
              Estado Operativo del Inquilino:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {/* Activo */}
              <button
                type="button"
                onClick={() => setOperationalMode('ACTIVE')}
                style={{
                  background: operationalMode === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${operationalMode === 'ACTIVE' ? '#10b981' : 'rgba(255, 255, 255, 0.08)'}`,
                  borderRadius: '10px',
                  padding: '10px 8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Activity size={14} color={operationalMode === 'ACTIVE' ? '#10b981' : '#64748b'} />
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: operationalMode === 'ACTIVE' ? '#10b981' : '#475569' }} />
                </div>
                <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#f8fafc' }}>Activo</span>
                <span style={{ fontSize: '0.675rem', color: '#94a3b8' }}>En vivo en WhatsApp</span>
              </button>

              {/* En Desarrollo */}
              <button
                type="button"
                onClick={() => setOperationalMode('DEVELOPMENT')}
                style={{
                  background: operationalMode === 'DEVELOPMENT' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${operationalMode === 'DEVELOPMENT' ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)'}`,
                  borderRadius: '10px',
                  padding: '10px 8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Code2 size={14} color={operationalMode === 'DEVELOPMENT' ? '#f59e0b' : '#64748b'} />
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: operationalMode === 'DEVELOPMENT' ? '#f59e0b' : '#475569' }} />
                </div>
                <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#f8fafc' }}>En Desarrollo</span>
                <span style={{ fontSize: '0.675rem', color: '#94a3b8' }}>Pruebas / Sandbox</span>
              </button>

              {/* Inactivo */}
              <button
                type="button"
                onClick={() => setOperationalMode('INACTIVE')}
                style={{
                  background: operationalMode === 'INACTIVE' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${operationalMode === 'INACTIVE' ? '#ef4444' : 'rgba(255, 255, 255, 0.08)'}`,
                  borderRadius: '10px',
                  padding: '10px 8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <PauseCircle size={14} color={operationalMode === 'INACTIVE' ? '#ef4444' : '#64748b'} />
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: operationalMode === 'INACTIVE' ? '#ef4444' : '#475569' }} />
                </div>
                <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#f8fafc' }}>Inactivo</span>
                <span style={{ fontSize: '0.675rem', color: '#94a3b8' }}>Pausado</span>
              </button>
            </div>
          </div>

          {/* 2. Datos Generales */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
              Nombre Comercial
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                background: '#1e293b',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                color: '#f8fafc',
                padding: '9px 12px',
                fontSize: '0.8rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
              Descripción de la Empresa
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Aseguradora con atención 24/7..."
              style={{
                width: '100%',
                background: '#1e293b',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                color: '#f8fafc',
                padding: '8px 12px',
                fontSize: '0.8rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* 3. Canal de WhatsApp */}
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#cbd5e1', marginBottom: '6px' }}>
              Canal de WhatsApp (Línea Oficial):
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.725rem', color: '#94a3b8', marginBottom: '4px' }}>
                  Número Visible
                </label>
                <input
                  type="text"
                  placeholder="+591 70000000"
                  value={displayPhoneNumber}
                  onChange={(e) => setDisplayPhoneNumber(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    padding: '8px 10px',
                    fontSize: '0.775rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.725rem', color: '#94a3b8', marginBottom: '4px' }}>
                  Phone Number ID (Meta)
                </label>
                <input
                  type="text"
                  placeholder="ID de Meta"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    padding: '8px 10px',
                    fontSize: '0.775rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'monospace',
                  }}
                />
              </div>
            </div>
          </div>

          {/* 4. Regionalización */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.725rem', color: '#94a3b8', marginBottom: '4px' }}>
                Zona Horaria
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                style={{
                  width: '100%',
                  background: '#1e293b',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  padding: '8px 10px',
                  fontSize: '0.775rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              >
                <option value="America/La_Paz">America/La_Paz (GMT-4)</option>
                <option value="America/Bogota">America/Bogota (GMT-5)</option>
                <option value="America/Lima">America/Lima (GMT-5)</option>
                <option value="America/Santiago">America/Santiago (GMT-4)</option>
                <option value="America/Buenos_Aires">America/Buenos_Aires (GMT-3)</option>
                <option value="America/Mexico_City">America/Mexico_City (GMT-6)</option>
                <option value="Europe/Madrid">Europe/Madrid (GMT+1)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.725rem', color: '#94a3b8', marginBottom: '4px' }}>
                Idioma del Asistente
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{
                  width: '100%',
                  background: '#1e293b',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  padding: '8px 10px',
                  fontSize: '0.775rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              >
                <option value="es">Español (es)</option>
                <option value="en">English (en)</option>
                <option value="pt">Português (pt)</option>
              </select>
            </div>
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                padding: '8px 14px',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                background: '#10b981',
                color: '#04170e',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 18px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: isLoading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Save size={14} />
              <span>{isLoading ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
