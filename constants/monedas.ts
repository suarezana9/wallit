export type CodigoMoneda =
  | 'ARS' | 'MXN' | 'COP' | 'CLP' | 'PEN' | 'UYU' | 'BOB' | 'PYG' | 'VES'
  | 'BRL' | 'USD' | 'EUR' | 'GBP' | 'CHF' | 'CAD' | 'AUD'
  | 'JPY' | 'CNY' | 'INR' | 'KRW';

export interface InfoMoneda {
  codigo: CodigoMoneda;
  nombre: string;
  simbolo: string;
  locale: string;
}

export const MONEDAS: InfoMoneda[] = [
  // LATAM
  { codigo: 'ARS', nombre: 'Peso argentino',   simbolo: '$',   locale: 'es-AR' },
  { codigo: 'MXN', nombre: 'Peso mexicano',     simbolo: '$',   locale: 'es-MX' },
  { codigo: 'COP', nombre: 'Peso colombiano',   simbolo: '$',   locale: 'es-CO' },
  { codigo: 'CLP', nombre: 'Peso chileno',      simbolo: '$',   locale: 'es-CL' },
  { codigo: 'PEN', nombre: 'Sol peruano',       simbolo: 'S/',  locale: 'es-PE' },
  { codigo: 'UYU', nombre: 'Peso uruguayo',     simbolo: '$',   locale: 'es-UY' },
  { codigo: 'BOB', nombre: 'Boliviano',         simbolo: 'Bs',  locale: 'es-BO' },
  { codigo: 'PYG', nombre: 'Guaraní paraguayo', simbolo: '₲',   locale: 'es-PY' },
  { codigo: 'VES', nombre: 'Bolívar venezolano',simbolo: 'Bs.D',locale: 'es-VE' },
  { codigo: 'BRL', nombre: 'Real brasileño',    simbolo: 'R$',  locale: 'pt-BR' },
  // América del Norte
  { codigo: 'USD', nombre: 'Dólar estadounidense', simbolo: '$', locale: 'en-US' },
  { codigo: 'CAD', nombre: 'Dólar canadiense',     simbolo: '$', locale: 'en-CA' },
  // Europa
  { codigo: 'EUR', nombre: 'Euro',              simbolo: '€',  locale: 'es-ES' },
  { codigo: 'GBP', nombre: 'Libra esterlina',   simbolo: '£',  locale: 'en-GB' },
  { codigo: 'CHF', nombre: 'Franco suizo',      simbolo: 'Fr', locale: 'de-CH' },
  // Oceanía
  { codigo: 'AUD', nombre: 'Dólar australiano', simbolo: '$',  locale: 'en-AU' },
  // Asia
  { codigo: 'JPY', nombre: 'Yen japonés',       simbolo: '¥',  locale: 'ja-JP' },
  { codigo: 'CNY', nombre: 'Yuan chino',        simbolo: '¥',  locale: 'zh-CN' },
  { codigo: 'INR', nombre: 'Rupia india',       simbolo: '₹',  locale: 'hi-IN' },
  { codigo: 'KRW', nombre: 'Won surcoreano',    simbolo: '₩',  locale: 'ko-KR' },
];

export const MONEDA_POR_DEFECTO: CodigoMoneda = 'ARS';

// Mapa región ISO 3166-1 → moneda. Se usa regionCode del dispositivo (independiente del idioma).
const REGION_A_MONEDA: Record<string, CodigoMoneda> = {
  'AR': 'ARS', 'MX': 'MXN', 'CO': 'COP', 'CL': 'CLP',
  'PE': 'PEN', 'UY': 'UYU', 'BO': 'BOB', 'PY': 'PYG',
  'VE': 'VES', 'BR': 'BRL', 'US': 'USD', 'CA': 'CAD',
  'ES': 'EUR', 'FR': 'EUR', 'DE': 'EUR', 'IT': 'EUR',
  'PT': 'EUR', 'NL': 'EUR', 'BE': 'EUR', 'AT': 'EUR',
  'GB': 'GBP', 'CH': 'CHF', 'AU': 'AUD',
  'JP': 'JPY', 'CN': 'CNY', 'TW': 'CNY', 'IN': 'INR', 'KR': 'KRW',
};

/** Detecta moneda por código de región del dispositivo (ej. "AR", "MX"). */
export function detectarMonedaPorRegion(regionCode: string): CodigoMoneda {
  return REGION_A_MONEDA[regionCode.toUpperCase()] ?? MONEDA_POR_DEFECTO;
}

export function getInfoMoneda(codigo: CodigoMoneda): InfoMoneda {
  return MONEDAS.find((m) => m.codigo === codigo) ?? MONEDAS[0];
}

export function formatearMoneda(monto: number, codigo: CodigoMoneda = 'ARS'): string {
  const info = getInfoMoneda(codigo);
  return new Intl.NumberFormat(info.locale, {
    style: 'currency',
    currency: codigo,
    maximumFractionDigits: ['JPY', 'KRW', 'PYG', 'CLP'].includes(codigo) ? 0 : 0,
  }).format(monto);
}
