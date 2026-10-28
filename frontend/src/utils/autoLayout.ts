import dagre from '@dagrejs/dagre';
import { Node, Edge } from '@xyflow/react';

/**
 * Organiza los nodos automáticamente de forma jerárquica (Sugiyama Layered Layout)
 * calculando niveles lógicos desde el nodo Start hacia abajo.
 */
export const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB',
): { nodes: Node[]; edges: Edge[] } => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 80, // Separación horizontal entre ramas hermanas
    ranksep: 100, // Separación vertical entre capas jerárquicas
    marginx: 50,
    marginy: 50,
  });

  // Calcular dimensiones aproximadas según el tipo y contenido del nodo
  nodes.forEach((node) => {
    const width = 280;
    let height = 140;

    if (node.type === 'start' || node.type === 'end') {
      height = 90;
    } else if (node.type === 'buttons') {
      const buttonCount = ((node.data as any)?.buttons || []).length;
      height = 140 + buttonCount * 38;
    } else if (node.type === 'list') {
      const sections = (node.data as any)?.sections || [];
      const totalRows = sections.flatMap((s: any) => s.rows || []).length;
      height = 150 + totalRows * 42;
    } else if (node.type === 'capture') {
      height = 160;
    } else if (node.type === 'condition') {
      height = 150;
    } else if (node.type === 'handoff') {
      height = 160;
    }

    dagreGraph.setNode(node.id, { width, height });
  });

  // Agregar aristas para el cálculo topológico
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Ejecutar el algoritmo de layout de Dagre
  dagre.layout(dagreGraph);

  // Mapear posiciones calculadas (ajustando de centro a esquina superior izquierda de React Flow)
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const width = 280;
    let height = 140;
    if (node.type === 'start' || node.type === 'end') height = 90;

    return {
      ...node,
      position: {
        x: Math.round(nodeWithPosition.x - width / 2),
        y: Math.round(nodeWithPosition.y - height / 2),
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};
