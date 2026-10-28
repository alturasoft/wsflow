import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { StopCircle } from 'lucide-react';
import { NodeData } from '../../types/flow';

export const EndNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as NodeData;
  const message = nodeData.closingMessage || 'Fin del flujo conversacional.';

  return (
    <div className={`flow-node-card ${selected ? 'selected' : ''}`} style={{ borderColor: 'rgba(244, 63, 94, 0.4)' }}>
      <Handle
        type="target"
        position={Position.Top}
        className="custom-handle custom-handle-target"
      />

      <div className="node-header" style={{ background: 'rgba(244, 63, 94, 0.1)', color: '#fb7185' }}>
        <div className="node-icon-wrapper" style={{ background: '#f43f5e', color: '#fff' }}>
          <StopCircle size={16} />
        </div>
        <span>Fin de Conversación</span>
      </div>

      <div className="node-body">
        <p style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{message}</p>
      </div>
    </div>
  );
};
