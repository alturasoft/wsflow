import React, { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  useReactFlow,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { StartNode } from './nodes/StartNode';
import { MessageNode } from './nodes/MessageNode';
import { ButtonsNode } from './nodes/ButtonsNode';
import { ListNode } from './nodes/ListNode';
import { CaptureNode } from './nodes/CaptureNode';
import { ConditionNode } from './nodes/ConditionNode';
import { ApiCallNode } from './nodes/ApiCallNode';
import { AppointmentNode } from './nodes/AppointmentNode';
import { SendEmailNode } from './nodes/SendEmailNode';
import { HandoffNode } from './nodes/HandoffNode';
import { EndNode } from './nodes/EndNode';
import { FlowNodeType } from '../types/flow';

const nodeTypes = {
  start: StartNode,
  message: MessageNode,
  buttons: ButtonsNode,
  list: ListNode,
  capture: CaptureNode,
  condition: ConditionNode,
  api_call: ApiCallNode,
  appointment: AppointmentNode,
  send_email: SendEmailNode,
  handoff: HandoffNode,
  end: EndNode,
};

interface FlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: any;
  onEdgesChange: any;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  onSelectNode: (node: Node | null) => void;
}

export const FlowCanvas: React.FC<FlowCanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  setNodes,
  setEdges,
  onSelectNode,
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: '#10b981', strokeWidth: 2.5 },
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as FlowNodeType;
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNodeId = `node_${type}_${Date.now()}`;
      let initialData: any = {};

      switch (type) {
        case 'start':
          initialData = { label: 'Inicio del flujo' };
          break;
        case 'message':
          initialData = { text: '¡Hola! ¿En qué podemos ayudarte hoy?' };
          break;
        case 'buttons':
          initialData = {
            text: 'Por favor selecciona una opción:',
            buttons: [
              { id: `btn_${Date.now()}_1`, title: 'Opción 1' },
              { id: `btn_${Date.now()}_2`, title: 'Opción 2' },
            ],
          };
          break;
        case 'list':
          initialData = {
            text: 'Por favor selecciona una opción de la lista:',
            buttonLabel: 'Ver opciones',
            sections: [
              {
                title: 'Opciones Disponibles',
                rows: [
                  { id: `opt_${Date.now()}_1`, title: 'Opción 1', description: 'Descripción detallada 1' },
                  { id: `opt_${Date.now()}_2`, title: 'Opción 2', description: 'Descripción detallada 2' },
                  { id: `opt_${Date.now()}_3`, title: 'Opción 3', description: 'Descripción detallada 3' },
                  { id: `opt_${Date.now()}_4`, title: 'Opción 4', description: 'Descripción detallada 4' },
                ],
              },
            ],
          };
          break;
        case 'capture':
          initialData = {
            prompt: 'Por favor escribe tu número de teléfono:',
            variableName: 'telefono_cliente',
            validationType: 'phone',
          };
          break;
        case 'condition':
          initialData = {
            variableName: 'edad',
            operator: '>=',
            targetValue: '18',
          };
          break;
        case 'api_call':
          initialData = {
            method: 'GET',
            url: 'https://api.empresa.com/verificar/{{ci}}',
            responseMappings: [],
          };
          break;
        case 'handoff':
          initialData = {
            handoffType: 'vcard',
            contactVCard: {
              name: 'Asesor de Turno',
              phone: '+59170000000',
              organization: 'Seguros Altura',
            },
          };
          break;
        case 'end':
          initialData = { closingMessage: 'Gracias por comunicarte con nosotros. ¡Hasta pronto!' };
          break;
      }

      const newNode: Node = {
        id: newNodeId,
        type,
        position,
        data: initialData,
      };

      setNodes((nds) => nds.concat(newNode));
      onSelectNode(newNode);
    },
    [screenToFlowPosition, setNodes, onSelectNode],
  );

  return (
    <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => onSelectNode(node)}
        onPaneClick={() => onSelectNode(null)}
        onEdgeContextMenu={(e, edge) => {
          e.preventDefault();
          setEdges((eds) => eds.filter((item) => item.id !== edge.id));
        }}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(255, 255, 255, 0.12)" />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            switch (n.type) {
              case 'start': return '#25d366';
              case 'message': return '#3b82f6';
              case 'buttons': return '#10b981';
              case 'capture': return '#f59e0b';
              case 'condition': return '#eab308';
              case 'api_call': return '#06b6d4';
              case 'handoff': return '#a855f7';
              case 'end': return '#f43f5e';
              default: return '#64748b';
            }
          }}
          maskColor="rgba(10, 14, 23, 0.85)"
        />
      </ReactFlow>
    </div>
  );
};
