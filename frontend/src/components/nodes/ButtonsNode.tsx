import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { MousePointerClick } from 'lucide-react';
import { NodeData } from '../../types/flow';

export const ButtonsNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as NodeData;
  const buttons = nodeData.buttons || [];
  const text = nodeData.text || 'Selecciona una opción:';

  return (
    <div className={`flow-node-card ${selected ? 'selected' : ''}`} style={{ borderColor: 'rgba(16, 185, 129, 0.4)' }}>
      <Handle
        type="target"
        position={Position.Top}
        className="custom-handle custom-handle-target"
      />

      <div className="node-header" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}>
        <div className="node-icon-wrapper" style={{ background: '#10b981', color: '#fff' }}>
          <MousePointerClick size={16} />
        </div>
        <span>Botones Interactivos</span>
      </div>

      <div className="node-body">
        <p style={{ fontSize: '0.8rem', color: '#e2e8f0', marginBottom: '8px' }}>{text}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
          {buttons.map((btn, index) => (
            <div key={btn.id || index} className="wa-btn-preview" style={{ position: 'relative' }}>
              <span>{btn.title || `Botón ${index + 1}`}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={btn.id}
                className="custom-handle custom-handle-source"
                style={{ right: '-19px', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          ))}

          {buttons.length === 0 && (
            <p style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.75rem' }}>
              Sin botones configurados (máx. 3)
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
