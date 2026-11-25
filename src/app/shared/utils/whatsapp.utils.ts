
import { Product } from '../../core/models/product.model';

import { convertirPrecio } from './price.utils';

const WHATSAPP_NUMBER = '51943771361';

export function generarWhatsApp(
  product: Product,
  rate: number
): string {

  const usd = convertirPrecio(
    product,
    'USD',
    rate
  ).toFixed(2);

  const pen = convertirPrecio(
    product,
    'PEN',
    rate
  ).toFixed(2);

  const message =
    `Hola Corporación Charatec, ` +
    `soy distribuidor y deseo consultar por ` +
    `${product.name} (código ${product.id}). ` +
    `Precio: USD ${usd} / S/ ${pen}. ` +
    `¿Disponibilidad?`;

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${
    encodeURIComponent(message)
  }`;
}

