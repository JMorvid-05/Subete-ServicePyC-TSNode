// DEBE importarse primero en cada archivo de prueba: define las variables de
// entorno de prueba antes de que src/config/env.ts las lea (falla si faltan).
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://prueba:prueba@127.0.0.1:5432/prueba';
process.env.GATEWAY_SECRET ??= 'secreto-de-prueba';
process.env.CRUD_API_PORT ??= '0';
