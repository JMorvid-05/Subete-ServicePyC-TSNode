// DEBE importarse primero en cada archivo de prueba: define las variables de
// entorno de prueba antes de que src/config/env.ts las lea (falla si faltan).
process.env.NODE_ENV ??= 'test';
process.env.GATEWAY_SECRET ??= 'secreto-de-prueba';
process.env.GATEWAY_URL ??= 'http://gateway-de-prueba';
process.env.GATEWAY_CLIENT_ID ??= 'mid-reputacion-prueba';
process.env.GATEWAY_CLIENT_SECRET ??= 'secreto-cliente-prueba';
process.env.MID_API_PORT ??= '0';
process.env.TERCERO_URL ??= '';
process.env.TERCERO_PLAN_DEGRADACION ??= 'valor_por_defecto';
// Sin vecinos en las pruebas: un solo intento y tiempos cortos.
process.env.HTTP_REINTENTOS ??= '0';
process.env.HTTP_TIMEOUT_MS ??= '500';
