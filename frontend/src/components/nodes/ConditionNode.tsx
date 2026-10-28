import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitBranch, Check, X } from 'lucide-react';
import { NodeData } from '../../types/flow';

export const ConditionNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as NodeData;
  const varName = nodeData.variableName || 'variable';
  const operator = nodeData.operator || '==';
  const targetVal = nodeData.targetValue !== undefined ? String(nodeData.targetValue) : 'valor';

  return (
    <div className={`flow-node-card ${selected ? 'selected' : ''}`} style={{ borderColor: 'rgba(234, 179, 8, 0.4)' }}>
      <Handle
        type="target"
        position={Position.Top}
        className="custom-handle custom-handle-target"
      />

      <div className="node-header" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#facc15' }}>
        <div className="node-icon-wrapper" style={{ background: '#eab308', color: '#000' }}>
          <GitBranch size={16} />
        </div>
        <span>Condición (IF / ELSE)</span>
      </div>

      <div className="node-body">
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: '6px', textAlign: 'center', fontSize: '0.8rem', fontFamily: 'monospace' }}>
          <span style={{ color: '#60a5fa' }}>{varName}</span>
          <span style={{ color: '#facc15', margin: '0 6px', fontWeight: 'bold' }}>{operator}</span>
          <span style={{ color: '#34d399' }}>"{targetVal}"</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', position: 'relative' }}>
          {/* Rama VERDADERO */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>
            <Check size={14} />
            <span>SI (True)</span>
            <Handle
              type="source"
              position={Position.Bottom}
              id="true"
              className="custom-handle custom-handle-success"
              style={{ left: '25%', bottom: '-19px' }}
            />
          </div>

          {/* Rama FALSO */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f43f5e', fontSize: '0.75rem', fontWeight: 600 }}>
            <span>NO (False)</span>
            <X size={14} />
            <Handle
              type="source"
              position={Position.Bottom}
              id="false"
              className="custom-handle custom-handle-error"
              style={{ left: '75%', bottom: '-19px' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
