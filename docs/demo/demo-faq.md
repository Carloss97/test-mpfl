# KRUMM Demo FAQ

## 1. ¿KRUMM decide si una persona sirve o no para un cargo?

No. La demo produce evidencia agregada para revisión humana. No emite decisión automática ni reemplaza criterio profesional.

## 2. ¿Qué señales usa?

Usa desempeño en juegos y señales observacionales estimadas localmente: AUs/FACS, presencia facial, confianza de captura, mirada, postura facial/tronco proxy y hombros con MoveNet cuando están visibles.

## 3. ¿Qué pasa si una señal falla?

Se muestra como pendiente, caveat o error. La demo puede continuar si el objetivo es mostrar flujo, pero el reporte debe leerse con esa limitación. No se inventan hombros ni datos faltantes.

## 4. ¿Se guarda la cámara?

No en esta demo local. El diseño evita guardar video, frames, landmarks crudos y trayectorias de puntero. Los reportes usan agregados y métricas resumidas.

## 5. ¿Por qué hay modo demo rápida y evaluación estándar?

La demo rápida es para reuniones: conserva los mismos juegos y orden, pero acorta baseline, descansos, recovery y trials. La evaluación estándar mantiene mayor comparabilidad temporal.

## 6. ¿Las emociones o fatiga son verdades internas?

No. Deben tratarse como señales observacionales/proxies con confianza y caveats. Se usan para contextualizar la sesión, no para afirmar estados internos con certeza.

## 7. ¿Qué falta para piloto?

- Ensayos manuales en distintos dispositivos/navegadores.
- Sesión sintética de fallback.
- Protocolo de piloto.
- Revisión legal/privacy.
- Validación psicométrica y de usabilidad.
- Política de retención/deleción si se agrega backend.

## 8. ¿Qué hago si preguntan por precisión?

Respuesta sugerida:

> “Esta demo valida el flujo técnico y de privacidad. La precisión poblacional requiere un piloto con protocolo, datos reales, comparación contra criterios definidos y análisis de confiabilidad.”

## 9. ¿Qué hago si preguntan si puede usarse mañana en producción?

Respuesta sugerida:

> “Como demo local, muestra el flujo end-to-end. Para producción faltan piloto, hardening operativo, revisión legal/privacy, seguridad, monitoreo, protocolo de soporte y validación con usuarios reales.”
