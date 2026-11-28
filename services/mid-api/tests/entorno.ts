// DEBE importarse primero en cada archivo de prueba: define las variables de
// entorno de prueba antes de que src/config/env.ts las lea (falla si faltan).
process.env.NODE_ENV ??= 'test';
process.env.GATEWAY_SECRET ??= 'secreto-de-prueba';
process.env.GATEWAY_URL ??= 'http://gateway-de-prueba';
process.env.GATEWAY_CLIENT_ID ??= 'mid-reputacion-prueba';
process.env.GATEWAY_CLIENT_SECRET ??= 'secreto-cliente-prueba';
process.env.MID_API_PORT ??= '0';
process.env.OPENAI_API_KEY ??= '';
process.env.OPENAI_MODERATION_URL ??= 'https://api.openai.com/v1/moderations';
process.env.OPENAI_MODERATION_MODEL ??= 'omni-moderation-latest';
process.env.OPENAI_MODERATION_PLAN_DEGRADACION ??= 'permitir';
process.env.OPENAI_MODERATION_TIMEOUT_MS ??= '500';
process.env.OPENAI_MODERATION_MAX_RETRIES ??= '0';
process.env.OPENAI_MODERATION_CACHE_TTL_MS ??= '60000';
// Sin vecinos en las pruebas: un solo intento y tiempos cortos.
process.env.HTTP_REINTENTOS ??= '0';
process.env.HTTP_TIMEOUT_MS ??= '500';
