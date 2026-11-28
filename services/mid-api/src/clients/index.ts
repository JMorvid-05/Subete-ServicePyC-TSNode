import { config } from '../config/env.js';
import { crearGestorTokens, type GestorTokens } from './tokens.js';
import { crearClienteReservas, type ClienteReservas } from './reservas.client.js';
import { opcionesReservasDesdeConfig } from './reservas.client.js';
import { crearClienteCrud, type ClienteCrud } from './crud.client.js';
import { opcionesCrudDesdeConfig } from './crud.client.js';
import { crearClienteTercero, type ClienteTercero } from './tercero.client.js';
import { opcionesTerceroDesdeConfig } from './tercero.client.js';

/**
 * Fábricas singleton de los clientes del mid-api.
 * Se crean al primer uso: las pruebas inyectan sus propias dependencias
 * y nunca tocan estos objetos.
 */

let gestor: GestorTokens | null = null;
let reservas: ClienteReservas | null = null;
let crud: ClienteCrud | null = null;
let tercero: ClienteTercero | null = null;

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

export function clienteTercero(): ClienteTercero {
  tercero ??= crearClienteTercero(opcionesTerceroDesdeConfig());
  return tercero;
}
