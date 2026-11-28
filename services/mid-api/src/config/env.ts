import dotenv from 'dotenv';

// Orden de carga: primero el .env de la carpeta del servicio (tiene prioridad),
// luego el .env de la raíz del repositorio. Las variables del sistema
// (entorno de ejecución / plataforma) nunca se sobreescriben.
dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '../../.env', quiet: true });

function exigir(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(
      `Falta la variable de entorno requerida "${nombre}". ` +
        `Copia .env.example a .env (raíz o services/mid-api) y rellénala.`,
    );
  }
  return valor;
}

function numero(nombre: string, defecto: number): number {
  const valor = Number(process.env[nombre]);
  return Number.isFinite(valor) && valor > 0 ? valor : defecto;
}

const urlGateway = exigir('GATEWAY_URL');

export const config = {
  // ?? significa tomar el valor de la derecha si el valor de la izquierda tiene un null o undefined
  entorno: process.env.NODE_ENV ?? 'development',
  puerto: Number(process.env.MID_API_PORT ?? process.env.PORT ?? 3002),

  /** Cabecera secreta del gateway: sin ella se rechaza la llamada (401). */
  cabeceraGateway: exigir('GATEWAY_SECRET'),

  /** Cliente Client Credentials para pedir tokens al gateway. */
  gateway: {
    url: urlGateway,
    clientId: exigir('GATEWAY_CLIENT_ID'),
    clientSecret: exigir('GATEWAY_CLIENT_SECRET'),
    margenVencimientoS: numero('TOKEN_MARGEN_VENCIMIENTO_S', 30),
  },

  /*
   Bases de los consumos: por regla, todo pasa por el gateway.
   Son variables (nada hardcodeado) para poder apuntarlos a un mock en pruebas.
   */
  reservasUrl: process.env['RESERVAS_URL'] ?? urlGateway,
  crudUrl: process.env['CRUD_URL'] ?? urlGateway,

  /** Alcances que el gateway valida en nuestro token. */
  scopes: {
    leer: process.env['SCOPE_LEER'] ?? 'perfiles:leer',
    escribir: process.env['SCOPE_ESCRIBIR'] ?? 'perfiles:escribir',
    reservas: process.env['SCOPE_RESERVAS'] ?? 'reservas:leer',
  },

  /* Definición de reglas de solicitudes: tiempo máximo, reintentos t espera inicial */
  http: {
    timeoutMs: numero('HTTP_TIMEOUT_MS', 3000),
    reintentos: numero('HTTP_REINTENTOS', 2),
    esperaBaseMs: numero('HTTP_ESPERA_BASE_MS', 200),
  },

  /** OpenAI Moderation API (analiza el texto de los comentarios). Ver ficha en README. */
  moderacion: {
    url: process.env['OPENAI_MODERATION_URL'] ?? 'https://api.openai.com/v1/moderations',
    apiKey: process.env['OPENAI_API_KEY'] ?? '',
    model: process.env['OPENAI_MODERATION_MODEL'] ?? 'omni-moderation-latest',
    timeoutMs: numero('OPENAI_MODERATION_TIMEOUT_MS', 5000),
    maxReintentos: numero('OPENAI_MODERATION_MAX_RETRIES', 2),
    cacheTtlMs: numero('OPENAI_MODERATION_CACHE_TTL_MS', 300000),
    /** Declarado en el OpenAPI del mid-api: `permitir` (continúa marcado degradado) o `503`. */
    planDegradacion:
      (process.env['OPENAI_MODERATION_PLAN_DEGRADACION'] as 'permitir' | '503' | undefined) ??
      'permitir',
    /** Umbral opcional de rechazo por puntaje (0 = desactivado). */
    umbral: numero('OPENAI_MODERATION_FAIL_THRESHOLD', 0),
  },
} as const;
