
import {
  Product
} from '../../core/models/product.model';

import {
  convertirPrecio
} from './price.utils';

export function generarWhatsApp(
  product: Product,
  rate: number
): string {

  const usd = convertirPrecio(
    product, 'USD', rate
  ).toFixed(2);

  const pen = convertirPrecio(
    product, 'PEN', rate
  ).toFixed(2);

  const message = [
    'Hola Corporación Charatec B2B.',
    '',
    'Deseo cotizar el siguiente producto:',
    '',
    `Producto: ${product.name}`,
    `Código: ${product.id}`,
    `Marca: ${product.brand}`,
    `Precio USD sin IGV: US$ ${usd}`,
    `Precio PEN incluido IGV: S/ ${pen}`,
    `Stock publicado: ${product.stock}`,
    '',
    '¿Podrían confirmarme disponibilidad?'
  ].join('\n');

  return 'https://wa.me/51943771361?text=' +
    encodeURIComponent(message);

}
