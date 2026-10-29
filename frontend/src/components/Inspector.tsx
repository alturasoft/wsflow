import React, { useState } from 'react';
import { Trash2, Plus, X, Zap, Tag, MessageSquare, Play, Check, Star } from 'lucide-react';
import { Node } from '@xyflow/react';
import { NodeData } from '../types/flow';

interface InspectorProps {
  selectedNode: Node | null;
  onUpdateNodeData: (nodeId: string, newData: Partial<NodeData>) => void;
  onDeleteNode: (nodeId: string) => void;
  onClose: () => void;
  isDefaultFlow?: boolean;
  onSetDefaultFlow?: () => Promise<void>;
  flowName?: string;
}

export const Inspector: React.FC<InspectorProps> = ({
  selectedNode,
  onUpdateNodeData,
  onDeleteNode,
  onClose,
  isDefaultFlow = false,
  onSetDefaultFlow,
  flowName,
}) => {
  if (!selectedNode) return null;

  const data = selectedNode.data as unknown as NodeData;
  const nodeType = selectedNode.type;

  const [newKeyword, setNewKeyword] = useState('');

  const handleChange = (field: keyof NodeData, value: any) => {
    onUpdateNodeData(selectedNode.id, { [field]: value });
  };

  const handleAddKeyword = (kwToAdd?: string) => {
    const kw = (kwToAdd !== undefined ? kwToAdd : newKeyword).trim().toLowerCase();
    if (!kw) return;
    const current = Array.isArray(data.triggerKeywords) ? [...data.triggerKeywords] : [];
    if (!current.includes(kw)) {
      handleChange('triggerKeywords', [...current, kw]);
      if (data.triggerType !== 'keywords') {
        handleChange('triggerType', 'keywords');
      }
    }
    setNewKeyword('');
  };

  const handleRemoveKeyword = (index: number) => {
    const current = Array.isArray(data.triggerKeywords) ? [...data.triggerKeywords] : [];
    const updated = current.filter((_, i) => i !== index);
    handleChange('triggerKeywords', updated);
  };

  const handleButtonChange = (index: number, newTitle: string) => {
    const updatedButtons = [...(data.buttons || [])];
    updatedButtons[index] = {
      ...updatedButtons[index],
      title: newTitle,
    };
    handleChange('buttons', updatedButtons);
  };

  const handleAddButton = () => {
    const currentButtons = data.buttons || [];
    if (currentButtons.length >= 3) return;
    const nextIdx = currentButtons.length + 1;
    const newButton = {
      id: `btn_${Date.now()}`,
      title: `Opción ${nextIdx}`,
    };
    handleChange('buttons', [...currentButtons, newButton]);
  };

  const handleRemoveButton = (index: number) => {
    const updatedButtons = (data.buttons || []).filter((_, i) => i !== index);
    handleChange('buttons', updatedButtons);
  };

  const getListRows = () => {
    return (data.sections && data.sections[0]?.rows) || [];
  };

  const handleListRowChange = (index: number, field: 'title' | 'description', value: string) => {
    const sections = [...(data.sections || [{ title: 'Opciones', rows: [] }])];
    const rows = [...(sections[0].rows || [])];
    rows[index] = {
      ...rows[index],
      [field]: value,
    };
    sections[0] = { ...sections[0], rows };
    handleChange('sections', sections);
  };

  const handleAddListRow = () => {
    const sections = [...(data.sections || [{ title: 'Opciones', rows: [] }])];
    const rows = [...(sections[0].rows || [])];
    if (rows.length >= 10) return;
    const nextIdx = rows.length + 1;
    const newRow = {
      id: `opt_${Date.now()}_${nextIdx}`,
      title: `Opción ${nextIdx}`,
      description: `Detalle de la opción ${nextIdx}`,
    };
    sections[0] = { ...sections[0], rows: [...rows, newRow] };
    handleChange('sections', sections);
  };

  const handleRemoveListRow = (index: number) => {
    const sections = [...(data.sections || [{ title: 'Opciones', rows: [] }])];
    const rows = (sections[0].rows || []).filter((_, i) => i !== index);
    sections[0] = { ...sections[0], rows };
    handleChange('sections', sections);
  };

  return (
    <aside
      id="node-inspector"
      style={{
        width: '320px',
        background: '#0d131f',
        borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        zIndex: 20,
      }}
    >
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
            Inspector de Nodo
          </span>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc', marginTop: '2px' }}>
            {nodeType?.toUpperCase()}
          </h3>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
        >
          <X size={18} />
        </button>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1 }}>
        {/* NODO DE INICIO / DISPARADOR WHATSAPP */}
        {nodeType === 'start' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.15) 0%, rgba(18, 140, 126, 0.08) 100%)',
                border: '1px solid rgba(37, 211, 102, 0.3)',
                borderRadius: '8px',
                padding: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Zap size={16} color="#25d366" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                  Disparador de WhatsApp
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#cbd5e1', margin: 0, lineHeight: 1.4 }}>
                Configura cómo se activa este flujo en el chat de WhatsApp cuando un usuario te contacte.
              </p>
            </div>

            {/* Banner y Control de Flujo de Arranque Principal */}
            <div
              style={{
                background: isDefaultFlow ? 'rgba(234, 179, 8, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${isDefaultFlow ? 'rgba(234, 179, 8, 0.35)' : 'rgba(255, 255, 255, 0.08)'}`,
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Star size={15} color={isDefaultFlow ? '#eab308' : '#94a3b8'} fill={isDefaultFlow ? '#eab308' : 'none'} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isDefaultFlow ? '#facc15' : '#cbd5e1' }}>
                    {isDefaultFlow ? 'Flujo de Arranque (Default)' : 'Flujo Secundario'}
                  </span>
                </div>
                {isDefaultFlow && (
                  <span
                    style={{
                      background: 'rgba(234, 179, 8, 0.25)',
                      color: '#facc15',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Activo
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0, lineHeight: 1.35 }}>
                {isDefaultFlow
                  ? '⭐ Este es el flujo asignado por defecto a tu número de WhatsApp. Se activará cuando un cliente salude ("Hola") o cuando su mensaje no contenga palabras clave de otros flujos.'
                  : 'Este flujo no es el principal. Solo se activará si el cliente escribe alguna de sus palabras clave específicas.'}
              </p>
              {!isDefaultFlow && onSetDefaultFlow && (
                <button
                  type="button"
                  onClick={onSetDefaultFlow}
                  style={{
                    marginTop: '2px',
                    background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '7px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 10px rgba(234, 179, 8, 0.25)',
                  }}
                >
                  <Star size={13} fill="#000" /> Establecer como Flujo de Arranque Principal
                </button>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
                Modo de Activación
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleChange('triggerType', 'keywords')}
                  style={{
                    background: (data.triggerType === 'keywords' || (data.triggerKeywords && data.triggerKeywords.length > 0)) ? 'rgba(37, 211, 102, 0.2)' : '#151d2f',
                    border: `1px solid ${(data.triggerType === 'keywords' || (data.triggerKeywords && data.triggerKeywords.length > 0)) ? '#25d366' : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: '6px',
                    padding: '8px',
                    color: (data.triggerType === 'keywords' || (data.triggerKeywords && data.triggerKeywords.length > 0)) ? '#4ade80' : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Tag size={16} />
                  <span>Palabras Clave</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleChange('triggerType', 'all');
                    handleChange('triggerKeywords', []);
                  }}
                  style={{
                    background: (data.triggerType === 'all' && (!data.triggerKeywords || data.triggerKeywords.length === 0)) ? 'rgba(59, 130, 246, 0.2)' : '#151d2f',
                    border: `1px solid ${(data.triggerType === 'all' && (!data.triggerKeywords || data.triggerKeywords.length === 0)) ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: '6px',
                    padding: '8px',
                    color: (data.triggerType === 'all' && (!data.triggerKeywords || data.triggerKeywords.length === 0)) ? '#60a5fa' : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <MessageSquare size={16} />
                  <span>Flujo General</span>
                </button>
              </div>
            </div>

            {/* Configuración de Palabras Clave */}
            <div style={{ marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>
                  Palabras Clave (Trigger Keywords)
                </label>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  {(data.triggerKeywords || []).length} activas
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddKeyword();
                    }
                  }}
                  placeholder="Ej. cotizar, precio, cotizador..."
                  style={{
                    flex: 1,
                    background: '#151d2f',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#fff',
                    padding: '8px 10px',
                    fontSize: '0.85rem',
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleAddKeyword()}
                  style={{
                    background: '#25d366',
                    color: '#000',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0 12px',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Plus size={14} /> Agregar
                </button>
              </div>

              {/* Chips de Palabras Clave */}
              <div
                style={{
                  minHeight: '48px',
                  background: '#151d2f',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '8px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  alignItems: 'center',
                }}
              >
                {(data.triggerKeywords || []).length === 0 ? (
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                    No hay palabras clave registradas. Agrega una arriba.
                  </span>
                ) : (
                  (data.triggerKeywords || []).map((kw, idx) => (
                    <span
                      key={idx}
                      style={{
                        background: 'rgba(37, 211, 102, 0.15)',
                        border: '1px solid rgba(37, 211, 102, 0.35)',
                        color: '#4ade80',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>"{kw}"</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(idx)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#f87171',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Sugerencias Rápidas */}
              <div style={{ marginTop: '10px' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                  Sugerencias rápidas para este flujo:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {['cotizar', 'precio', 'cotizacion', 'planes', 'costo'].map((sug) => {
                    const exists = (data.triggerKeywords || []).includes(sug);
                    if (exists) return null;
                    return (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => handleAddKeyword(sug)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#94a3b8',
                          fontSize: '0.7rem',
                          borderRadius: '4px',
                          padding: '3px 7px',
                          cursor: 'pointer',
                        }}
                      >
                        + {sug}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  marginTop: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  fontSize: '0.72rem',
                  color: '#94a3b8',
                  lineHeight: 1.4,
                }}
              >
                💡 <strong>¿Cómo funciona?</strong> Cuando un cliente envíe en WhatsApp un mensaje que contenga alguna de estas palabras clave (ej: <em>"Hola, quiero cotizar precios"</em>), el bot activará automáticamente este flujo.
              </div>
            </div>
          </div>
        )}

        {/* NODO MENSAJE */}
        {nodeType === 'message' && (
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
              Texto del Mensaje (Soporta variables {'{{variable}}'})
            </label>
            <textarea
              rows={5}
              value={data.text || ''}
              onChange={(e) => handleChange('text', e.target.value)}
              placeholder="Ej. ¡Hola {{nombre_cliente}}! Bienvenido a Seguros Altura."
              style={{
                width: '100%',
                background: '#151d2f',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#fff',
                padding: '10px',
                fontSize: '0.85rem',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>
        )}

        {/* NODO BOTONES */}
        {nodeType === 'buttons' && (
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
              Pregunta o Encabezado
            </label>
            <textarea
              rows={3}
              value={data.text || ''}
              onChange={(e) => handleChange('text', e.target.value)}
              placeholder="Ej. ¿Qué trámite deseas realizar?"
              style={{
                width: '100%',
                background: '#151d2f',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#fff',
                padding: '8px',
                fontSize: '0.85rem',
                marginBottom: '14px',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>
                Botones de Respuesta (Máx. 3 de Meta)
              </label>
              {(data.buttons?.length || 0) < 3 && (
                <button
                  onClick={handleAddButton}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#34d399',
                    border: 'none',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  <Plus size={12} /> Agregar
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(data.buttons || []).map((btn, idx) => (
                <div key={btn.id || idx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="text"
                    maxLength={20}
                    value={btn.title}
                    onChange={(e) => handleButtonChange(idx, e.target.value)}
                    style={{
                      flex: 1,
                      background: '#151d2f',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      color: '#fff',
                      padding: '8px',
                      fontSize: '0.85rem',
                    }}
                  />
                  <button
                    onClick={() => handleRemoveButton(idx)}
                    style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '4px' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NODO LISTA INTERACTIVA (HASTA 10 OPCIONES) */}
        {nodeType === 'list' && (
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
              Texto Principal del Mensaje
            </label>
            <textarea
              rows={3}
              value={data.text || ''}
              onChange={(e) => handleChange('text', e.target.value)}
              placeholder="Ej. Selecciona una de las siguientes opciones:"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: '#151d2f',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#fff',
                padding: '8px',
                fontSize: '0.85rem',
                marginBottom: '12px',
              }}
            />

            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
              Texto del Botón Desplegable (máx. 20 car.)
            </label>
            <input
              type="text"
              maxLength={20}
              value={data.buttonLabel || 'Ver opciones'}
              onChange={(e) => handleChange('buttonLabel', e.target.value)}
              placeholder="Ej. Ver opciones, Menú principal"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: '#151d2f',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#fff',
                padding: '8px',
                fontSize: '0.85rem',
                marginBottom: '14px',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>
                Opciones del Menú ({getListRows().length}/10)
              </label>
              {getListRows().length < 10 && (
                <button
                  onClick={handleAddListRow}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'rgba(14, 165, 233, 0.2)',
                    color: '#38bdf8',
                    border: 'none',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  <Plus size={12} /> Agregar Opción
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {getListRows().map((row, idx) => (
                <div
                  key={row.id || idx}
                  style={{
                    background: '#151d2f',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#0ea5e9', fontWeight: 700 }}>
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      maxLength={24}
                      value={row.title}
                      placeholder="Título (máx. 24 car.)"
                      onChange={(e) => handleListRowChange(idx, 'title', e.target.value)}
                      style={{
                        flex: 1,
                        background: '#0d131f',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        color: '#fff',
                        padding: '6px 8px',
                        fontSize: '0.825rem',
                      }}
                    />
                    <button
                      onClick={() => handleRemoveListRow(idx)}
                      style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '2px' }}
                      title="Eliminar opción"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={72}
                    value={row.description || ''}
                    placeholder="Descripción secundaria (opcional, máx. 72 car.)"
                    onChange={(e) => handleListRowChange(idx, 'description', e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: '#0d131f',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '6px',
                      color: '#94a3b8',
                      padding: '5px 8px',
                      fontSize: '0.75rem',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NODO CAPTURA */}
        {nodeType === 'capture' && (
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
              Pregunta para solicitar el dato
            </label>
            <textarea
              rows={3}
              value={data.prompt || ''}
              onChange={(e) => handleChange('prompt', e.target.value)}
              placeholder="Ej. Por favor ingresa tu carnet de identidad:"
              style={{
                width: '100%',
                background: '#151d2f',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#fff',
                padding: '8px',
                fontSize: '0.85rem',
                marginBottom: '12px',
              }}
            />

            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
              Nombre de Variable en Sesión
            </label>
            <input
              type="text"
              value={data.variableName || ''}
              onChange={(e) => handleChange('variableName', e.target.value)}
              placeholder="Ej. numero_ci, correo, saldo"
              style={{
                width: '100%',
                background: '#151d2f',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#60a5fa',
                fontFamily: 'monospace',
                padding: '8px',
                fontSize: '0.85rem',
                marginBottom: '12px',
              }}
            />

            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
              Tipo de Validación
            </label>
            <select
              value={data.validationType || 'text'}
              onChange={(e) => handleChange('validationType', e.target.value)}
              style={{
                width: '100%',
                background: '#151d2f',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#fff',
                padding: '8px',
                fontSize: '0.85rem',
              }}
            >
              <option value="text">Cualquier Texto</option>
              <option value="number">Solo Números</option>
              <option value="email">Correo Electrónico</option>
              <option value="phone">Número de Teléfono</option>
            </select>
          </div>
        )}

        {/* NODO CONDICIÓN */}
        {nodeType === 'condition' && (
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
              Variable a Evaluar
            </label>
            <input
              type="text"
              value={data.variableName || ''}
              onChange={(e) => handleChange('variableName', e.target.value)}
              placeholder="Ej. edad, tipo_seguro"
              style={{
                width: '100%',
                background: '#151d2f',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#60a5fa',
                padding: '8px',
                fontSize: '0.85rem',
                marginBottom: '12px',
              }}
            />

            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
              Operador Lógico
            </label>
            <select
              value={data.operator || '=='}
              onChange={(e) => handleChange('operator', e.target.value)}
              style={{
                width: '100%',
                background: '#151d2f',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#facc15',
                padding: '8px',
                fontSize: '0.85rem',
                marginBottom: '12px',
              }}
            >
              <option value="==">Es igual a (==)</option>
              <option value="!=">No es igual a (!=)</option>
              <option value=">">Mayor que (&gt;)</option>
              <option value="<">Menor que (&lt;)</option>
              <option value="contains">Contiene texto</option>
            </select>

            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
              Valor de Comparación
            </label>
            <input
              type="text"
              value={data.targetValue || ''}
              onChange={(e) => handleChange('targetValue', e.target.value)}
              placeholder="Ej. 18, siniestro, VIP"
              style={{
                width: '100%',
                background: '#151d2f',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#fff',
                padding: '8px',
                fontSize: '0.85rem',
              }}
            />
          </div>
        )}

        {/* NODO API CALL */}
        {nodeType === 'api_call' && (
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
              Método HTTP
            </label>
            <select
              value={data.method || 'GET'}
              onChange={(e) => handleChange('method', e.target.value)}
              style={{
                width: '100%',
                background: '#151d2f',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#fff',
                padding: '8px',
                fontSize: '0.85rem',
                marginBottom: '12px',
              }}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
            </select>

            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
              URL del Endpoint (Admite {'{{variables}}'})
            </label>
            <input
              type="text"
              value={data.url || ''}
              onChange={(e) => handleChange('url', e.target.value)}
              placeholder="https://api.aseguradora.com/polizas/{{ci}}"
              style={{
                width: '100%',
                background: '#151d2f',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#fff',
                padding: '8px',
                fontSize: '0.85rem',
              }}
            />
          </div>
        )}

        {/* NODO AGENDAR CITA */}
        {nodeType === 'appointment' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '8px 10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>
                📅 Google Calendar & Meet
              </span>
            </div>

            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
              Título o Asunto del Evento
            </label>
            <input
              type="text"
              value={data.summary || ''}
              onChange={(e) => handleChange('summary', e.target.value)}
              placeholder="Cita con {{nombre}} - Asesoría"
              style={{
                width: '100%',
                background: '#151d2f',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#fff',
                padding: '8px',
                fontSize: '0.85rem',
                marginBottom: '10px',
              }}
            />

            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
              Correo del Cliente (Invitado)
            </label>
            <input
              type="text"
              value={data.attendeeEmail || ''}
              onChange={(e) => handleChange('attendeeEmail', e.target.value)}
              placeholder="{{email}} o cliente@correo.com"
              style={{
                width: '100%',
                background: '#151d2f',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#38bdf8',
                padding: '8px',
                fontSize: '0.85rem',
                marginBottom: '10px',
              }}
            />

            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
              Fecha y Hora de la Cita (ISO o captura)
            </label>
            <input
              type="text"
              value={data.startTime || ''}
              onChange={(e) => handleChange('startTime', e.target.value)}
              placeholder="{{fecha_cita}} o 2026-10-25 15:00"
              style={{
                width: '100%',
                background: '#151d2f',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#fbbf24',
                padding: '8px',
                fontSize: '0.85rem',
                marginBottom: '10px',
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.725rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                  Duración
                </label>
                <select
                  value={data.durationMinutes || 30}
                  onChange={(e) => handleChange('durationMinutes', Number(e.target.value))}
                  style={{
                    width: '100%',
                    background: '#151d2f',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#fff',
                    padding: '8px',
                    fontSize: '0.8rem',
                  }}
                >
                  <option value={15}>15 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={45}>45 minutos</option>
                  <option value={60}>60 minutos</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#cbd5e1', cursor: 'pointer', paddingBottom: '8px' }}>
                  <input
                    type="checkbox"
                    checked={data.generateMeetingLink !== false}
                    onChange={(e) => handleChange('generateMeetingLink', e.target.checked)}
                  />
                  Enlace Meet
                </label>
              </div>
            </div>

            <div style={{ fontSize: '0.7rem', color: '#94a3b8', background: 'rgba(0,0,0,0.25)', padding: '8px', borderRadius: '6px', borderLeft: '2px solid #10b981' }}>
              💡 Inyecta en el flujo las variables:
              <br /><code style={{ color: '#34d399' }}>{'{{appointment_link}}'}</code> (Enlace Meet)
              <br /><code style={{ color: '#34d399' }}>{'{{appointment_start}}'}</code> (Fecha)
            </div>
          </div>
        )}

        {/* NODO ENVIAR CORREO */}
        {nodeType === 'send_email' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '8px 10px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>
                ✉️ Notificación por Correo (SMTP)
              </span>
            </div>

            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
              Destinatario (Email)
            </label>
            <input
              type="text"
              value={data.to || ''}
              onChange={(e) => handleChange('to', e.target.value)}
              placeholder="{{email}} o asesor@empresa.com"
              style={{
                width: '100%',
                background: '#151d2f',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#38bdf8',
                padding: '8px',
                fontSize: '0.85rem',
                marginBottom: '10px',
              }}
            />

            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
              Asunto del Correo
            </label>
            <input
              type="text"
              value={data.subject || ''}
              onChange={(e) => handleChange('subject', e.target.value)}
              placeholder="Confirmación de tu cita - {{nombre}}"
              style={{
                width: '100%',
                background: '#151d2f',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#fff',
                padding: '8px',
                fontSize: '0.85rem',
                marginBottom: '10px',
              }}
            />

            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
              Cuerpo del Correo (Soporta {'{{variables}}'})
            </label>
            <textarea
              rows={4}
              value={data.body || ''}
              onChange={(e) => handleChange('body', e.target.value)}
              placeholder="Hola {{nombre}}, tu cita ha sido programada con éxito para {{fecha_cita}}. Enlace de reunión: {{appointment_link}}"
              style={{
                width: '100%',
                background: '#151d2f',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#fff',
                padding: '8px',
                fontSize: '0.85rem',
                marginBottom: '10px',
              }}
            />

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#cbd5e1', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={data.isHtml || false}
                onChange={(e) => handleChange('isHtml', e.target.checked)}
              />
              Interpretar como formato HTML
            </label>
          </div>
        )}

        {/* NODO HANDOFF */}
        {nodeType === 'handoff' && (
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
              Modo de Derivación
            </label>
            <select
              value={data.handoffType || 'vcard'}
              onChange={(e) => handleChange('handoffType', e.target.value)}
              style={{
                width: '100%',
                background: '#151d2f',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#fff',
                padding: '8px',
                fontSize: '0.85rem',
                marginBottom: '12px',
              }}
            >
              <option value="vcard">Tarjeta vCard de WhatsApp (Contacto Directo)</option>
              <option value="inbox">Transferencia a Bandeja Humana (Silenciar Bot)</option>
            </select>

            {data.handoffType === 'vcard' && (
              <>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                  Nombre del Asesor
                </label>
                <input
                  type="text"
                  value={data.contactVCard?.name || ''}
                  onChange={(e) =>
                    handleChange('contactVCard', { ...data.contactVCard, name: e.target.value })
                  }
                  style={{
                    width: '100%',
                    background: '#151d2f',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#fff',
                    padding: '8px',
                    fontSize: '0.85rem',
                    marginBottom: '8px',
                  }}
                />

                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                  Teléfono de WhatsApp (E.164)
                </label>
                <input
                  type="text"
                  value={data.contactVCard?.phone || ''}
                  onChange={(e) =>
                    handleChange('contactVCard', { ...data.contactVCard, phone: e.target.value })
                  }
                  style={{
                    width: '100%',
                    background: '#151d2f',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#25d366',
                    padding: '8px',
                    fontSize: '0.85rem',
                    marginBottom: '8px',
                  }}
                />

                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                  Organización / Área
                </label>
                <input
                  type="text"
                  value={data.contactVCard?.organization || ''}
                  onChange={(e) =>
                    handleChange('contactVCard', { ...data.contactVCard, organization: e.target.value })
                  }
                  style={{
                    width: '100%',
                    background: '#151d2f',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#fff',
                    padding: '8px',
                    fontSize: '0.85rem',
                  }}
                />
              </>
            )}
          </div>
        )}

        {/* NODO CONSULTA RAG / IA */}
        {nodeType === 'rag_query' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                background: 'rgba(168, 85, 247, 0.1)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '0.75rem',
                color: '#cbd5e1',
                lineHeight: 1.4,
              }}
            >
              <span style={{ fontWeight: 700, color: '#c084fc', display: 'block', marginBottom: '4px' }}>
                Base de Conocimiento Qdrant + IA
              </span>
              Permite a los usuarios hacer preguntas libres en WhatsApp o buscar en los PDFs corporativos cargados con respuestas oficiales.
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                Mensaje de Bienvenida al Asistente (Modo Interactivo)
              </label>
              <textarea
                rows={2}
                value={data.prompt || ''}
                onChange={(e) => handleChange('prompt', e.target.value)}
                placeholder="Ej. 🤖 Por favor, escribe tu pregunta o consulta y te responderé enseguida:"
                style={{
                  width: '100%',
                  background: '#151d2f',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  color: '#fff',
                  padding: '8px',
                  fontSize: '0.85rem',
                }}
              />
              <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                Se envía al usuario para invitarlo a escribir su consulta antes de procesarla.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                Pregunta o Variable a Consultar (Opcional si es interactivo)
              </label>
              <input
                type="text"
                value={data.ragQuery || ''}
                onChange={(e) => handleChange('ragQuery', e.target.value)}
                placeholder="Ej. {{captura}} o dejar vacío para modo libre"
                style={{
                  width: '100%',
                  background: '#151d2f',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  color: '#fff',
                  padding: '8px',
                  fontSize: '0.85rem',
                }}
              />
              <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                Si dejas este campo vacío o en <code style={{ color: '#38bdf8' }}>{`{{captura}}`}</code>, el bot esperará la pregunta del cliente en el chat.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                Guardar Respuesta en Variable
              </label>
              <input
                type="text"
                value={data.variableName || 'rag_answer'}
                onChange={(e) => handleChange('variableName', e.target.value)}
                placeholder="rag_answer"
                style={{
                  width: '100%',
                  background: '#151d2f',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  color: '#38bdf8',
                  padding: '8px',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <input
                type="checkbox"
                id="sendDirectly"
                checked={data.sendDirectly !== false}
                onChange={(e) => handleChange('sendDirectly', e.target.checked)}
                style={{ cursor: 'pointer', accentColor: '#a855f7' }}
              />
              <label htmlFor="sendDirectly" style={{ fontSize: '0.75rem', color: '#cbd5e1', cursor: 'pointer' }}>
                Enviar respuesta automáticamente a WhatsApp
              </label>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                Fragmentos de Contexto (Top-K)
              </label>
              <input
                type="number"
                min={1}
                max={6}
                value={data.limit || 3}
                onChange={(e) => handleChange('limit', parseInt(e.target.value, 10))}
                style={{
                  width: '100%',
                  background: '#151d2f',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  color: '#fff',
                  padding: '8px',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
                Instrucción de Sistema Personalizada (Opcional)
              </label>
              <textarea
                rows={3}
                value={data.customPrompt || ''}
                onChange={(e) => handleChange('customPrompt', e.target.value)}
                placeholder="Ej. Responde de forma cordial y breve, enfatizando los teléfonos de emergencia..."
                style={{
                  width: '100%',
                  background: '#151d2f',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  color: '#fff',
                  padding: '8px',
                  fontSize: '0.8rem',
                }}
              />
            </div>
          </div>
        )}

        {/* NODO FIN */}
        {nodeType === 'end' && (
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
              Mensaje de Despedida
            </label>
            <textarea
              rows={3}
              value={data.closingMessage || ''}
              onChange={(e) => handleChange('closingMessage', e.target.value)}
              placeholder="Ej. ¡Gracias por comunicarte con Seguros Altura! Que tengas un excelente día."
              style={{
                width: '100%',
                background: '#151d2f',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#fff',
                padding: '8px',
                fontSize: '0.85rem',
              }}
            />
          </div>
        )}
      </div>

      {/* Botón Eliminar Nodo */}
      {nodeType !== 'start' && (
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <button
            onClick={() => onDeleteNode(selectedNode.id)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: 'rgba(244, 63, 94, 0.15)',
              color: '#f43f5e',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: '6px',
              padding: '10px',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(244, 63, 94, 0.25)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(244, 63, 94, 0.15)')}
          >
            <Trash2 size={16} /> Eliminar Nodo
          </button>
        </div>
      )}
    </aside>
  );
};
