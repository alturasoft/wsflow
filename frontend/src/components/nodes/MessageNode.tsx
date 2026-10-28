import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';
import { NodeData } from '../../types/flow';

export const MessageNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as NodeData;
  const rawText = nodeData.text || 'Escribe un mensaje...';

  // Renderizar variables entre {{ }} con etiquetas visuales
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\{\{[a-zA-Z0-9_-]+\}\})/g);
    return parts.map((part, i) => {
      if (part.startsWith('{{') && part.endsWith('}}')) {
        const varName = part.replace(/[{}]/g, '');
        return <span key={i} className="var-tag">{varName}</span>;
      }
      return part;
    });
  };

  return (
    <div className={`flow-node-card ${selected ? 'selected' : ''}`} style={{ borderColor: 'rgba(59, 130, 246, 0.4)' }}>
      <Handle
        type="target"
        position={Position.Top}
        className="custom-handle custom-handle-target"
      />

      <div className="node-header" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }}>
        <div className="node-icon-wrapper" style={{ background: '#3b82f6', color: '#fff' }}>
          <MessageSquare size={16} />
        </div>
        <span>Mensaje de Texto</span>
      </div>

      <div className="node-body">
        <div className="wa-bubble">
          {renderFormattedText(rawText)}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="custom-handle custom-handle-source"
      />
    </div>
  );
};
