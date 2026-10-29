# Handoff

## Fecha
2026-10-29

## Estado del proyecto
Editor visual de flujos operativo. Se corrigió el bug de arrastre de componentes en el lienzo para todos los inquilinos.

## Última sesión
- **Qué se hizo**:
  - Se diagnosticó la causa por la cual los nodos volvían a su posición original inmediatamente al ser arrastrados.
  - La causa raíz era un bucle infinito en [App.tsx](file:///d:/OGOS/Altura/PROYECTOS/WhatsAppFlow/wsflow/frontend/src/App.tsx) donde `useEffect` dependía de `loadTenantData`, el cual cambiaba el estado `activeTenant`, recreando `applyFlowToCanvas` y llamando continuamente a `setNodes(sanitizedNodes)` desde el backend varias veces por segundo.
  - Se estabilizaron las referencias usando `activeTenantRef` y ejecutando la verificación de sesión en montaje sin dependencias volátiles.
  - Se ajustó `handleSaveDraft` para actualizar el estado local del flujo con la versión generada.
  - Se ajustaron las transiciones CSS en [StartNode.tsx](file:///d:/OGOS/Altura/PROYECTOS/WhatsAppFlow/wsflow/frontend/src/components/nodes/StartNode.tsx) e `index.css` a `border-color, box-shadow` para que no afecten `transform` ni la animación de arrastre.
  - Se compiló el frontend y se sincronizó directamente al contenedor `wsflow-frontend` en la VPS.
- **Archivos modificados**:
  - `frontend/src/App.tsx`
  - `frontend/src/components/FlowCanvas.tsx`
  - `frontend/src/components/nodes/StartNode.tsx`
  - `frontend/src/index.css`
- **Decisiones tomadas**:
  - Desacoplar `applyFlowToCanvas` de la referencia directa de `activeTenant` en el array de dependencias usando `activeTenantRef.current`.
- **Pendientes**:
  - Ninguno para este bug.

## Siguiente paso
Refrescar la pestaña del navegador con `Ctrl + F5` (para limpiar caché de estáticos) y probar mover los nodos en el canvas en cualquiera de las empresas / clientes.
