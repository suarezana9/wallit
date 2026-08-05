import type { Traducciones } from './es';

const en: Traducciones = {
  // Greeting
  bienDia: 'Good morning,',
  grupo: 'Group',
  personal: 'Personal',

  // Dashboard — grid
  ingresos: 'Income',
  gastos: 'Expenses',
  ahorros: 'Savings',
  inversiones: 'Investments',
  gastosDelMes: 'Monthly expenses',
  disponible: 'Available',
  ahorro: 'Savings rate',

  // Dashboard — states
  sinMovimientosMes: 'No transactions this month',
  sinMovimientosPeriodo: 'No transactions in this period',
  primerMovimiento: 'Add first transaction',

  // Dashboard — comparison
  vsMesAnterior: 'vs last month',

  // Dashboard — sections
  gastosPorCategoria: 'Expenses by category',
  presupuestos: 'Budgets',
  evolucionGastos: 'Spending trends',
  ultimos6Meses: 'Last 6 months',

  // History filters
  todos: 'All',

  // Empty history
  sinGastosPeriodo: 'No expenses in this period.',
  sinIngresos: 'No income recorded.',
  sinAhorros: 'No savings recorded.',
  sinInversiones: 'No investments recorded.',
  sinMovimientosMesActual: 'No transactions recorded this month yet.',

  // Budgets — status
  superado: 'Exceeded',
  disponibles: (amount: string) => `${amount} remaining`,
  sobreLimite: (amount: string) => `${amount} over budget`,
  dePresupuestados: (amount: string) => `of ${amount} budgeted`,
  teQuedan: (amount: string) => `${amount} remaining`,
  excedisteLimite: (amount: string) => `You exceeded the limit by ${amount}`,

  // Groups
  grupos: 'Groups',
  misGrupos: 'My groups',
  agregarGrupo: 'Add group',
  nuevoGrupo: 'New group',
  crearGrupo: 'Create group',
  crearGrupoNuevo: '✨ Create new group',
  unirseGrupo: 'Join a group',
  unirmeGrupo: 'Join group',
  nombreGrupo: 'Group name',
  codigoInvitacion: 'Invite code',
  tengoCodigoInvite: 'I have an invite code',
  sinGrupos: "You don't have any groups yet.",
  compartirFinanzas: 'Share finances with your family, friends or colleagues.',
  cambiarContextoAyuda: 'Switch context from the Home screen to view each group\'s finances.',
  salirGrupo: 'Leave group',
  cerrarGrupo: 'Close group',
  miembro: 'member',
  miembros: 'members',
  admin: 'Admin',
  crear: 'Create',
  unirse: 'Join',
  cancelar: 'Cancel',
  volver: 'Back',
  compartirCodigo: 'Share code',
  verQR: 'View QR',
  alertGastosAnteriores: 'Previous expenses',
  alertGastosAnterioresMsg: 'Do you want to move your previous personal expenses to this group?',
  alertNoMover: 'No, keep them',
  alertSiMover: 'Yes, move them',
  alertSalirMsg: (nombre: string) => `Leave "${nombre}"? You'll no longer see its shared transactions.`,
  alertSalir: 'Leave',
  alertCerrarMsg: (nombre: string) => `Close "${nombre}" permanently? All members will lose access.`,
  activo: 'Active',
  vos: 'you',
  movimientos: 'Transactions',
  verGrupoEnInicio: 'View this group on Home',
  grupoSeleccionadoEnInicio: 'This group is selected on Home',

  // Profile
  movimientosEsteMes: 'transactions this month',
  ajustes: '⚙️ Settings',
  cuenta: '⚙️ Account',
  notificaciones: '🔔 Notifications',
  notificacionesDesc: 'Enable and configure alerts',
  categorias: '🏷️ Categories',
  categoriasDesc: 'Enable, hide or create your own',
  apariencia: 'Appearance',
  moneda: '💱 Currency',
  idioma: '🌐 Language',
  cambiarContrasena: 'Change password',
  cerrarSesion: 'Sign out',
  alertCerrarSesion: 'Sign out',
  alertCerrarSesionMsg: 'Are you sure you want to sign out?',
  alertSalirCuenta: 'Sign out',
  cuentaGoogle: 'G Google account',
  buscarMoneda: 'Search currency...',

  // Theme
  temaSystem: 'System',
  temaLight: 'Light',
  temaDark: 'Dark',

  // Language
  idiomaEspanol: 'Spanish',
  idiomaIngles: 'English',

  // New transaction
  gasto: 'Expense',
  ingreso: 'Income',
  guardar: 'Save',
  descripcion: 'Description',
  categoria: 'Category',
  fecha: 'Date',
  privado: 'Private',
  seleccionarCategoria: 'Select a category',

  // General
  cargando: 'Loading...',
  error: 'An error occurred',
  aceptar: 'OK',
  eliminar: 'Delete',
  editar: 'Edit',
  guardarCambios: 'Save changes',
  buscar: 'Search...',
};

export default en;
