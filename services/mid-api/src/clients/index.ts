import { config } from '../config/env.js';
import { crearGestorTokens, type GestorTokens } from './tokens.js';
import { crearClienteReservas, type ClienteReservas } from './reservas.client.js';
import { opcionesReservasDesdeConfig } from './reservas.client.js';
import { crearClienteCrud, type ClienteCrud } from './crud.client.js';
import { opcionesCrudDesdeConfig } from './crud.client.js';
import { crearClienteModeracion, type ClienteModeracion } from './openai.moderation.client.js';
import { opcionesModeracionDesdeConfig } from './openai.moderation.client.js';

/**
 * Fábricas singleton de los clientes del mid-api.
 * Se crean al primer uso: las pruebas inyectan sus propias dependencias
 * y nunca tocan estos objetos.
 */

let gestor: GestorTokens | null = null;
let reservas: ClienteReservas | null = null;
let crud: ClienteCrud | null = null;
let moderacion: ClienteModeracion | null = null;

export function clienteTokens(): GestorTokens {
  gestor ??= crearGestorTokens({
    url: config.gateway.url,
    clientId: config.gateway.clientId,
    clientSecret: config.gateway.clientSecret,
    margenVencimientoS: config.gateway.margenVencimientoS,
    timeoutMs: config.http.timeoutMs,
  });
  return gestor;
}

export function clienteReservas(): ClienteReservas {
  reservas ??= crearClienteReservas(opcionesReservasDesdeConfig(clienteTokens()));
  return reservas;
}

export function clienteCrud(): ClienteCrud {
  crud ??= crearClienteCrud(opcionesCrudDesdeConfig(clienteTokens()));
  return crud;
}

export function clienteModeracion(): ClienteModeracion {
  moderacion ??= crearClienteModeracion(opcionesModeracionDesdeConfig());
  return moderacion;
}
