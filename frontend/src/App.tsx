import React, { useState, useEffect, useCallback } from 'react';
import {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
} from '@xyflow/react';
import { Header } from './components/Header';
import { NodePalette } from './components/NodePalette';
import { Inspector } from './components/Inspector';
import { FlowCanvas } from './components/FlowCanvas';
import { Simulator } from './components/Simulator';
import { HumanInbox } from './components/HumanInbox';
import { IntegrationsModal } from './components/IntegrationsModal';
import { Flow, Tenant, NodeData } from './types/flow';
import { getLayoutedElements } from './utils/autoLayout';
import { API_BASE } from './config';

// Flujo inicial de demostración (Insurance Bot)
const INITIAL_NODES: Node[] = [
  {
    id: 'node_start',
    type: 'start',
    position: { x: 250, y: 50 },
    data: { label: 'Inicio del flujo' },
  },
  {
    id: 'node_welcome',
    type: 'message',
    position: { x: 250, y: 190 },
    data: {
      text: '¡Hola {{nombre_cliente}}! Bienvenido al asistente virtual de Seguros Altura.',
    },
  },
  {
    id: 'node_main_menu',
    type: 'buttons',
    position: { x: 250, y: 350 },
    data: {
      text: '¿En qué podemos ayudarte hoy? Por favor selecciona una opción:',
      buttons: [
        { id: 'btn_siniestro', title: 'Reportar Siniestro' },
        { id: 'btn_cotizar', title: 'Cotizar Seguro' },
        { id: 'btn_asesor', title: 'Hablar con Asesor' },
      ],
    },
  },
  {
    id: 'node_ask_ci',
    type: 'capture',
    position: { x: 620, y: 250 },
    data: {
      variableName: 'numero_documento',
      validationType: 'number',
      prompt: 'Por favor, ingresa tu número de Carnet de Identidad (solo números) para buscar tu póliza:',
      retryMessage: 'El carnet debe contener solo números. Intenta nuevamente:',
    },
  },
  {
    id: 'node_confirm_siniestro',
    type: 'message',
    position: { x: 620, y: 450 },
    data: {
      text: 'Gracias. Hemos localizado tu registro para el CI {{numero_documento}}. Te estamos conectando de inmediato con nuestro ajustador de guardia.',
    },
  },
  {
    id: 'node_vcard_ajustador',
    type: 'handoff',
    position: { x: 620, y: 620 },
    data: {
      handoffType: 'vcard',
      contactVCard: {
        name: 'Carlos Mendoza - Ajustador de Siniestros',
        phone: '+59170112233',
        organization: 'Seguros Altura Emergencias',
      },
    },
  },
  {
    id: 'node_handoff_inbox',
    type: 'handoff',
    position: { x: 250, y: 620 },
    data: {
      handoffType: 'inbox',
    },
  },
  {
    id: 'node_end_agent',
    type: 'end',
    position: { x: 250, y: 780 },
    data: {
      closingMessage: 'Un asesor humano ha tomado tu conversación y te responderá en unos instantes. ¡Muchas gracias!',
    },
  },
];

const INITIAL_EDGES: Edge[] = [
  { id: 'e1', source: 'node_start', target: 'node_welcome', animated: true, style: { stroke: '#10b981', strokeWidth: 2.5 } },
  { id: 'e2', source: 'node_welcome', target: 'node_main_menu', animated: true, style: { stroke: '#10b981', strokeWidth: 2.5 } },
  { id: 'e3', source: 'node_main_menu', target: 'node_ask_ci', sourceHandle: 'btn_siniestro', animated: true, style: { stroke: '#10b981', strokeWidth: 2.5 } },
  { id: 'e4', source: 'node_ask_ci', target: 'node_confirm_siniestro', animated: true, style: { stroke: '#10b981', strokeWidth: 2.5 } },
  { id: 'e5', source: 'node_confirm_siniestro', target: 'node_vcard_ajustador', animated: true, style: { stroke: '#10b981', strokeWidth: 2.5 } },
  { id: 'e6', source: 'node_main_menu', target: 'node_handoff_inbox', sourceHandle: 'btn_asesor', animated: true, style: { stroke: '#10b981', strokeWidth: 2.5 } },
  { id: 'e7', source: 'node_handoff_inbox', target: 'node_end_agent', animated: true, style: { stroke: '#10b981', strokeWidth: 2.5 } },
];

export function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const [activeView, setActiveView] = useState<'EDITOR' | 'INBOX'>('EDITOR');
  const [pendingHandoffCount, setPendingHandoffCount] = useState(0);

  const [flows, setFlows] = useState<Flow[]>([]);
  const [activeFlow, setActiveFlow] = useState<Flow | null>(null);
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Cargar un flujo en el lienzo
  const applyFlowToCanvas = useCallback(
    (flow: Flow) => {
      setActiveFlow(flow);
      setSelectedNode(null);

      const isDefault = activeTenant?.whatsappAccounts?.[0]?.defaultFlowId === flow.id;
      const flowKeywords = Array.isArray(flow.triggerKeywords) ? flow.triggerKeywords : [];
      const version = flow.versions?.[0];
      if (version?.definition?.nodes && version.definition.nodes.length > 0) {
        const initialMap = new Map(INITIAL_NODES.map((n) => [n.id, n.position]));
        const sanitizedNodes = version.definition.nodes.map((node: any, idx: number) => {
          let nodeData = node.data || {};
          if (node.type === 'start') {
            const nodeKeywords = Array.isArray(nodeData.triggerKeywords)
              ? nodeData.triggerKeywords
              : flowKeywords;
            nodeData = {
              ...nodeData,
              triggerKeywords: nodeKeywords,
              triggerType: nodeData.triggerType || (nodeKeywords.length > 0 ? 'keywords' : 'all'),
              isDefaultFlow: isDefault,
            };
          }
          return {
            ...node,
            data: nodeData,
            position:
              node.position && typeof node.position.x === 'number'
                ? node.position
                : initialMap.get(node.id) || { x: 250 + (idx % 2 === 0 ? 0 : 360), y: 60 + idx * 120 },
          };
        });

        const sanitizedEdges = (version.definition.edges || []).map((edge: any) => ({
          ...edge,
          animated: true,
          style: { stroke: '#10b981', strokeWidth: 2.5 },
        }));

        setNodes(sanitizedNodes);
        setEdges(sanitizedEdges);
      } else {
        setNodes([
          {
            id: 'node_start',
            type: 'start',
            position: { x: 250, y: 60 },
            data: {
              label: 'Inicio del flujo',
              triggerKeywords: flowKeywords,
              triggerType: flowKeywords.length > 0 ? 'keywords' : 'all',
            },
          },
        ]);
        setEdges([]);
      }
    },
    [setNodes, setEdges],
  );

  // Cargar datos de la API
  useEffect(() => {
    async function loadData() {
      try {
        const [tenantsRes, flowsRes, statsRes] = await Promise.all([
          fetch(`${API_BASE}/tenants`).then((r) => r.json()),
          fetch(`${API_BASE}/flows`).then((r) => r.json()),
          fetch(`${API_BASE}/stats`).then((r) => r.json()),
        ]);

        if (statsRes?.handedOffSessions !== undefined) {
          setPendingHandoffCount(statsRes.handedOffSessions);
        }

        if (tenantsRes && tenantsRes.length > 0) {
          setActiveTenant(tenantsRes[0]);
        }

        if (flowsRes && flowsRes.length > 0) {
          setFlows(flowsRes);
          applyFlowToCanvas(flowsRes[0]);
        }
      } catch (err) {
        console.warn('API backend no disponible en primer intento, usando datos locales.');
      }
    }
    loadData();
  }, [applyFlowToCanvas]);

  // Cambiar entre flujos existentes
  const handleSelectFlow = (flowId: string) => {
    const target = flows.find((f) => f.id === flowId);
    if (target) {
      applyFlowToCanvas(target);
      showToast(`Flujo cargado: ${target.name}`);
    }
  };

  // Crear un nuevo flujo
  const handleCreateFlow = async (name: string, description?: string, triggerKeywords?: string[]) => {
    const res = await fetch(`${API_BASE}/flows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        triggerKeywords,
        tenantId: activeTenant?.id,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Error al crear flujo');
    }

    const newFlow = await res.json();
    setFlows((prev) => [newFlow, ...prev]);
    applyFlowToCanvas(newFlow);
    showToast(`✓ ¡Flujo "${newFlow.name}" creado con éxito!`);
  };

  // Eliminar un flujo existente
  const handleDeleteFlow = async (flowId: string) => {
    try {
      const res = await fetch(`${API_BASE}/flows/${flowId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al eliminar el flujo');
      }

      const remainingFlows = flows.filter((f) => f.id !== flowId);
      setFlows(remainingFlows);

      // Si el flujo eliminado era el activo, cargar el primer flujo disponible
      if (activeFlow?.id === flowId && remainingFlows.length > 0) {
        applyFlowToCanvas(remainingFlows[0]);
      }

      showToast('✓ Flujo eliminado correctamente.');
    } catch (err: any) {
      alert(`⚠️ ${err.message || 'No se pudo eliminar el flujo.'}`);
    }
  };

  // Auto-organización inteligente usando algoritmo jerárquico de Dagre
  const handleAutoLayout = useCallback(
    (direction: 'TB' | 'LR' = 'TB') => {
      if (nodes.length === 0) return;
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges, direction);
      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
      showToast('✨ Diagrama organizado inteligentemente.');
    },
    [nodes, edges, setNodes, setEdges],
  );

  // Actualizar datos de un nodo seleccionado
  const handleUpdateNodeData = useCallback(
    (nodeId: string, newData: Partial<NodeData>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                ...newData,
              },
            };
          }
          return node;
        }),
      );

      // Mantener actualizado el inspector
      setSelectedNode((prev) => (prev ? { ...prev, data: { ...prev.data, ...newData } } : null));

      // Si se actualizaron las palabras clave del nodo de inicio, sincronizar en el flujo activo
      if (newData.triggerKeywords) {
        setActiveFlow((prev) => (prev ? { ...prev, triggerKeywords: newData.triggerKeywords! } : null));
        setFlows((prev) =>
          prev.map((f) => (f.id === activeFlow?.id ? { ...f, triggerKeywords: newData.triggerKeywords! } : f)),
        );
      }
    },
    [setNodes, activeFlow?.id],
  );

  // Eliminar un nodo
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedNode(null);
      showToast('Nodo eliminado del lienzo.');
    },
    [setNodes, setEdges],
  );

  // Guardar Borrador en Backend
  const handleSaveDraft = async () => {
    if (!activeFlow) {
      showToast('Borrador guardado localmente.');
      return;
    }
    setIsSaving(true);
    try {
      await fetch(`${API_BASE}/flows/${activeFlow.id}/draft`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          definition: { nodes, edges },
        }),
      });
      showToast('✓ Borrador guardado exitosamente.');
    } catch (e) {
      showToast('Error guardando borrador en servidor.');
    } finally {
      setIsSaving(false);
    }
  };

  // Publicar Flujo a Producción
  const handlePublish = async () => {
    // 1. Validar antes de publicar
    const validationErrors = validateFlow();
    if (validationErrors.length > 0) {
      alert(`⚠️ Errores de validación encontrados:\n\n${validationErrors.join('\n')}`);
      return;
    }

    setIsPublishing(true);
    try {
      if (activeFlow) {
        const res = await fetch(`${API_BASE}/flows/${activeFlow.id}/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            definition: { nodes, edges },
            changelog: `Publicado desde el editor visual - ${new Date().toLocaleTimeString()}`,
          }),
        });
        const publishedVer = await res.json();
        setActiveFlow((prev) =>
          prev ? { ...prev, activeVersionId: publishedVer.id, versions: [publishedVer, ...prev.versions] } : null,
        );
        setFlows((prev) =>
          prev.map((f) =>
            f.id === activeFlow.id
              ? { ...f, activeVersionId: publishedVer.id, versions: [publishedVer, ...f.versions] }
              : f,
          ),
        );
      }
      showToast('🎉 ¡Flujo publicado a producción en vivo!');
    } catch (e) {
      showToast('Error al publicar versión.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Establecer el flujo activo como el Flujo de Arranque Principal de WhatsApp
  const handleSetDefaultFlow = async () => {
    if (!activeFlow) return;
    try {
      const res = await fetch(`${API_BASE}/flows/${activeFlow.id}/set-default?tenantId=${activeTenant?.id}`, {
        method: 'PUT',
      });
      if (!res.ok) throw new Error('Error al establecer flujo');

      setActiveTenant((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          whatsappAccounts: (prev.whatsappAccounts || []).map((acc) => ({
            ...acc,
            defaultFlowId: activeFlow.id,
          })),
        };
      });

      // Actualizar datos del start node en el canvas
      setNodes((nds) =>
        nds.map((n) => (n.type === 'start' ? { ...n, data: { ...n.data, isDefaultFlow: true } } : n)),
      );

      // Si el inspector está abierto para el start node, actualizar también su estado
      setSelectedNode((prev) =>
        prev && prev.type === 'start' ? { ...prev, data: { ...prev.data, isDefaultFlow: true } } : prev,
      );

      showToast(`⭐ ¡"${activeFlow.name}" establecido como Flujo de Arranque Principal!`);
    } catch (e) {
      showToast('Error al establecer flujo de arranque.');
    }
  };

  // Linter y Validador de Grafos
  const validateFlow = (): string[] => {
    const errors: string[] = [];

    const startNodes = nodes.filter((n) => n.type === 'start');
    if (startNodes.length === 0) {
      errors.push('• Falta el nodo de "Inicio" (StartNode).');
    } else if (startNodes.length > 1) {
      errors.push('• Hay más de un nodo de inicio. Solo se permite 1 punto de entrada.');
    }

    // Verificar nodos huérfanos (sin ninguna conexión de entrada o salida)
    nodes.forEach((node) => {
      if (node.type === 'start') {
        const hasOutgoing = edges.some((e) => e.source === node.id);
        if (!hasOutgoing) errors.push(`• El nodo de Inicio no tiene ninguna conexión de salida.`);
      } else {
        const hasIncoming = edges.some((e) => e.target === node.id);
        if (!hasIncoming) {
          errors.push(`• Nodo "${node.data?.label || node.type}" (${node.id}) está desconectado.`);
        }
      }
    });

    return errors;
  };

  const handleValidateClick = () => {
    const errors = validateFlow();
    if (errors.length === 0) {
      showToast('✓ ¡Flujo 100% válido y listo para producción!');
    } else {
      alert(`⚠️ Revisión del Flujo:\n\n${errors.join('\n')}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#0a0e17' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '75px',
            right: '25px',
            background: '#1e293b',
            color: '#34d399',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            padding: '10px 18px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            fontSize: '0.85rem',
            fontWeight: 600,
            zIndex: 100,
            animation: 'fadeIn 0.2s ease-in-out',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <Header
        flows={flows}
        activeFlow={activeFlow}
        onSelectFlow={handleSelectFlow}
        onCreateFlow={handleCreateFlow}
        onDeleteFlow={handleDeleteFlow}
        onAutoLayout={() => handleAutoLayout('TB')}
        flowName={activeFlow?.name || 'Atención General y Siniestros'}
        versionNumber={activeFlow?.versions?.[0]?.versionNumber || 1}
        status={activeFlow?.versions?.[0]?.status || 'PUBLISHED'}
        tenantName={activeTenant?.name || 'Seguros Altura S.A.'}
        phoneNumber={activeTenant?.whatsappAccounts?.[0]?.displayPhoneNumber || '+591 70000000'}
        activeView={activeView}
        onViewChange={(v) => setActiveView(v)}
        pendingHandoffCount={pendingHandoffCount}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
        onValidate={handleValidateClick}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onOpenIntegrations={() => setIsIntegrationsOpen(true)}
        isSaving={isSaving}
        isPublishing={isPublishing}
      />

      {/* Main Workspace: Alterna entre Editor Visual e Inbox Humano */}
      {activeView === 'INBOX' ? (
        <HumanInbox />
      ) : (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
          {/* Left Palette */}
          <NodePalette />

          {/* Center Canvas */}
          <FlowCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            setNodes={setNodes}
            setEdges={setEdges}
            onSelectNode={(node) => setSelectedNode(node)}
          />

          {/* Right Inspector */}
          {selectedNode && (
            <Inspector
              selectedNode={selectedNode}
              onUpdateNodeData={handleUpdateNodeData}
              onDeleteNode={handleDeleteNode}
              onClose={() => setSelectedNode(null)}
              isDefaultFlow={activeTenant?.whatsappAccounts?.[0]?.defaultFlowId === activeFlow?.id}
              onSetDefaultFlow={handleSetDefaultFlow}
              flowName={activeFlow?.name}
            />
          )}
        </div>
      )}

      {/* WhatsApp Live Simulator Drawer */}
      <Simulator
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        nodes={nodes}
        edges={edges}
      />

      {/* Modal de Integraciones y Cuentas Conectadas */}
      <IntegrationsModal
        isOpen={isIntegrationsOpen}
        onClose={() => setIsIntegrationsOpen(false)}
        tenantId={activeTenant?.id}
      />
    </div>
  );
}

export default function Root() {
  return (
    <ReactFlowProvider>
      <App />
    </ReactFlowProvider>
  );
}
