import React from 'react';
import {
  Play,
  MessageSquare,
  MousePointerClick,
  ListFilter,
  FormInput,
  GitBranch,
  CloudLightning,
  Calendar,
  Mail,
  Headphones,
  StopCircle,
} from 'lucide-react';
import { FlowNodeType } from '../types/flow';

interface PaletteItem {
  type: FlowNodeType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const PALETTE_ITEMS: PaletteItem[] = [
  {
    type: 'start',
    label: 'Inicio',
    description: 'Punto de entrada inicial',
    icon: <Play size={16} fill="#25d366" />,
    color: '#25d366',
  },
  {
    type: 'message',
    label: 'Mensaje',
    description: 'Texto con variables',
    icon: <MessageSquare size={16} />,
    color: '#3b82f6',
  },
  {
    type: 'buttons',
    label: 'Botones',
    description: 'Hasta 3 botones de Meta',
    icon: <MousePointerClick size={16} />,
    color: '#10b981',
  },
  {
    type: 'list',
    label: 'Lista',
    description: 'Hasta 10 opciones de Meta',
    icon: <ListFilter size={16} />,
    color: '#0ea5e9',
  },
  {
    type: 'capture',
    label: 'Captura',
    description: 'Guardar datos de usuario',
    icon: <FormInput size={16} />,
    color: '#f59e0b',
  },
  {
    type: 'condition',
    label: 'Condición',
    description: 'Bifurcación IF / ELSE',
    icon: <GitBranch size={16} />,
    color: '#eab308',
  },
  {
    type: 'api_call',
    label: 'API Externa',
    description: 'Consulta HTTP REST',
    icon: <CloudLightning size={16} />,
    color: '#06b6d4',
  },
  {
    type: 'appointment',
    label: 'Agendar Cita',
    description: 'Google Calendar / Meet',
    icon: <Calendar size={16} />,
    color: '#10b981',
  },
  {
    type: 'send_email',
    label: 'Enviar Correo',
    description: 'Notificación SMTP / Email',
    icon: <Mail size={16} />,
    color: '#38bdf8',
  },
  {
    type: 'handoff',
    label: 'Derivación',
    description: 'vCard o Agente Humano',
    icon: <Headphones size={16} />,
    color: '#a855f7',
  },
  {
    type: 'end',
    label: 'Fin',
    description: 'Cerrar la sesión',
    icon: <StopCircle size={16} />,
    color: '#f43f5e',
  },
];

export const NodePalette: React.FC = () => {
  const onDragStart = (event: React.DragEvent, nodeType: FlowNodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside
      id="node-palette"
      style={{
        width: '240px',
        background: '#0d131f',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        userSelect: 'none',
      }}
    >
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Componentes No-Code
        </h3>
        <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
          Arrastra nodos al lienzo
        </p>
      </div>

      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
        {PALETTE_ITEMS.map((item) => (
          <div
            key={item.type}
            onDragStart={(e) => onDragStart(e, item.type)}
            draggable
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              background: '#151d2f',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '8px',
              cursor: 'grab',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = item.color;
              e.currentTarget.style.background = '#1a243b';
              e.currentTarget.style.transform = 'translateX(4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.background = '#151d2f';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: `${item.color}18`,
                color: item.color,
                flexShrink: 0,
              }}
            >
              {item.icon}
            </div>

            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#f1f5f9' }}>
                {item.label}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto', padding: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '0.7rem', color: '#64748b' }}>
        <p>💡 <b>Tip:</b> Conecta la salida de un botón directamente a la acción deseada.</p>
      </div>
    </aside>
  );
};
