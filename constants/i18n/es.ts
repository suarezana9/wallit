const es = {
  // Saludo
  bienDia: 'Buen día,',
  grupo: 'Grupo',
  personal: 'Personal',

  // Dashboard — grid
  ingresos: 'Ingresos',
  gastos: 'Gastos',
  ahorros: 'Ahorros',
  inversiones: 'Inversiones',
  gastosDelMes: 'Gastos del mes',
  disponible: 'Disponible',
  ahorro: 'Ahorro',

  // Dashboard — estados
  sinMovimientosMes: 'Sin movimientos este mes',
  sinMovimientosPeriodo: 'Sin movimientos en este período',
  primerMovimiento: 'Cargar primer movimiento',

  // Dashboard — comparativa
  vsMesAnterior: 'vs mes anterior',

  // Dashboard — secciones
  gastosPorCategoria: 'Gastos por categoría',
  presupuestos: 'Presupuestos',
  evolucionGastos: 'Evolución de gastos',
  ultimos6Meses: 'Últimos 6 meses',

  // Filtros historial
  todos: 'Todos',

  // Historial vacío
  sinGastosPeriodo: 'Sin gastos en este período.',
  sinIngresos: 'Sin ingresos registrados.',
  sinAhorros: 'Sin ahorros registrados.',
  sinInversiones: 'Sin inversiones registradas.',
  sinMovimientosMesActual: 'Todavía no cargaste movimientos este mes.',

  // Presupuestos — estado
  superado: 'Superado',
  disponibles: (monto: string) => `${monto} disponibles`,
  sobreLimite: (monto: string) => `${monto} sobre el límite`,
  dePresupuestados: (monto: string) => `de ${monto} presupuestados`,
  teQuedan: (monto: string) => `Te quedan ${monto}`,
  excedisteLimite: (monto: string) => `Excediste el límite en ${monto}`,

  // Grupos
  grupos: 'Grupos',
  misGrupos: 'Mis grupos',
  agregarGrupo: 'Agregar grupo',
  nuevoGrupo: 'Nuevo grupo',
  crearGrupo: 'Crear grupo',
  crearGrupoNuevo: '✨ Crear grupo nuevo',
  unirseGrupo: 'Unirse a un grupo',
  unirmeGrupo: 'Unirme al grupo',
  nombreGrupo: 'Nombre del grupo',
  codigoInvitacion: 'Código de invitación',
  tengoCodigoInvite: 'Tengo un código de invitación',
  sinGrupos: 'Todavía no tenés grupos.',
  compartirFinanzas: 'Compartí finanzas con tu familia, amigos o compañeros.',
  cambiarContextoAyuda: 'Cambiá de contexto desde la pantalla Inicio para ver las finanzas de cada grupo.',
  salirGrupo: 'Salir del grupo',
  cerrarGrupo: 'Cerrar grupo',
  miembro: 'miembro',
  miembros: 'miembros',
  admin: 'Admin',
  crear: 'Crear',
  unirse: 'Unirse',
  cancelar: 'Cancelar',
  volver: 'Volver',
  compartirCodigo: 'Compartir código',
  verQR: 'Ver QR',
  alertGastosAnteriores: 'Gastos anteriores',
  alertGastosAnterioresMsg: '¿Querés mover tus gastos personales anteriores a este grupo?',
  alertNoMover: 'No, dejarlos como están',
  alertSiMover: 'Sí, moverlos',
  alertSalirMsg: (nombre: string) => `¿Salir de "${nombre}"? Ya no podrás ver sus movimientos compartidos.`,
  alertSalir: 'Salir',
  alertCerrarMsg: (nombre: string) => `¿Cerrar "${nombre}" definitivamente? Todos los miembros perderán acceso.`,
  activo: 'Activo',
  vos: 'vos',
  movimientos: 'Movimientos',
  verGrupoEnInicio: 'Ver este grupo en Inicio',
  grupoSeleccionadoEnInicio: 'Este grupo está seleccionado en Inicio',

  // Perfil
  movimientosEsteMes: 'movimientos este mes',
  ajustes: '⚙️ Ajustes',
  cuenta: '⚙️ Cuenta',
  notificaciones: '🔔 Notificaciones',
  notificacionesDesc: 'Activar y configurar alertas',
  categorias: '🏷️ Categorías',
  categoriasDesc: 'Activá, ocultá o creá las tuyas',
  apariencia: 'Apariencia',
  moneda: '💱 Moneda',
  idioma: '🌐 Idioma',
  cambiarContrasena: 'Cambiar contraseña',
  cerrarSesion: 'Cerrar sesión',
  alertCerrarSesion: 'Cerrar sesión',
  alertCerrarSesionMsg: '¿Seguro que querés salir?',
  alertSalirCuenta: 'Salir',
  cuentaGoogle: 'G Cuenta de Google',
  buscarMoneda: 'Buscar moneda...',

  // Tema
  temaSystem: 'Sistema',
  temaLight: 'Claro',
  temaDark: 'Oscuro',

  // Idioma
  idiomaEspanol: 'Español',
  idiomaIngles: 'Inglés',

  // Nuevo movimiento
  gasto: 'Gasto',
  ingreso: 'Ingreso',
  guardar: 'Guardar',
  descripcion: 'Descripción',
  categoria: 'Categoría',
  fecha: 'Fecha',
  privado: 'Privado',
  seleccionarCategoria: 'Seleccioná una categoría',

  // General
  cargando: 'Cargando...',
  error: 'Ocurrió un error',
  aceptar: 'Aceptar',
  eliminar: 'Eliminar',
  editar: 'Editar',
  guardarCambios: 'Guardar cambios',
  buscar: 'Buscar...',
};

export default es;

export interface Traducciones {
  bienDia: string; grupo: string; personal: string;
  ingresos: string; gastos: string; ahorros: string; inversiones: string;
  gastosDelMes: string; disponible: string; ahorro: string;
  sinMovimientosMes: string; sinMovimientosPeriodo: string; primerMovimiento: string;
  vsMesAnterior: string;
  gastosPorCategoria: string; presupuestos: string; evolucionGastos: string; ultimos6Meses: string;
  todos: string;
  sinGastosPeriodo: string; sinIngresos: string; sinAhorros: string; sinInversiones: string; sinMovimientosMesActual: string;
  superado: string;
  disponibles: (monto: string) => string;
  sobreLimite: (monto: string) => string;
  dePresupuestados: (monto: string) => string;
  teQuedan: (monto: string) => string;
  excedisteLimite: (monto: string) => string;
  grupos: string; misGrupos: string; agregarGrupo: string; nuevoGrupo: string;
  crearGrupo: string; crearGrupoNuevo: string;
  unirseGrupo: string; unirmeGrupo: string;
  nombreGrupo: string; codigoInvitacion: string; tengoCodigoInvite: string;
  sinGrupos: string; compartirFinanzas: string; cambiarContextoAyuda: string;
  salirGrupo: string; cerrarGrupo: string;
  miembro: string; miembros: string; admin: string;
  crear: string; unirse: string; cancelar: string; volver: string;
  compartirCodigo: string; verQR: string;
  alertGastosAnteriores: string; alertGastosAnterioresMsg: string;
  alertNoMover: string; alertSiMover: string;
  alertSalirMsg: (nombre: string) => string; alertSalir: string;
  alertCerrarMsg: (nombre: string) => string;
  activo: string; vos: string; movimientos: string;
  verGrupoEnInicio: string; grupoSeleccionadoEnInicio: string;
  movimientosEsteMes: string; ajustes: string; cuenta: string;
  notificaciones: string; notificacionesDesc: string;
  categorias: string; categoriasDesc: string;
  apariencia: string; moneda: string; idioma: string;
  cambiarContrasena: string; cerrarSesion: string;
  alertCerrarSesion: string; alertCerrarSesionMsg: string; alertSalirCuenta: string;
  cuentaGoogle: string; buscarMoneda: string;
  temaSystem: string; temaLight: string; temaDark: string;
  idiomaEspanol: string; idiomaIngles: string;
  gasto: string; ingreso: string; guardar: string;
  descripcion: string; categoria: string; fecha: string; privado: string; seleccionarCategoria: string;
  cargando: string; error: string; aceptar: string; eliminar: string; editar: string; guardarCambios: string; buscar: string;
}
