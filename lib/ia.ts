import type { Categoria, TipoMovimiento, FuenteIngreso } from '@/types/database';

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;

// Categorías en español — siempre así en la DB independientemente del idioma del usuario
const CATEGORIAS: Categoria[] = [
  'Supermercado', 'Servicios', 'Transporte', 'Salud', 'Educación',
  'Ocio', 'Restaurantes', 'Ropa', 'Tecnología', 'Hogar', 'Mascotas',
  'Viajes', 'Suscripciones', 'Deporte', 'Belleza', 'Auto', 'Farmacia',
  'Regalos', 'Delivery', 'Bar', 'Banco', 'Trabajo', 'Otros',
];

const FUENTES: FuenteIngreso[] = ['sueldo', 'freelance', 'alquiler', 'otro'];
const TIPOS_VALIDOS: TipoMovimiento[] = ['gasto', 'ingreso', 'ahorro', 'inversion'];

export interface MovimientoParsed {
  monto: number | null;
  descripcion: string;
  categoria: Categoria;
  fecha: string;
  tipo: TipoMovimiento;
  fuente: FuenteIngreso | null;
}

type Idioma = 'es' | 'en';

function buildPromptTexto(texto: string, idioma: Idioma, moneda: string): string {
  const hoy = new Date().toISOString().split('T')[0];

  if (idioma === 'en') {
    return `You are an assistant that extracts financial transaction data.
From the following text, extract: type, amount, short description, category, source (if applicable) and date.

Rules for type:
- "ingreso": received money, got paid, salary, income, freelance payment
- "ahorro": saved money, put in savings, emergency fund, deposited to savings account
- "inversion": invested, bought stocks, crypto, fixed term deposit, mutual fund, bonds
- "gasto": bought, paid, spent, went to, consumed (default if unclear)

Rules for source (only when type="ingreso"):
- "sueldo": salary, paycheck, got paid my salary
- "freelance": freelance, project, invoiced, got paid for work
- "alquiler": rent received, rental income
- "otro": any other income

Rules for amount:
- Decimal number in ${moneda}. Always use dot as decimal separator. Example: 3000.20
- "3000 with 20 cents" → 3000.20; "three thousand" → 3000

IMPORTANT — Categories (use EXACTLY these Spanish names, only for expenses):
${CATEGORIAS.join(', ')}.
For income and savings use category "Otros".
If no date is mentioned, use today: ${hoy}. Date ALWAYS in YYYY-MM-DD format.

Reply ONLY with valid JSON, no extra text:
{"tipo": "gasto", "monto": 3000.20, "descripcion": "groceries", "categoria": "Supermercado", "fuente": null, "fecha": "${hoy}"}

Text: "${texto}"`;
  }

  return `Sos un asistente que extrae datos de movimientos financieros.
Del siguiente texto, extraé: tipo, monto, descripción breve, categoría, fuente (si aplica) y fecha.

Reglas para el tipo:
- "ingreso": cobré, me pagaron, recibí plata, sueldo, transferencia recibida, facturé
- "ahorro": ahorré, deposité en caja de ahorro, puse en el colchón, guardé, fondo de emergencia
- "inversion": invertí, compré acciones, cripto, plazo fijo, fondo de inversión, CEDEARs, bonos
- "gasto": compré, pagué, gasté, fui a, consumí (default si no es claro)

Reglas para la fuente (solo cuando tipo="ingreso"):
- "sueldo": sueldo, salario, cobré mi sueldo, me pagaron el sueldo
- "freelance": freelance, proyecto, facturé, cobré un trabajo
- "alquiler": alquiler, renta que cobré
- "otro": cualquier otro ingreso

Reglas para el monto:
- Número decimal en ${moneda}. Siempre con punto decimal. Ejemplo: 3000.20
- "3000 con 20", "3000,20" → 3000.20; "tres mil veinte" → 3020

Categorías disponibles (solo para gastos): ${CATEGORIAS.join(', ')}.
Para ingresos y ahorros usá categoría "Otros".
Si no se menciona fecha, usá hoy: ${hoy}. La fecha SIEMPRE en formato YYYY-MM-DD.

Respondé SOLO con JSON válido, sin texto adicional:
{"tipo": "gasto", "monto": 3000.20, "descripcion": "pan y leche", "categoria": "Supermercado", "fuente": null, "fecha": "${hoy}"}

Texto: "${texto}"`;
}

function buildPromptImagen(idioma: Idioma, moneda: string): string {
  const hoy = new Date().toISOString().split('T')[0];

  if (idioma === 'en') {
    return `Analyze this image of a receipt, invoice or payment voucher.
Extract: transaction type, total amount (number with decimals if present), description, category, source (if applicable) and date.

Type:
- "ingreso": payment receipt, received transfer, salary slip
- "ahorro": savings deposit, transfer to savings, emergency fund
- "inversion": stock purchase, crypto, fixed term, CEDEAR, bond, fund
- "gasto": purchase receipts, service invoices, consumptions (default)

Source (only if type="ingreso"): "sueldo", "freelance", "alquiler", or "otro"

IMPORTANT — Categories (use EXACTLY these Spanish names, only for expenses):
${CATEGORIAS.join(', ')}.
For income/savings use category "Otros".
Amount in ${moneda}. If no date visible, use: ${hoy}. Date ALWAYS in YYYY-MM-DD format.

Reply ONLY with JSON: {"tipo": "gasto", "monto": 1500.50, "descripcion": "Supermarket", "categoria": "Supermercado", "fuente": null, "fecha": "${hoy}"}`;
  }

  return `Analizá esta imagen de un ticket, factura o comprobante.
Extraé: tipo de movimiento, monto total (número con decimales si los hay), descripción, categoría, fuente (si aplica) y fecha.

Tipo:
- "ingreso": comprobante de cobro, transferencia recibida, recibo de sueldo
- "ahorro": depósito en caja de ahorro, transferencia a ahorro, fondo de emergencia
- "inversion": comprobante de compra de acciones, cripto, plazo fijo, CEDEAR, bono, fondo
- "gasto": tickets de compra, facturas de servicios, consumos (default)

Fuente (solo si tipo="ingreso"): "sueldo", "freelance", "alquiler", o "otro"
Categorías (solo para gastos): ${CATEGORIAS.join(', ')}.
Para ingresos/ahorros usá categoría "Otros".
Monto en ${moneda}. Si no ves fecha, usá: ${hoy}. La fecha SIEMPRE en formato YYYY-MM-DD.

Respondé SOLO con JSON: {"tipo": "gasto", "monto": 1500.50, "descripcion": "Supermercado Dia", "categoria": "Supermercado", "fuente": null, "fecha": "${hoy}"}`;
}

function parsearRespuesta(rawText: string, fallbackDesc: string): MovimientoParsed {
  const hoy = new Date().toISOString().split('T')[0];
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Respuesta inesperada: ${rawText}`);
  const parsed = JSON.parse(jsonMatch[0]);
  const tipo: TipoMovimiento = TIPOS_VALIDOS.includes(parsed.tipo) ? parsed.tipo : 'gasto';
  return {
    monto: parsed.monto ?? null,
    descripcion: parsed.descripcion ?? fallbackDesc,
    categoria: CATEGORIAS.includes(parsed.categoria) ? parsed.categoria : 'Otros',
    fecha: parsed.fecha ?? hoy,
    tipo,
    fuente: tipo === 'ingreso' && FUENTES.includes(parsed.fuente) ? parsed.fuente : null,
  };
}

async function groqChat(prompt: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.1,
    }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Groq ${res.status}: ${errBody}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

export async function parsearTexto(
  texto: string,
  idioma: Idioma = 'es',
  moneda = 'ARS',
): Promise<MovimientoParsed> {
  const prompt = buildPromptTexto(texto, idioma, moneda);
  const rawText = await groqChat(prompt);
  return parsearRespuesta(rawText, texto);
}

export async function transcribirAudio(
  audioUri: string,
  idioma: Idioma = 'es',
): Promise<string> {
  const formData = new FormData();
  formData.append('file', {
    uri: audioUri,
    type: 'audio/wav',
    name: 'audio.wav',
  } as any);
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('language', idioma);

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    body: formData,
  });

  const data = await res.json();
  if (!data.text) throw new Error('No se pudo transcribir el audio');
  return data.text;
}

export async function parsearImagen(
  base64: string,
  idioma: Idioma = 'es',
  moneda = 'ARS',
): Promise<MovimientoParsed> {
  const prompt = buildPromptImagen(idioma, moneda);

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
          ],
        },
      ],
      max_tokens: 200,
      temperature: 0.1,
    }),
  });

  const data = await res.json();
  const rawText = data.choices?.[0]?.message?.content ?? '';
  return parsearRespuesta(rawText, 'Ticket');
}

export type { MovimientoParsed as GastoParsed };
