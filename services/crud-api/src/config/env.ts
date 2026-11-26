import dotenv from 'dotenv';

// Orden de carga: primero el .env de la carpeta del servicio (tiene prioridad),
// luego el .env de la raíz del repositorio. Las variables ya definidas por el
// sistema (entorno de ejecución / plataforma) nunca se sobreescriben.
dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '../../.env', quiet: true });

function exigir(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    // Falla temprano, sin arrancar: nunca se imprime el valor de otras variables.
    throw new Error(
      `Falta la variable de entorno requerida "${nombre}". ` +
        `Copia .env.example a .env (raíz o services/crud-api) y rellénala.`,
    );
  }
  return valor;
}

export const config = {
  entorno: process.env.NODE_ENV ?? 'development',
  // Puerto del servicio (CRUD_API_PORT en .env.example; PORT como alternativa)
  puerto: Number(process.env.CRUD_API_PORT ?? process.env.PORT ?? 3001),
  /** PostgreSQL propio del grupo. Nadie más lo lee. */
  baseDatos: exigir('DATABASE_URL'),
  /** Cabecera secreta que agrega el API Gateway; sin ella se rechaza (401). */
  cabeceraGateway: exigir('GATEWAY_SECRET'),
} as const;
