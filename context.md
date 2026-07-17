# Wallit — Context & Roadmap

App móvil (React Native + Expo) para administrar finanzas personales y del hogar:
registrar gastos, ingresos, ahorros e inversiones; organizarlos por grupos independientes
(familia, viaje, trabajo) y recibir recordatorios inteligentes. Apunta al mercado argentino (ARS).

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React Native + Expo SDK 54 + Expo Router (file-based) |
| Backend / DB | Supabase (PostgreSQL + Auth + Realtime + RLS) |
| Estado global | Zustand (`authStore`, `grupoStore`) |
| IA | Groq — Whisper (audio), llama-3.3-70b (texto), llama-4-scout (visión) |
| Notificaciones | expo-notifications + Supabase Edge Functions (cron) |

---

## Lo que está hecho

### Fase 1 — Cimientos ✅
- Proyecto Expo SDK 54 con Expo Router
- Supabase client con AsyncStorage para sesión persistente
- Google Sign-In (OAuth via expo-web-browser)
- Zustand stores
- Guard de rutas + upsert de usuario al autenticar

### Fase 2 — Base de datos ✅
- Tablas: `users`, `groups`, `group_members`, `expenses`, `budgets`, `expense_splits`
- RLS policies funcionando
- Fix `(select auth.uid())` para evitar recursión infinita en group_members

### Fase 3 — Dashboard y carga de gastos ✅
- Dashboard con total del mes, barras por categoría, últimos gastos
- Nuevo gasto con 3 métodos IA: foto de ticket, voz, texto libre
- ModalGasto: ver, editar y eliminar
- SelectorFecha nativo (iOS/Android)
- useFocusEffect para refrescar y limpiar al cambiar tab

### Fase 4 — Grupos ✅ (base reemplazada en Fase 5)
- Crear grupo / unirse con código
- Compartir código via Share API
- Realtime: actualización automática entre miembros
- Badge "👥 Compartido" en el Dashboard

### Fase 5 — Multi-grupo ✅
- `obtenerMisGrupos`: carga todos los grupos del usuario (sin límite)
- `grupoStore` rediseñado: `{ grupos[], grupoActivo, rolEnGrupo }`
- `useGrupo`: carga todos los grupos, expone `cambiarGrupoActivo()`
- Tab Grupo: selector horizontal de grupos + botón "+ Nuevo"
- "Nuevo movimiento": selector de destino Personal / Grupo X (pill horizontal)
- Toggle Privado oculto cuando destino es Personal
- Navegación por mes en Dashboard y en tab Grupo (`periodoOffset`)
- `salirDeGrupo` y `cerrarGrupo` (admin only) con confirmación
- Migración de gastos huérfanos al crear/unirse a un grupo
- Fixes RLS: `buscar_grupo_por_codigo` y `obtener_miembros_grupo` como security definer functions
- `group_id` en `expenses` pasó a nullable para soportar gastos personales
- KeyboardAvoidingView en modal de crear/unirse

### Fase 6 — Movimientos financieros completos ✅
- Columnas `tipo` y `fuente` en tabla `expenses`
  - `tipo`: `'gasto' | 'ingreso' | 'ahorro' | 'inversion'` (DEFAULT 'gasto')
  - `fuente`: `'sueldo' | 'freelance' | 'alquiler' | 'otro'` (solo para ingresos)
- Tipos TypeScript: `TipoMovimiento`, `FuenteIngreso` en `database.ts`
- "Nuevo movimiento" con selector de 4 tipos (Gasto / Ingreso / Ahorro / Inversión)
  - Formulario adaptativo: categorías solo para gastos, fuente solo para ingresos
  - Botón de guardar cambia de texto según tipo
- IA detecta tipo y fuente automáticamente (texto, voz, foto)
- Dashboard rediseñado:
  - Grid 2×2: Ingresos | Gastos / Ahorros | Inversiones
  - Fórmula: `Disponible = Ingresos − Gastos − Ahorros − Inversiones`
  - Tasa de ahorro = (Ahorros + Inversiones) / Ingresos × 100
  - Sin ingresos: muestra "Lo que gastaste" en grande
- `TarjetaGasto` actualizada: 💰 verde (ingreso), 🏦 azul (ahorro), 📈 ámbar (inversión)
- `ModalGasto` adaptado: sin categoría para no-gastos, selector de fuente para ingresos (detalle y edición)
- Historial filtrable por tipo en Dashboard y en tab Grupo
  - Chips: Todos / Gastos / Ingresos / Ahorros / Inversiones

---

## Roadmap

### Fase 7 — Notificaciones push ✅
- `expo-notifications` ya estaba en el proyecto (SDK 54)
- `lib/notificaciones.ts`: `registrarPushToken()` + `configurarHandlerForeground()`
- `useSession.ts`: registra token tras cada login
- `app/_layout.tsx`: activa handler de foreground al arrancar
- Columnas en `users`: `push_token`, `notif_config jsonb`, `notif_enviadas jsonb`
- Migración: `supabase/migrations/004_notificaciones.sql`
- Edge Function Deno: `supabase/functions/enviar-notificaciones/index.ts`
- Pantalla Perfil rediseñada: avatar, 5 toggles de notificaciones, botón activar
- Cron `pg_cron`: `0 12 * * *` (9am Argentina) — setup manual en Supabase dashboard
- `notif_enviadas` evita duplicados: clave por tipo+mes o por tipo+fecha

**Triggers planificados:**

| Trigger | Cuándo | Mensaje |
|---|---|---|
| Sin actividad | 3 días sin cargar nada | "Hace 3 días que no registrás gastos. ¿Seguís al día?" |
| Sin actividad prolongada | 7 días sin actividad | "Tu resumen del mes puede estar incompleto." |
| Inicio de mes | Día 2 de cada mes | "Empezó julio. ¿Ya cargaste tu sueldo?" |
| Cierre de mes | Día 28 de cada mes | "Quedan 3 días para cerrar el mes." |
| Presupuesto al 80% | Cuando se supera | "Supermercado al 83% del presupuesto. Quedan $25.000." |
| Gasto grande en grupo | Gasto > $X en grupo | "Juan cargó $85.000 en Casa García." |
| Balance negativo | Gastos > Ingresos | "Este mes los gastos superaron los ingresos en $12.000." |
| Racha positiva | 7 días seguidos cargando | "¡7 días seguidos registrando! Seguí así 💪" |

### Fase 8 — Perfil completo 🔜 (próxima)
- [ ] Avatar y nombre editables
- [ ] Selector de moneda
- [ ] Configuración de notificaciones
- [ ] Exportar mes a PDF/CSV

### Fase 9 — Presupuestos y análisis
- [ ] Crear presupuesto mensual por categoría
- [ ] Barra de progreso en Dashboard
- [ ] Gráfico de evolución mensual (últimos 6 meses)
- [ ] Comparativa mes vs. mes anterior
- [ ] Ajuste por inflación (índice INDEC)

### Fase 10 — Funciones avanzadas de grupo
- [ ] Splits: dividir un gasto entre miembros
- [ ] Balance de deudas entre miembros ("Juan te debe $3.200")
- [ ] Notificación cuando un miembro carga gasto grande
- [ ] Multi-moneda dentro de un grupo (viajes al exterior)

---

## Estructura de archivos

```
wallit/
├── app/
│   ├── _layout.tsx              # Guard de rutas + InicializadorGrupo
│   ├── (auth)/login.tsx         # Google Sign-In
│   └── (tabs)/
│       ├── _layout.tsx          # Tab bar (Inicio / Agregar / Grupo / Perfil)
│       ├── index.tsx            # Dashboard: grid 2×2 + historial filtrable
│       ├── nuevo.tsx            # Nuevo movimiento (4 tipos + IA)
│       ├── grupo.tsx            # Multi-grupo + historial filtrable
│       └── perfil.tsx           # Perfil mínimo
├── components/ui/
│   ├── TarjetaGasto.tsx         # Tarjeta adaptativa por tipo de movimiento
│   ├── ModalGasto.tsx           # Detalle, edición (con fuente) y eliminación
│   ├── SelectorFecha.tsx        # Date picker nativo
│   └── BarraCategoria.tsx       # Barra de progreso por categoría
├── hooks/
│   ├── useSession.ts            # Auth + upsert usuario
│   ├── useGastos.ts             # Movimientos + totales por tipo + Realtime
│   └── useGrupo.ts              # Todos los grupos + cambiarGrupoActivo
├── lib/
│   ├── supabase.ts
│   ├── ia.ts                    # Groq: detecta tipo, fuente, categoría, monto
│   ├── gastos.ts                # calcularRangoDeMes, formatearPeso, colores
│   └── grupos.ts                # CRUD grupos, security definer RPC calls
├── store/
│   ├── authStore.ts             # { usuario }
│   └── grupoStore.ts            # { grupos[], grupoActivo, rolEnGrupo }
└── supabase/
    └── schema.sql
```

---

## Decisiones técnicas

| Decisión | Motivo |
|---|---|
| Groq para toda la IA | Gemini tenía cuota (429). Groq: Whisper + visión + texto en un solo proveedor. |
| `EXPO_PUBLIC_` en API keys | Expo no expone env vars al cliente sin ese prefijo. |
| `(select auth.uid())` en RLS | `auth.uid()` directo causaba recursión infinita en group_members. |
| Insert sin `.select()` en crearGrupo | La policy de SELECT bloqueaba antes de que el creador fuera miembro. |
| `useFocusEffect` en tabs | Recarga datos al volver al tab sin estado global complejo. |
| Expo SDK 54 (no 57) | Expo Go en físicos no soportaba SDK 57. |
| Extender `expenses` con `tipo` (vs tabla nueva) | Evita migración compleja y mantiene el Realtime existente. |
| Multi-grupo sin cambio de RLS | Las policies ya filtran por `group_id`; el cambio fue solo en UI/store. |
| `security definer` functions para RLS | Buscar grupo por código e listar miembros requieren bypass de RLS (usuario no es miembro aún). |
| `group_id` nullable en expenses | Gastos personales (sin grupo) no tienen group_id. |
| `inversion` como 4° tipo (no solo 3) | Ahorros = liquidez preservada; inversiones = crecimiento/menor liquidez. Ambos restan del disponible. |
| `Disponible = Ingresos − Gastos − Ahorros − Inversiones` | Ahorros e inversiones salen de la cuenta disponible aunque no se "gasten". |
