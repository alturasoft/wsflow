import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Mail, CheckCircle2 } from 'lucide-react';
import { NodeData } from '../../types/flow';

export const SendEmailNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as NodeData;
  const to = nodeData.to || '{{email}}';
  const subject = nodeData.subject || 'Confirmación de solicitud';

  return (
    <div
      className={`flow-node-card ${selected ? 'selected' : ''}`}
      style={{ borderColor: 'rgba(56, 189, 248, 0.4)' }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="custom-handle custom-handle-target"
      />

      <div
        className="node-header"
        style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}
      >
        <div
          className="node-icon-wrapper"
          style={{ background: '#0284c7', color: '#fff' }}
        >
          <Mail size={16} />
        </div>
        <span>Enviar Correo</span>
      </div>

      <div className="node-body">
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={subject}>
          {subject}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.725rem', color: '#94a3b8', background: 'rgba(0,0,0,0.2)', padding: '4px 6px', borderRadius: '4px' }}>
          <span>Para:</span>
          <span style={{ color: '#38bdf8', fontWeight: 600, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {to}
          </span>
        </div>

        {/* Error Handle */}
        <div style={{ position: 'relative', marginTop: '10px', textAlign: 'right' }}>
          <span style={{ fontSize: '0.7rem', color: '#f43f5e', marginRight: '6px' }}>En fallo</span>
          <Handle
            type="source"
            position={Position.Right}
            id="error"
            className="custom-handle custom-handle-error"
            style={{ right: '-19px', top: '50%', transform: 'translateY(-50%)' }}
          />
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="success"
        className="custom-handle custom-handle-success"
      />
    </div>
  );
};
