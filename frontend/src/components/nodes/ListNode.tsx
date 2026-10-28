import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { ListFilter } from 'lucide-react';
import { NodeData } from '../../types/flow';

export const ListNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as NodeData;
  const sections = nodeData.sections || [];
  const text = nodeData.text || 'Selecciona una opción de la lista:';
  const buttonLabel = nodeData.buttonLabel || 'Ver opciones';

  // Obtener todas las filas de todas las secciones
  const allRows = sections.flatMap((s) => s.rows || []);

  return (
    <div
      className={`flow-node-card ${selected ? 'selected' : ''}`}
      style={{ borderColor: 'rgba(14, 165, 233, 0.4)', minWidth: '220px' }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="custom-handle custom-handle-target"
      />

      <div className="node-header" style={{ background: 'rgba(14, 165, 233, 0.12)', color: '#38bdf8' }}>
        <div className="node-icon-wrapper" style={{ background: '#0ea5e9', color: '#fff' }}>
          <ListFilter size={16} />
        </div>
        <span>Lista Interactiva ({allRows.length}/10)</span>
      </div>

      <div className="node-body">
        <p style={{ fontSize: '0.8rem', color: '#e2e8f0', marginBottom: '8px' }}>{text}</p>

        {/* Botón trigger simulado de WhatsApp */}
        <div
          style={{
            background: 'rgba(14, 165, 233, 0.15)',
            border: '1px dashed rgba(14, 165, 233, 0.4)',
            borderRadius: '6px',
            padding: '4px 8px',
            fontSize: '0.75rem',
            color: '#38bdf8',
            textAlign: 'center',
            marginBottom: '8px',
            fontWeight: 600,
          }}
        >
          ☰ {buttonLabel}
        </div>

        {/* Lista de filas conectables */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
          {allRows.map((row, index) => (
            <div
              key={row.id || index}
              className="wa-btn-preview"
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '6px 10px',
                borderLeft: '3px solid #0ea5e9',
              }}
            >
              <span style={{ fontWeight: 600, fontSize: '0.78rem' }}>{row.title || `Opción ${index + 1}`}</span>
              {row.description && (
                <span style={{ fontSize: '0.675rem', color: '#94a3b8', marginTop: '2px' }}>
                  {row.description}
                </span>
              )}
              <Handle
                type="source"
                position={Position.Right}
                id={row.id}
                className="custom-handle custom-handle-source"
                style={{ right: '-19px', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          ))}

          {allRows.length === 0 && (
            <p style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.75rem' }}>
              Sin opciones (máximo 10)
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
