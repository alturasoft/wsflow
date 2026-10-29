import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Sparkles, BookOpen } from 'lucide-react';
import { NodeData } from '../../types/flow';

export const RagQueryNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as NodeData;
  const query = nodeData.ragQuery || '{{captura}}';
  const variableName = nodeData.variableName || 'rag_answer';
  const sendDirectly = nodeData.sendDirectly !== false;

  return (
    <div
      className={`flow-node-card ${selected ? 'selected' : ''}`}
      style={{ borderColor: 'rgba(168, 85, 247, 0.4)' }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="custom-handle custom-handle-target"
      />

      <div
        className="node-header"
        style={{ background: 'rgba(168, 85, 247, 0.12)', color: '#c084fc' }}
      >
        <div
          className="node-icon-wrapper"
          style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)', color: '#fff' }}
        >
          <Sparkles size={16} />
        </div>
        <span>Consulta RAG / IA</span>
      </div>

      <div className="node-body">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '8px',
            fontSize: '0.75rem',
            color: '#cbd5e1',
          }}
        >
          <BookOpen size={13} color="#a855f7" />
          <span style={{ fontWeight: 600 }}>Base de Conocimiento</span>
        </div>

        <div
          style={{
            background: 'rgba(0,0,0,0.25)',
            padding: '6px 8px',
            borderRadius: '6px',
            fontSize: '0.725rem',
            color: '#94a3b8',
            marginBottom: '6px',
          }}
        >
          <div>
            Modo:{' '}
            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
              {!nodeData.ragQuery || nodeData.ragQuery === '{{captura}}'
                ? 'Pregunta Libre / Chat'
                : nodeData.ragQuery}
            </span>
          </div>
          <div style={{ marginTop: '3px' }}>
            Variable: <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{`{{${variableName}}}`}</span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.7rem',
            color: '#64748b',
          }}
        >
          <span>Envío a WhatsApp:</span>
          <span style={{ color: sendDirectly ? '#34d399' : '#f59e0b', fontWeight: 600 }}>
            {sendDirectly ? 'Directo' : 'Solo Variable'}
          </span>
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
