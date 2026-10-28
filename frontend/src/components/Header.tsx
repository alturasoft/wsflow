import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Save,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Smartphone,
  Plus,
  ChevronDown,
  Workflow,
  X,
  Check,
  Sparkles,
  Trash2,
  Sliders,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Flow } from '../types/flow';

interface HeaderProps {
  flows: Flow[];
  activeFlow: Flow | null;
  onSelectFlow: (flowId: string) => void;
  onCreateFlow: (name: string, description?: string, triggerKeywords?: string[]) => Promise<void>;
  onDeleteFlow: (flowId: string) => Promise<void>;
  onAutoLayout: () => void;
  flowName: string;
  versionNumber: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  tenantName: string;
  phoneNumber: string;
  activeView: 'EDITOR' | 'INBOX';
  onViewChange: (view: 'EDITOR' | 'INBOX') => void;
  pendingHandoffCount?: number;
  onSaveDraft: () => void;
  onPublish: () => void;
  onValidate: () => void;
  onOpenSimulator: () => void;
  onOpenIntegrations?: () => void;
  isSaving: boolean;
  isPublishing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  flows,
  activeFlow,
  onSelectFlow,
  onCreateFlow,
  onDeleteFlow,
  onAutoLayout,
  flowName,
  versionNumber,
  status,
  tenantName,
  phoneNumber,
  activeView,
  onViewChange,
  pendingHandoffCount = 0,
  onSaveDraft,
  onPublish,
  onValidate,
  onOpenSimulator,
  onOpenIntegrations,
  isSaving,
  isPublishing,
}) => {
  const [isFlowDropdownOpen, setIsFlowDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowDescription, setNewFlowDescription] = useState('');
  const [newFlowKeywords, setNewFlowKeywords] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFlowDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const triggerPublishWithConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.2 },
    });
    onPublish();
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlowName.trim()) {
      setFormError('Por favor ingresa un nombre para el flujo.');
      return;
    }

    setFormError(null);
    setIsCreating(true);

    try {
      const keywords = newFlowKeywords
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter((k) => k.length > 0);

      await onCreateFlow(newFlowName.trim(), newFlowDescription.trim() || undefined, keywords);
      setIsModalOpen(false);
      setNewFlowName('');
      setNewFlowDescription('');
      setNewFlowKeywords('');
    } catch (err: any) {
      if (err?.message === 'Failed to fetch' || err?.message?.includes('fetch')) {
        setFormError('No se pudo conectar con el servidor Backend (http://localhost:3000). Verifica que el backend esté en ejecución.');
      } else {
        setFormError(err.message || 'Error al crear el flujo.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <header
        id="main-header"
        style={{
          height: '62px',
          background: '#0d131f',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          zIndex: 30,
          userSelect: 'none',
          gap: '12px',
        }}
      >
        {/* Izquierda: Marca y Pestañas de Vista */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(37, 211, 102, 0.4)',
              }}
            >
              <span style={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>W</span>
            </div>
            <span
              className="brand-font"
              style={{
                fontWeight: 700,
                fontSize: '1.05rem',
                color: '#f8fafc',
                letterSpacing: '0.02em',
              }}
            >
              WSFlow <span style={{ color: '#25d366', fontSize: '0.75rem', fontWeight: 600 }}>STUDIO</span>
            </span>
          </div>

          <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />

          {/* Pestañas de Navegación */}
          <div
            style={{
              display: 'flex',
              gap: '4px',
              background: 'rgba(255,255,255,0.04)',
              padding: '3px',
              borderRadius: '8px',
            }}
          >
            <button
              onClick={() => onViewChange('EDITOR')}
              style={{
                background: activeView === 'EDITOR' ? '#1e293b' : 'transparent',
                color: activeView === 'EDITOR' ? '#f8fafc' : '#94a3b8',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              Editor de Flujos
            </button>
            <button
              onClick={() => onViewChange('INBOX')}
              style={{
                background: activeView === 'INBOX' ? '#1e293b' : 'transparent',
                color: activeView === 'INBOX' ? '#25d366' : '#94a3b8',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s',
              }}
            >
              <span>Bandeja Humana</span>
              {pendingHandoffCount > 0 && (
                <span
                  style={{
                    background: '#a855f7',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '1px 6px',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                  }}
                >
                  {pendingHandoffCount}
                </span>
              )}
            </button>
            <button
              onClick={onOpenIntegrations}
              style={{
                background: 'transparent',
                color: '#94a3b8',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#f8fafc';
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#94a3b8';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Sliders size={14} color="#34d399" />
              <span>Integraciones</span>
            </button>
          </div>

          <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />

          {/* Selector de Flujo y Botón + Nuevo Flujo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} ref={dropdownRef}>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setIsFlowDropdownOpen(!isFlowDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  color: '#f8fafc',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  maxWidth: '260px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
              >
                <Workflow size={15} color="#10b981" />
                <span
                  style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '170px',
                  }}
                >
                  {activeFlow?.name || 'Seleccionar Flujo'}
                </span>
                <span
                  style={{
                    background: status === 'PUBLISHED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: status === 'PUBLISHED' ? '#34d399' : '#fbbf24',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.675rem',
                    fontWeight: 700,
                  }}
                >
                  v{versionNumber}
                </span>
                <ChevronDown size={14} color="#94a3b8" />
              </button>

              {/* Menú Desplegable de Flujos */}
              {isFlowDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    width: '280px',
                    background: '#131c2e',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)',
                    padding: '6px',
                    zIndex: 50,
                  }}
                >
                  <div
                    style={{
                      padding: '6px 10px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Tus Flujos ({flows.length})
                  </div>

                  <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                    {flows.map((flow) => {
                      const isCurrent = flow.id === activeFlow?.id;
                      return (
                        <div
                          key={flow.id}
                          onClick={() => {
                            onSelectFlow(flow.id);
                            setIsFlowDropdownOpen(false);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            background: isCurrent ? 'rgba(37, 211, 102, 0.12)' : 'transparent',
                            color: isCurrent ? '#25d366' : '#cbd5e1',
                            fontSize: '0.8rem',
                            fontWeight: isCurrent ? 600 : 500,
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            if (!isCurrent) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isCurrent) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {flow.name}
                            </span>
                            {flow.description && (
                              <span style={{ fontSize: '0.68rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {flow.description}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isCurrent && <Check size={14} color="#25d366" style={{ flexShrink: 0 }} />}
                            {flows.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`¿Estás seguro de que deseas eliminar el flujo "${flow.name}"?`)) {
                                    onDeleteFlow(flow.id);
                                  }
                                }}
                                title="Eliminar flujo"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#64748b',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  transition: 'color 0.15s, background 0.15s',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = '#f43f5e';
                                  e.currentTarget.style.background = 'rgba(244, 63, 94, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = '#64748b';
                                  e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Botón "+ Nuevo Flujo" */}
            <button
              onClick={() => setIsModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.15) 0%, rgba(16, 185, 129, 0.15) 100%)',
                color: '#25d366',
                border: '1px solid rgba(37, 211, 102, 0.35)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(37, 211, 102, 0.25) 0%, rgba(16, 185, 129, 0.25) 100%)';
                e.currentTarget.style.borderColor = 'rgba(37, 211, 102, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(37, 211, 102, 0.15) 0%, rgba(16, 185, 129, 0.15) 100%)';
                e.currentTarget.style.borderColor = 'rgba(37, 211, 102, 0.35)';
              }}
            >
              <Plus size={14} />
              <span>Nuevo Flujo</span>
            </button>
          </div>
        </div>

        {/* Centro: Tenant Multi-Tenant Selector */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '20px',
            padding: '4px 14px',
            fontSize: '0.775rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#cbd5e1' }}>
            <Building2 size={13} color="#60a5fa" />
            <span style={{ fontWeight: 600 }}>{tenantName}</span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#94a3b8' }}>
            <Smartphone size={13} color="#25d366" />
            <span>{phoneNumber}</span>
          </div>
        </div>

        {/* Derecha: Botones de Acción */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Organizar Automáticamente */}
          <button
            onClick={onAutoLayout}
            title="Organizar nodos automáticamente con algoritmo jerárquico lógico"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#151d2f',
              color: '#cbd5e1',
              border: '1px solid rgba(192, 132, 252, 0.3)',
              borderRadius: '6px',
              padding: '7px 12px',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1a243b';
              e.currentTarget.style.borderColor = 'rgba(192, 132, 252, 0.7)';
              e.currentTarget.style.color = '#c084fc';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#151d2f';
              e.currentTarget.style.borderColor = 'rgba(192, 132, 252, 0.3)';
              e.currentTarget.style.color = '#cbd5e1';
            }}
          >
            <Sparkles size={15} color="#c084fc" />
            <span>Auto-Organizar</span>
          </button>

          {/* Validar Flujo */}
          <button
            onClick={onValidate}
            title="Verificar integridad de conexiones"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#151d2f',
              color: '#cbd5e1',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              padding: '7px 12px',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#1a243b')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#151d2f')}
          >
            <CheckCircle2 size={15} color="#06b6d4" />
            <span>Validar</span>
          </button>

          {/* Simular Chat */}
          <button
            onClick={onOpenSimulator}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(37, 211, 102, 0.12)',
              color: '#25d366',
              border: '1px solid rgba(37, 211, 102, 0.3)',
              borderRadius: '6px',
              padding: '7px 14px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(37, 211, 102, 0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(37, 211, 102, 0.12)')}
          >
            <Play size={14} fill="#25d366" />
            <span>Probar Flujo</span>
          </button>

          {/* Guardar Borrador */}
          <button
            onClick={onSaveDraft}
            disabled={isSaving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              padding: '7px 12px',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: isSaving ? 'wait' : 'pointer',
            }}
          >
            <Save size={14} />
            <span>{isSaving ? 'Guardando...' : 'Borrador'}</span>
          </button>

          {/* Publicar a Producción */}
          <button
            onClick={triggerPublishWithConfetti}
            disabled={isPublishing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '7px 16px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: isPublishing ? 'wait' : 'pointer',
              boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)',
            }}
          >
            <span>{isPublishing ? 'Publicando...' : 'Publicar Flujo'}</span>
          </button>
        </div>
      </header>

      {/* Modal: Crear Nuevo Flujo */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 10, 20, 0.8)',
            backdropFilter: 'blur(5px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => !isCreating && setIsModalOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              background: '#111827',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              padding: '24px',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(37, 211, 102, 0.15)',
                    border: '1px solid rgba(37, 211, 102, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Workflow size={20} color="#25d366" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                    Crear Nuevo Flujo
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.775rem', color: '#94a3b8' }}>
                    Diseña un nuevo recorrido automatizado para WhatsApp
                  </p>
                </div>
              </div>
              <button
                onClick={() => !isCreating && setIsModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleCreateSubmit}>
              {formError && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    marginBottom: '14px',
                  }}
                >
                  {formError}
                </div>
              )}

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Nombre del Flujo <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Cotización de Seguros, Atención Ventas..."
                  value={newFlowName}
                  onChange={(e) => setNewFlowName(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Descripción (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe brevemente el objetivo de este flujo..."
                  value={newFlowDescription}
                  onChange={(e) => setNewFlowDescription(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                  Palabras Clave Disparadoras (WhatsApp)
                </label>
                <span style={{ display: 'block', fontSize: '0.725rem', color: '#64748b', marginBottom: '6px' }}>
                  Separadas por comas. Si el cliente escribe alguna de estas palabras, se activará este flujo.
                </span>
                <input
                  type="text"
                  placeholder="Ej. cotizar, seguro, precio, info"
                  value={newFlowKeywords}
                  onChange={(e) => setNewFlowKeywords(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Botones de Acción */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    background: '#1e293b',
                    color: '#94a3b8',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 18px',
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    cursor: isCreating ? 'wait' : 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)',
                  }}
                >
                  <Plus size={15} />
                  <span>{isCreating ? 'Creando...' : 'Crear Flujo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
