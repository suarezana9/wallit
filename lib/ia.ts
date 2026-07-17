import type { Categoria, TipoMovimiento, FuenteIngreso } from '@/types/database';

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;

const CATEGORIAS: Categoria[] = [
  'Supermercado', 'Servicios', 'Transporte', 'Salud',
  'Educación', 'Ocio', 'Restaurantes', 'Ropa', 'Tecnología', 'Otros',
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

// Parsea texto libre con Groq Llama
export async function parsearTexto(texto: string): Promise<MovimientoParsed> {
  const hoy = new Date().toISOString().split('T')[0];
  const prompt = `Sos un asistente que extrae datos de movimientos financieros del hogar en Argentina.
Del siguiente texto, extraé: tipo, monto, descripción breve, categoría, fuente (si aplica) y fecha.

Reglas para el tipo:
- "ingreso": cobré, me pagaron, recibí plata, sueldo, transferencia recibida, facturé, cobré
- "ahorro": ahorré, deposité en caja de ahorro, puse en el colchón, guardé, fondo de emergencia
- "inversion": invertí, compré acciones, cripto, plazo fijo, fondo de inversión, CEDEARs, bonos
- "gasto": compré, pagué, gasté, fui a, consumí (default si no es claro)

Reglas para la fuente (solo cuando tipo="ingreso"):
- "sueldo": sueldo, salario, cobré mi sueldo, me pagaron el sueldo
- "freelance": freelance, proyecto, facturé, cobré un trabajo
- "alquiler": alquiler, renta que cobré
- "otro": cualquier otro ingreso

Reglas para el monto:
- Número decimal en pesos argentinos (puede tener centavos).
- "3000 con 20", "3000,20" → 3000.20; "tres mil veinte" → 3020
- Siempre con punto decimal. Ejemplo: 3000.20

Categorías disponibles (solo para gastos): ${CATEGORIAS.join(', ')}.
Para ingresos y ahorros usá categoría "Otros".
Si no se menciona fecha, usá hoy: ${hoy}.
La fecha SIEMPRE en formato YYYY-MM-DD.

Respondé SOLO con JSON válido, sin texto adicional:
{"tipo": "gasto", "monto": 3000.20, "descripcion": "pan y leche", "categoria": "Supermercado", "fuente": null, "fecha": "${hoy}"}

Texto: "${texto}"`;

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
  const rawText = data.choices?.[0]?.message?.content ?? '';
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Respuesta inesperada: ${rawText}`);

  const parsed = JSON.parse(jsonMatch[0]);
  const tipo: TipoMovimiento = TIPOS_VALIDOS.includes(parsed.tipo) ? parsed.tipo : 'gasto';
  return {
    monto: parsed.monto ?? null,
    descripcion: parsed.descripcion ?? texto,
    categoria: CATEGORIAS.includes(parsed.categoria) ? parsed.categoria : 'Otros',
    fecha: parsed.fecha ?? hoy,
    tipo,
    fuente: tipo === 'ingreso' && FUENTES.includes(parsed.fuente) ? parsed.fuente : null,
  };
}

// Transcribe audio con Groq Whisper
export async function transcribirAudio(audioUri: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', {
    uri: audioUri,
    type: 'audio/wav',
    name: 'audio.wav',
  } as any);
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('language', 'es');

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    body: formData,
  });

  const data = await res.json();
  if (!data.text) throw new Error('No se pudo transcribir el audio');
  return data.text;
}

// Extrae datos de imagen de factura/ticket con Groq Llama Vision
export async function parsearImagen(base64: string): Promise<MovimientoParsed> {
  const hoy = new Date().toISOString().split('T')[0];
  const prompt = `Analizá esta imagen de un ticket, factura o comprobante argentino.
Extraé: tipo de movimiento, monto total (número con decimales si los hay), descripción, categoría, fuente (si aplica) y fecha.

Tipo:
- "ingreso": comprobante de cobro, transferencia recibida, recibo de sueldo
- "ahorro": depósito en caja de ahorro, transferencia a ahorro, fondo de emergencia
- "inversion": comprobante de compra de acciones, cripto, plazo fijo, CEDEAR, bono, fondo
- "gasto": tickets de compra, facturas de servicios, consumos (default)

Fuente (solo si tipo="ingreso"): "sueldo", "freelance", "alquiler", o "otro"
Categorías (solo para gastos): ${CATEGORIAS.join(', ')}.
Para ingresos/ahorros usá categoría "Otros".
Si no ves fecha, usá: ${hoy}.
La fecha SIEMPRE en formato YYYY-MM-DD.

Respondé SOLO con JSON: {"tipo": "gasto", "monto": 1500.50, "descripcion": "Supermercado Dia", "categoria": "Supermercado", "fuente": null, "fecha": "${hoy}"}`;

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
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No se pudo extraer datos del ticket');

  const parsed = JSON.parse(jsonMatch[0]);
  const tipo: TipoMovimiento = TIPOS_VALIDOS.includes(parsed.tipo) ? parsed.tipo : 'gasto';
  return {
    monto: parsed.monto ?? null,
    descripcion: parsed.descripcion ?? 'Ticket',
    categoria: CATEGORIAS.includes(parsed.categoria) ? parsed.categoria : 'Otros',
    fecha: parsed.fecha ?? hoy,
    tipo,
    fuente: tipo === 'ingreso' && FUENTES.includes(parsed.fuente) ? parsed.fuente : null,
  };
}

// Re-export del tipo viejo por si algún import legacy lo usa
export type { MovimientoParsed as GastoParsed };
