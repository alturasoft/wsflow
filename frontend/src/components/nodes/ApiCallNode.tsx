import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { CloudLightning, ArrowRight } from 'lucide-react';
import { NodeData } from '../../types/flow';

export const ApiCallNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as NodeData;
  const method = nodeData.method || 'GET';
  const url = nodeData.url || 'https://api.empresa.com/consulta';
  const mappingsCount = nodeData.responseMappings?.length || 0;

  const getMethodColor = () => {
    switch (method) {
      case 'POST': return { bg: 'rgba(59, 130, 246, 0.2)', text: '#60a5fa' };
      case 'PUT': return { bg: 'rgba(245, 158, 11, 0.2)', text: '#fbbf24' };
      default: return { bg: 'rgba(16, 185, 129, 0.2)', text: '#34d399' };
    }
  };

  const badgeStyle = getMethodColor();

  return (
    <div className={`flow-node-card ${selected ? 'selected' : ''}`} style={{ borderColor: 'rgba(6, 182, 212, 0.4)' }}>
      <Handle
        type="target"
        position={Position.Top}
        className="custom-handle custom-handle-target"
      />

      <div className="node-header" style={{ background: 'rgba(6, 182, 212, 0.1)', color: '#22d3ee' }}>
        <div className="node-icon-wrapper" style={{ background: '#06b6d4', color: '#000' }}>
          <CloudLightning size={16} />
        </div>
        <span>Consulta API Externa</span>
      </div>

      <div className="node-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ background: badgeStyle.bg, color: badgeStyle.text, padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
            {method}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={url}>
            {url}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.725rem', color: '#94a3b8', background: 'rgba(0,0,0,0.2)', padding: '5px 8px', borderRadius: '4px' }}>
          <span>Mapeo de variables:</span>
          <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{mappingsCount} campo(s)</span>
        </div>

        {/* Fallback Error Handle */}
        <div style={{ position: 'relative', marginTop: '10px', textAlign: 'right' }}>
          <span style={{ fontSize: '0.7rem', color: '#f43f5e', marginRight: '6px' }}>En error</span>
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
        className="custom-handle custom-handle-success"
      />
    </div>
  );
};
