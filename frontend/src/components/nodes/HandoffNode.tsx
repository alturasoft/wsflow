import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Headphones, Contact2, Inbox } from 'lucide-react';
import { NodeData } from '../../types/flow';

export const HandoffNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as NodeData;
  const handoffType = nodeData.handoffType || 'vcard';
  const vcard = nodeData.contactVCard;

  return (
    <div className={`flow-node-card ${selected ? 'selected' : ''}`} style={{ borderColor: 'rgba(168, 85, 247, 0.4)' }}>
      <Handle
        type="target"
        position={Position.Top}
        className="custom-handle custom-handle-target"
      />

      <div className="node-header" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#c084fc' }}>
        <div className="node-icon-wrapper" style={{ background: '#a855f7', color: '#fff' }}>
          {handoffType === 'vcard' ? <Contact2 size={16} /> : <Headphones size={16} />}
        </div>
        <span>Derivación ({handoffType === 'vcard' ? 'vCard WhatsApp' : 'Bandeja Humana'})</span>
      </div>

      <div className="node-body">
        {handoffType === 'vcard' ? (
          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px', borderRadius: '6px' }}>
            <p style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.8rem' }}>
              {vcard?.name || 'Nombre del Asesor'}
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '2px' }}>
              {vcard?.organization || 'Empresa'}
            </p>
            <p style={{ color: '#25d366', fontSize: '0.75rem', fontWeight: 500, marginTop: '2px' }}>
              {vcard?.phone || '+591 70000000'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '0.8rem' }}>
            <Inbox size={18} color="#a855f7" />
            <span>Silencia el bot y transfiere a la cola de agentes humanos.</span>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="custom-handle custom-handle-source"
      />
    </div>
  );
};
