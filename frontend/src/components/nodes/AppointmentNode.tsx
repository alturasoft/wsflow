import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Calendar, Video, Clock } from 'lucide-react';
import { NodeData } from '../../types/flow';

export const AppointmentNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as NodeData;
  const summary = nodeData.summary || 'Cita de Asesoría';
  const attendeeEmail = nodeData.attendeeEmail || '{{email}}';
  const duration = nodeData.durationMinutes || 30;
  const hasMeet = nodeData.generateMeetingLink !== false;

  return (
    <div
      className={`flow-node-card ${selected ? 'selected' : ''}`}
      style={{ borderColor: 'rgba(16, 185, 129, 0.4)' }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="custom-handle custom-handle-target"
      />

      <div
        className="node-header"
        style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}
      >
        <div
          className="node-icon-wrapper"
          style={{ background: '#10b981', color: '#000' }}
        >
          <Calendar size={16} />
        </div>
        <span>Agendar Cita</span>
      </div>

      <div className="node-body">
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '6px' }}>
          {summary}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.725rem', color: '#94a3b8' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '4px 6px', borderRadius: '4px' }}>
            <span>Invitado:</span>
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>{attendeeEmail}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} color="#fbbf24" /> {duration} min
            </span>
            {hasMeet && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#60a5fa' }}>
                <Video size={12} /> Google Meet
              </span>
            )}
          </div>
        </div>

        {/* Error Handle */}
        <div style={{ position: 'relative', marginTop: '10px', textAlign: 'right' }}>
          <span style={{ fontSize: '0.7rem', color: '#f43f5e', marginRight: '6px' }}>Sin cupo / Error</span>
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
