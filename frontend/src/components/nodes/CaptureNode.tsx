import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { FormInput, Hash, Mail, Phone, FileText } from 'lucide-react';
import { NodeData } from '../../types/flow';

export const CaptureNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as NodeData;
  const prompt = nodeData.prompt || 'Por favor ingresa un dato:';
  const varName = nodeData.variableName || 'mi_variable';
  const valType = nodeData.validationType || 'text';

  const renderTypeIcon = () => {
    switch (valType) {
      case 'number':
        return <Hash size={12} />;
      case 'email':
        return <Mail size={12} />;
      case 'phone':
        return <Phone size={12} />;
      default:
        return <FileText size={12} />;
    }
  };

  return (
    <div className={`flow-node-card ${selected ? 'selected' : ''}`} style={{ borderColor: 'rgba(245, 158, 11, 0.4)' }}>
      <Handle
        type="target"
        position={Position.Top}
        className="custom-handle custom-handle-target"
      />

      <div className="node-header" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24' }}>
        <div className="node-icon-wrapper" style={{ background: '#f59e0b', color: '#000' }}>
          <FormInput size={16} />
        </div>
        <span>Capturar Dato</span>
      </div>

      <div className="node-body">
        <p style={{ fontSize: '0.8rem', color: '#e2e8f0', marginBottom: '8px' }}>{prompt}</p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', background: 'rgba(0,0,0,0.25)', padding: '6px 10px', borderRadius: '6px' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Guardar en:</span>
            <span className="var-tag">{varName}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>
            {renderTypeIcon()}
            <span>{valType.toUpperCase()}</span>
          </div>
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
