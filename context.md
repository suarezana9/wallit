# Wallit — Context & Roadmap

App móvil (React Native + Expo) para administrar finanzas personales y del hogar:
registrar gastos, ingresos, ahorros e inversiones; organizarlos por grupos independientes
(familia, viaje, trabajo) y recibir recordatorios inteligentes.
Diseñada para múltiples mercados: detecta moneda e idioma por geolocalización del dispositivo,
con soporte inicial para Argentina (ARS/es-AR), México (MXN/es-MX), España (EUR/es-ES) y
Estados Unidos (USD/en-US).

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React Native + Expo SDK 54 + Expo Router (file-based) |
| Internacionalización | i18n-js + expo-localization (locale, currency por geo) |
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
- Pantalla Perfil: avatar con inicial, nombre editable inline, stats de grupos y movimientos
- Pantalla Perfil: links a Notificaciones y Categorías (rutas `/notificaciones`, `/categorias`)
- Migración `007_admin_push_token.sql`: columna `push_token` en tabla admin
- Edge Function `supabase/functions/notificar-grupo/`: notificaciones de gasto grande en grupo (`010_triggers_notif_grupo.sql`)
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

### Fase 8 — Perfil completo ✅ (parcial)
- [x] Avatar con inicial y nombre editable inline
- [x] Stats del mes (movimientos + cantidad de grupos)
- [x] Pantalla Perfil con sección Ajustes (links a Notificaciones y Categorías) y sección Cuenta
- [x] Migración de categorías personalizadas: `supabase/migrations/005_categorias.sql`
- [x] Pantalla `/notificaciones` — 8 toggles con tema claro/oscuro, badge de activación, guarda en `notif_config`
- [x] Pantalla `/categorias` (activar/ocultar/crear categorías)
- [ ] Exportar mes a PDF/CSV

### Fase 9 — Presupuestos y análisis ✅ (parcial)
- [x] Presupuestos con nombre que agrupan múltiples categorías (tab 🎯 "Límites")
- [x] Formulario: nombre + límite + selector de categorías (multi-select chips, modal)
- [x] Edición y eliminación de presupuestos
- [x] Sección "Presupuestos" en el dashboard: barra de progreso por presupuesto, alerta al 80% (amarillo) y superado (rojo)
- [x] Soporte personal + grupo (migración 008 + 009)
- **Modelo:** `budgets(id, name, amount_limit, month, categories text[], group_id?, user_id?)`. Un presupuesto agrupa N categorías; el gasto actual se calcula sumando los expenses de esas categorías.
- [x] Gráfico de evolución mensual (últimos 6 meses)
- [x] Comparativa mes vs. mes anterior (pill ▲/▼ % en tarjeta hero del Dashboard)
- [ ] Ajuste por inflación (índice INDEC)

### Fase 8a — Dark mode completo
El sistema de temas ya existe (`useTheme()` en `constants/theme.ts`, `LightTheme` y `DarkTheme` definidos,
responde a `useColorScheme()` del SO automáticamente). Lo pendiente es:

- [x] `store/preferencesStore.ts` — `tema: 'system' | 'light' | 'dark'` persistido en AsyncStorage
- [x] `constants/theme.ts` — agrega `isDark`, `tipoIngreso`, `tipoAhorro`, `tipoInversion`; `useTheme()` respeta preferencia manual
- [x] Toggle manual en Perfil: fila "Apariencia" con selector inline Sistema / Claro / Oscuro
- [x] `categorias.tsx` — reescrito completo con `useTheme()`
- [x] `nuevo.tsx`, `ModalGasto.tsx`, `TarjetaGasto.tsx` — reemplazado hack `t.bg === '#0C0B18'` por `t.isDark` y colores semánticos del tema
- [x] `_layout.tsx` — shadowColor usa `t.isDark`
- [x] `index.tsx` — FAB_ITEMS usa `t.primary`, `t.tipoIngreso`, `t.tipoAhorro`, `t.tipoInversion`

---

### Fase 8b — Modal de nuevo movimiento (UX core)
El tab `+` deja de ser una pantalla separada y pasa a ser un BottomSheet modal, liberando
espacio en la tab bar para futuras secciones (Actividad, Consejero).

- [ ] **BottomSheet**: usar `@gorhom/bottom-sheet` — se abre al tocar `+` en la tab bar
- [ ] **2 pasos en el modal**:
  - Paso 1 (visible al abrir): monto en grande con teclado calculadora (`TecladoCalculadora.tsx`
    ya existe) + selector de tipo (Gasto / Ingreso / Ahorro / Inversión)
  - Paso 2 (al deslizar arriba o tocar "Continuar"): descripción, categoría, fecha, grupo/personal
- [ ] **IA desde el modal**: los 3 botones (foto, voz, texto) siguen disponibles; al detectar datos
      los inyectan en el formulario y van directo al Paso 2 para confirmar
- [ ] **Tab bar**: `nuevo.tsx` desaparece como tab. La barra queda Inicio · Grupos · Límites · Perfil
      (el `+` central abre el modal, no navega)
- [ ] **Archivo**: el formulario se mueve a `components/ui/ModalNuevoMovimiento.tsx`; `nuevo.tsx`
      se elimina

---

### Fase 8c — Invitación a grupos mejorada (UX core)
Reemplaza el flujo actual de "copiar código + pegar en app" por un sistema de un solo toque.

- [ ] **Deep link con código embebido**: `wallit://grupo/unirse?codigo=ABC123` — al tocarlo en el
      celular abre la app directo en modal de confirmación "¿Unirte a [nombre del grupo]?"
- [ ] **Link web compartible**: `https://wallit.app/join/ABC123` — redirige al deep link con
      fallback a la App Store/Play Store si no tiene la app. Más amigable por WhatsApp / email
- [ ] **QR code**: en la pantalla del grupo aparece un QR generado con `react-native-qrcode-svg`;
      el invitado lo escanea con la cámara del celular o desde dentro de la app
- [ ] **Configuración**: esquema `wallit://` en `app.json` + `expo-linking` para capturar el deep
      link al arrancar la app
- [ ] El flow manual "ingresar código" se mantiene como opción secundaria (accesible pero no principal)

**Archivos:**
| Archivo | Qué hace |
|---|---|
| `app/join/[codigo].tsx` | Ruta web del link compartible (redirect a deep link) |
| `components/ui/ModalConfirmarGrupo.tsx` | Modal "¿Unirte a X?" que aparece al abrir el deep link |
| `components/ui/QRGrupo.tsx` | QR generado con `react-native-qrcode-svg` |

---

### Fase 10 — Internacionalización (i18n) y moneda ✅
- [x] **Detección automática por región**: usa `regionCode` de `expo-localization` (independiente del idioma del dispositivo) para derivar moneda por defecto al primer arranque
- [x] **Soporte de monedas**: lista curada de 20 monedas (LATAM + Europa + Asia) con búsqueda en `constants/monedas.ts`. *Segunda parte pendiente: lista completa ISO 4217.*
- [x] **Soporte de idiomas**: español (es) e inglés (en). Archivos en `constants/i18n/es.ts` y `constants/i18n/en.ts`, interface `Traducciones` type-safe
- [x] **Store de preferencias**: `preferencesStore.ts` — `moneda`, `idioma` persistidos en AsyncStorage; detección automática al primer arranque
- [x] **Selector en Perfil**: fila "💱 Moneda" (modal con buscador) y fila "🌐 Idioma" (selector inline), cambio en tiempo real
- [x] **`formatearMoneda(monto, moneda)`** en `constants/monedas.ts`; hook `useMoneda()` con `formatear()`; todos los componentes migrados desde `formatearPeso()`
- [x] **IA multilingüe**: prompts de `parsearTexto`, `parsearImagen` y `transcribirAudio` en `lib/ia.ts` adaptados al idioma del usuario; categorías siempre devueltas en español (nombres de DB)
- [ ] **Migración pendiente**: `011_user_preferences.sql` — columnas `currency` y `locale` en tabla `users` para sincronizar preferencias al backend

### Fase 11 — Consejero IA (Etapa 1: base) 🔜
Tarjeta compacta en el Dashboard (debajo del grid 2×2) con semáforo de salud financiera
y la recomendación más importante del mes. Un tap abre la pantalla completa del Consejero.

**Pantalla completa `/consejero`:**
- Semáforo de salud financiera (verde / amarillo / rojo) + frase explicativa
- Lista de tarjetas de recomendación, cada una con: icono + título + descripción + impacto estimado

**Tipos de tarjeta de recomendación:**
| Tipo | Ejemplo |
|---|---|
| 💰 Reducir gasto | "Gastaste $28.000 en Delivery. Cocinando 3 veces más ahorrarías ~$15.000." |
| 📉 Gasto no esencial | "Tenés 4 suscripciones por $12.000. ¿Usás todas?" |
| 🏦 Meta de ahorro | "Con tu ingreso actual, ahorrar el 10% son $X/mes. Llevas el 3%." |
| 📈 Sugerencia de inversión | "Tenés $50.000 parados. Un plazo fijo a 30 días rinde ~X% TNA hoy." (educativa, sin datos en tiempo real) |
| ⚠️ Alerta | "Tus gastos superan tus ingresos 2 meses seguidos." |

**Cómo funciona (Etapa 1):**
- Al abrir la pantalla se traen los últimos 3 meses de `expenses` + `budgets` de Supabase
- Se construye un resumen (totales por categoría, tasa de ahorro, comparativas mes a mes)
- Groq `llama-3.3-70b` recibe el resumen + instrucciones y devuelve `{ salud, recomendaciones[], alertas[] }`
- Skeleton mientras carga; botón "Actualizar análisis" para forzar recálculo
- Las sugerencias de inversión son **educativas y generales** — disclaimer visible ("Esto no es asesoramiento financiero profesional")

**Archivos nuevos (Etapa 1):**
| Archivo | Qué hace |
|---|---|
| `app/consejero.tsx` | Pantalla completa (stack, no tab) |
| `lib/consejero.ts` | Prompt builder + llamada Groq + parseo JSON |
| `hooks/useConsejero.ts` | Fetch de Supabase + llamada a `lib/consejero.ts` |
| `components/ui/TarjetaRecomendacion.tsx` | Tarjeta visual por tipo |
| `components/ui/SemáforoSalud.tsx` | Widget compacto para el Dashboard |

**Migración (Etapa 1):** ninguna — todo se calcula on-demand desde `expenses` y `budgets`.

---

### Fase 12 — Consejero IA (Etapa 2: historial + APIs reales)
- [ ] **Guardar historial de análisis**: nueva tabla `ai_insights(id, user_id, generated_at, salud, recomendaciones jsonb)`
      — Migración `012_ai_insights.sql`
- [ ] **Pantalla historial**: scroll de análisis pasados con fecha; ver las recomendaciones de cada mes
- [ ] **API de tasas en tiempo real** (Argentina): consumir `https://api.estadisticasbcra.com/` para tasas
      de plazo fijo TNA, dólar oficial, inflación mensual. Almacenar snapshot diario en tabla `market_rates`
- [ ] **API INDEC para inflación**: ajustar comparativas de gastos por IPC (ej. "gastaste 8% menos en
      términos reales respecto al mes pasado")
- [ ] **Recomendaciones de inversión con datos reales**: plazo fijo vs. FCI vs. CEDEARs con rendimiento
      actual; datos de `market_rates` en el prompt de Groq
- [ ] **Objetivos de ahorro**: el usuario define metas (`saving_goals` table); el Consejero proyecta si
      va en camino y sugiere ajustes mensuales
- [ ] **Recomendaciones push**: si el Consejero detecta una alerta crítica (ej. gastos > ingresos 2 meses
      seguidos), dispara notificación push via Edge Function existente
- [ ] **Personalización del Consejero**: el usuario puede indicar perfil de riesgo (conservador /
      moderado / agresivo) en Perfil; el prompt se adapta al perfil

**Archivos adicionales (Etapa 2):**
| Archivo | Qué hace |
|---|---|
| `supabase/migrations/012_ai_insights.sql` | Tabla `ai_insights` y `market_rates` |
| `supabase/migrations/013_saving_goals.sql` | Tabla `saving_goals` |
| `supabase/functions/fetch-market-rates/` | Edge Function cron diaria que cachea tasas de APIs externas |
| `lib/marketRates.ts` | Cliente para leer `market_rates` desde Supabase |
| `hooks/useSavingGoals.ts` | CRUD de objetivos de ahorro |
| `app/objetivos.tsx` | Pantalla de objetivos (accesible desde el Consejero) |

---

### Fase 13 — Funciones avanzadas de grupo
- [ ] Splits: dividir un gasto entre miembros
- [ ] Balance de deudas entre miembros ("Juan te debe $3.200")
- [ ] Notificación cuando un miembro carga gasto grande (base ya lista con `010_triggers_notif_grupo.sql`)
- [ ] Multi-moneda dentro de un grupo (viajes al exterior)

---

### Fase 14 — Billeteras múltiples
Permite al usuario separar su dinero en cuentas independientes: efectivo, cuenta bancaria, tarjeta de crédito, cuenta de inversión. Cada movimiento queda asociado a una billetera.

- [ ] **Migración `014_wallets.sql`**: tabla `wallets(id, user_id, name, type, currency, color, balance_initial, archived_at)`.
      Tipos: `efectivo | banco | tarjeta | inversion`. `balance_initial` es el saldo al crear la billetera.
- [ ] **Columna `wallet_id`** en `expenses` (nullable para no romper datos existentes); billetera por defecto = "Efectivo personal"
- [ ] **Selector de billetera** en el formulario "Nuevo movimiento" (pill horizontal igual al selector de grupo/personal)
- [ ] **Tarjeta de saldo** por billetera en el Dashboard: lista horizontal scrolleable, cada tarjeta muestra nombre, tipo (ícono), saldo calculado
- [ ] **Transferencias entre billeteras**: nuevo tipo de movimiento `'transferencia'` — descuenta de origen y acredita en destino como par de registros vinculados (`transfer_pair_id uuid`)
- [ ] **Pantalla Billeteras**: CRUD completo — crear, editar nombre/color, archivar. Saldo actual = `balance_initial + Σ ingresos − Σ gastos` de esa billetera

**Archivos:**
| Archivo | Qué hace |
|---|---|
| `supabase/migrations/014_wallets.sql` | Tabla `wallets`, columna `wallet_id` en `expenses` |
| `hooks/useWallets.ts` | CRUD billeteras + saldo calculado en tiempo real |
| `app/billeteras.tsx` | Pantalla de gestión de billeteras |
| `components/ui/TarjetaBilletera.tsx` | Card con nombre, tipo, saldo y color |

---

### Fase 15 — Feed de actividades y educación financiera
Tab o sección "Actividad" con contenido tipo timeline que combina eventos propios del usuario
con contenido educativo generado por IA adaptado a su situación real.

- [ ] **Feed cronológico**: tarjetas fechadas que mezclan eventos reales (primer gasto del mes, presupuesto superado, racha positiva) con artículos cortos
- [ ] **Fondo de emergencia**: calculadora que toma el promedio de gastos fijos de los últimos 3 meses y muestra cuánto debería tener ahorrado (3-6 meses) y qué % lleva
- [ ] **Regla 50-30-20**: análisis automático aplicado a los datos reales del usuario — 50% necesidades, 30% deseos, 20% ahorro/inversión. Muestra semáforo por bloque
- [ ] **Artículos cortos**: 3-5 tarjetas de contenido educativo estático (en español), rotadas mensualmente. Temas: inflación, inversión, deudas, hábitos de ahorro
- [ ] **Logros y rachas**: badge al completar 7 días seguidos registrando, primer mes con tasa de ahorro positiva, etc.

**Archivos:**
| Archivo | Qué hace |
|---|---|
| `app/(tabs)/actividad.tsx` | Tab "Actividad" — feed cronológico |
| `components/ui/TarjetaActividad.tsx` | Tarjeta genérica para eventos y artículos |
| `lib/educacion.ts` | Contenido estático de artículos + cálculo 50-30-20 + fondo de emergencia |
| `hooks/useActividad.ts` | Combina eventos reales de Supabase con contenido educativo |

---

### Fase 16 — Modelo freemium + RevenueCat

**Filosofía de monetización:**
- El **plan gratuito** ya supera a la competencia en lo cotidiano (IA gratis, grupos gratis, presupuestos gratis)
- El **plan Pro** cobra por análisis avanzado, historial largo y conexión bancaria — cosas que requieren infraestructura real

**Plan Gratuito (siempre):**
- IA para carga ilimitada (foto, voz, texto)
- 1 billetera personal
- Grupos sin límite de miembros
- Presupuestos básicos
- Notificaciones inteligentes
- Dashboard + historial 3 meses
- Consejero IA: 1 análisis por mes

**Plan Wallit Pro (~US$ 2,99/mes · US$ 24,99/año · trial 7 días):**
- Historial ilimitado (sin corte de 3 meses)
- Billeteras ilimitadas (banco, tarjeta, inversión)
- Consejero IA ilimitado + historial de análisis
- Objetivos de ahorro con proyección
- Recomendaciones de inversión con datos reales
- Exportar PDF/CSV
- Gráficos avanzados (donut, evolución 12 meses)
- Splits y balance de deudas en grupos
- Conexión bancaria (cuando esté disponible)

**Implementación técnica:**
- [ ] **RevenueCat SDK** (`react-native-purchases`) — maneja compras iOS y Android, webhooks a Supabase
- [ ] **Migración `015_subscriptions.sql`**: tabla `subscriptions(user_id, plan, status, expires_at, rc_customer_id)`; actualizada por webhook de RevenueCat
- [ ] **`subscriptionStore.ts`**: Zustand store `{ plan: 'free' | 'pro', isLoading }` — fuente de verdad para feature flags
- [ ] **`usePaywall.ts`**: hook que verifica el plan y abre el paywall si el usuario intenta acceder a una feature Pro
- [ ] **Paywall nativo**: pantalla con comparativa free vs. pro, trial toggle, botones de compra via RevenueCat
- [ ] **Feature flags en toda la app**: cada feature Pro llama a `usePaywall()` — si es free, muestra banner "Wallit Pro" con CTA
- [ ] **RLS server-side**: las queries que sirven más de 3 meses de historial validan `subscriptions.status = 'active'` en la Edge Function

**Archivos:**
| Archivo | Qué hace |
|---|---|
| `supabase/migrations/015_subscriptions.sql` | Tabla `subscriptions` |
| `supabase/functions/revenuecat-webhook/` | Edge Function que recibe eventos de RevenueCat y actualiza `subscriptions` |
| `store/subscriptionStore.ts` | Plan activo del usuario |
| `hooks/usePaywall.ts` | Verificar plan + abrir paywall |
| `app/paywall.tsx` | Pantalla de suscripción con RevenueCat |
| `components/ui/BannerPro.tsx` | Banner de upgrade para features bloqueadas |

---

### Fase 17 — Patrimonio neto
Vista consolidada de toda la riqueza del usuario: suma de billeteras activas menos deudas (tarjetas de crédito).

- [ ] **Widget "Mi patrimonio"** en Dashboard (debajo del grid 2×2): total activos, total deudas, patrimonio neto con delta vs. mes anterior
- [ ] **Pantalla `/patrimonio`**: desglose por billetera con saldo actual, gráfico de evolución mensual del patrimonio neto (12 meses)
- [ ] **Activos**: suma de saldos de billeteras tipo `efectivo`, `banco`, `inversion`
- [ ] **Pasivos**: suma de saldos negativos de billeteras tipo `tarjeta` (deuda de tarjeta de crédito)
- [ ] **Proyección**: a este ritmo de ahorro, ¿cuánto será el patrimonio en 6 meses?

*Requiere Fase 14 (billeteras múltiples) como prerequisito.*

---

### Fase 18 — Conexión bancaria *(largo plazo)*
Auto-importar transacciones desde cuentas bancarias reales. Mayor diferenciador del plan Pro.

- [ ] **Belvo** (LATAM: Argentina, México, Brasil) — API open banking para leer movimientos bancarios
- [ ] **Plaid** (USA, si se expande el mercado)
- [ ] **Salt Edge** (Europa/España)
- [ ] Flujo de conexión: botón "Conectar banco" → WebView con OAuth del banco → Belvo devuelve transacciones → IA las categoriza automáticamente con Groq
- [ ] Deduplicación: si el usuario ya cargó manualmente una transacción que también viene del banco, detectar duplicados por monto + fecha + descripción aproximada
- [ ] Sincronización automática diaria via Edge Function cron

*Requiere Fase 14 (billeteras) y Fase 16 (Pro) como prerequisitos.*

---

## Fases pendientes — orden de ejecución (simple → complejo)

| # | Tarea | Complejidad | Fase |
|---|---|---|---|
| ~~1~~ | ~~Pantalla `/notificaciones`~~ | ~~Baja~~ | ~~8~~ ✅ |
| ~~2~~ | ~~**Dark mode completo**~~ | ~~Baja~~ | ~~8a~~ ✅ |
| ~~3~~ | ~~Pantalla `/categorias` (activar/ocultar/crear categorías)~~ | ~~Baja-Media~~ | ~~8~~ ✅ |
| ~~4~~ | ~~**Modal nuevo movimiento** (BottomSheet 2 pasos, libera tab bar)~~ | ~~Media~~ | ~~8b~~ ✅ |
| ~~5~~ | ~~**Invitación a grupos por deep link + QR**~~ | ~~Media~~ | ~~8c~~ ✅ |
| ~~6~~ | ~~Gráfico evolución mensual (últimos 6 meses) en Presupuestos~~ | ~~Media~~ | ~~9~~ ✅ |
| ~~7~~ | ~~Comparativa mes vs. mes anterior en Dashboard~~ | ~~Media~~ | ~~9~~ ✅ |
| ~~8~~ | ~~**i18n + moneda + idioma**~~ | ~~Media~~ | ~~10~~ ✅ |
| 9 | **Consejero IA — Etapa 1** (tarjeta Dashboard + pantalla completa + Groq) | Media | 11 |
| 10 | Exportar mes a PDF/CSV | Media-Alta | 8 |
| 11 | **Billeteras múltiples + transferencias** | Media-Alta | 14 |
| 12 | **Feed de actividades** (50-30-20, fondo emergencia, logros) | Media-Alta | 15 |
| 13 | Ajuste por inflación INDEC | Alta | 9 |
| 14 | **Consejero IA — Etapa 2** (historial, APIs reales de tasas, objetivos) | Alta | 12 |
| 15 | **Modelo freemium + RevenueCat** (paywall, feature flags, webhooks) | Alta | 16 |
| 16 | Splits y balance de deudas en grupos | Alta | 13 |
| 17 | **Patrimonio neto** (requiere billeteras) | Alta | 17 |
| 18 | **Conexión bancaria** Belvo/Plaid (requiere billeteras + Pro) | Muy Alta | 18 |

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
│       ├── presupuesto.tsx      # Configurar límites por categoría
│       └── perfil.tsx           # Perfil mínimo
├── components/ui/
│   ├── TarjetaGasto.tsx         # Tarjeta adaptativa por tipo de movimiento
│   ├── ModalGasto.tsx           # Detalle, edición (con fuente) y eliminación
│   ├── SelectorFecha.tsx        # Date picker nativo
│   └── BarraCategoria.tsx       # Barra de progreso por categoría
├── hooks/
│   ├── useSession.ts            # Auth + upsert usuario
│   ├── useGastos.ts             # Movimientos + totales por tipo + Realtime
│   ├── useGrupo.ts              # Todos los grupos + cambiarGrupoActivo
│   └── usePresupuestos.ts       # Presupuestos del mes → limitesPorCategoria
├── lib/
│   ├── supabase.ts
│   ├── ia.ts                    # Groq: detecta tipo, fuente, categoría, monto
│   ├── gastos.ts                # calcularRangoDeMes, formatearPeso, colores
│   ├── grupos.ts                # CRUD grupos, security definer RPC calls
│   └── presupuestos.ts          # obtener/guardar/eliminar presupuestos (personal + grupo)
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
