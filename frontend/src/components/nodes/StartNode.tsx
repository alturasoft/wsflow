import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Play, Zap, Tag, MessageSquare, Star } from 'lucide-react';
import { NodeData } from '../../types/flow';

export const StartNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = (data || {}) as unknown as NodeData;
  const keywords = Array.isArray(nodeData.triggerKeywords) ? nodeData.triggerKeywords : [];
  const hasKeywords = keywords.length > 0;
  const isKeywordsMode = nodeData.triggerType === 'keywords' || hasKeywords;
  const isDefaultFlow = !!nodeData.isDefaultFlow;

  return (
    <div
      className={`flow-node-card ${selected ? 'selected' : ''}`}
      style={{
        width: '260px',
        borderColor: selected ? '#25d366' : 'rgba(37, 211, 102, 0.4)',
        boxShadow: selected
          ? '0 0 20px rgba(37, 211, 102, 0.35)'
          : '0 4px 16px rgba(0, 0, 0, 0.4)',
        background: '#111827',
        borderRadius: '12px',
        overflow: 'hidden',
        borderWidth: '1.5px',
        borderStyle: 'solid',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Header del Nodo */}
      <div
        className="node-header"
        style={{
          background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.18) 0%, rgba(18, 140, 126, 0.1) 100%)',
          color: '#25d366',
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(37, 211, 102, 0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            className="node-icon-wrapper"
            style={{
              background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)',
              color: '#000',
              width: '26px',
              height: '26px',
              borderRadius: '7px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(37, 211, 102, 0.4)',
            }}
          >
            <Play size={13} fill="#000" />
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f8fafc', display: 'block' }}>
              Punto de Inicio
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {isDefaultFlow && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '0.62rem',
                fontWeight: 800,
                padding: '2px 5px',
                borderRadius: '999px',
                background: 'rgba(234, 179, 8, 0.25)',
                color: '#facc15',
                border: '1px solid rgba(234, 179, 8, 0.45)',
              }}
              title="Este flujo responde cuando no hay palabras clave específicas o el usuario saluda"
            >
              <Star size={9} fill="#facc15" /> ARRANQUE
            </span>
          )}
          {/* Badge de tipo */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              fontSize: '0.65rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              padding: '2px 6px',
              borderRadius: '999px',
              background: isKeywordsMode ? 'rgba(37, 211, 102, 0.2)' : 'rgba(148, 163, 184, 0.15)',
              color: isKeywordsMode ? '#4ade80' : '#94a3b8',
              border: `1px solid ${isKeywordsMode ? 'rgba(74, 222, 128, 0.3)' : 'rgba(148, 163, 184, 0.2)'}`,
            }}
          >
            {isKeywordsMode ? (
              <>
                <Zap size={10} /> Triggers
              </>
            ) : (
              <>
                <MessageSquare size={10} /> General
              </>
            )}
          </span>
        </div>
      </div>

      {/* Cuerpo del Nodo */}
      <div className="node-body" style={{ padding: '12px', background: '#0e1626' }}>
        {isKeywordsMode ? (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.72rem',
                color: '#94a3b8',
                marginBottom: '8px',
              }}
            >
              <Tag size={12} color="#34d399" />
              <span>Activa si el chat contiene:</span>
            </div>

            {hasKeywords ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {keywords.map((kw, i) => (
                  <span
                    key={i}
                    style={{
                      background: 'rgba(37, 211, 102, 0.12)',
                      color: '#4ade80',
                      border: '1px solid rgba(37, 211, 102, 0.25)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      letterSpacing: '0.01em',
                    }}
                  >
                    "{kw}"
                  </span>
                ))}
              </div>
            ) : (
              <div
                style={{
                  fontSize: '0.72rem',
                  color: '#fbbf24',
                  background: 'rgba(251, 191, 36, 0.1)',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px dashed rgba(251, 191, 36, 0.3)',
                }}
              >
                ⚠️ Sin palabras clave. Haz clic para agregar palabras activadoras.
              </div>
            )}
          </div>
        ) : (
          <p style={{ color: '#94a3b8', fontSize: '0.76rem', margin: 0, lineHeight: 1.4 }}>
            Inicia automáticamente cuando un cliente escribe cualquier saludo inicial al número.
          </p>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="custom-handle custom-handle-source"
        style={{
          background: '#25d366',
          width: '10px',
          height: '10px',
          bottom: '-6px',
          borderColor: '#0e1626',
        }}
      />
    </div>
  );
};
