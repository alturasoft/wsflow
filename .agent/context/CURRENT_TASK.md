# Current Task

## Tarea activa
Corrección del error que impedía mover componentes en el lienzo de diseño de flujo (los nodos volvían a su posición original al arrastrarlos).

## Estado
COMPLETADO. Se identificó un bucle de re-renderizado infinito provocado por dependencias cíclicas en `useEffect` / `loadTenantData` / `applyFlowToCanvas` que reseteaba continuamente el estado `nodes` con los datos del servidor. Se estabilizaron las referencias con `useRef`, se corrigieron las dependencias y se sincronizó el build en producción.

## Archivos relevantes
- `frontend/src/App.tsx`: Eliminación del bucle infinito de recarga, estabilización de `applyFlowToCanvas` y `loadTenantData`, y guardado reactivo de borradores.
- `frontend/src/components/FlowCanvas.tsx`: Limpieza de imports no utilizados.
- `frontend/src/components/nodes/StartNode.tsx` e `index.css`: Ajuste de CSS transition para evitar transiciones de arrastre indeseadas.

## Siguiente paso
Verificación por parte del usuario en el navegador.
