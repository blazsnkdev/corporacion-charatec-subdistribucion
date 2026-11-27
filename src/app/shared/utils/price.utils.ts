
import {
  Product,
  Currency
} from '../../core/models/product.model';

export const IGV = 0.18;

export function convertirPrecio(
  product: Product,
  currency: Currency,
  rate: number,
  reference = false
): number {

  const amount = Number(
    reference
      ? product.reference_price ?? product.price
      : product.price
  );

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error('Tipo de cambio inválido.');
  }

  // USD almacenado: sin IGV.
  // PEN almacenado: incluido IGV.

  if (product.currency === 'USD') {

    return currency === 'USD'
      ? amount
      : amount * rate * (1 + IGV);

  }

  return currency === 'PEN'
    ? amount
    : amount / rate / (1 + IGV);

}

export function calcularPrecioReferencial(
  price: number,
  percentage = 12
): number {

  return Math.round(
    price * (1 + percentage / 100) * 100
  ) / 100;

}

export function calcularDescuento(
  product: Product
): number {

  const reference =
    Number(product.reference_price);

  if (
    product.reference_price === null ||
    reference <= product.price
  ) {
    return 0;
  }

  return Math.floor(
    (1 - product.price / reference) * 100
  );

}


// ==========================================
// CALCULAR PRECIO DE VENTA SIN IGV
// ==========================================

export function calcularPrecioVenta(

  costoCompra: number,

  porcentajeGanancia: number

): number {

  if (
    !Number.isFinite(costoCompra) ||
    !Number.isFinite(porcentajeGanancia) ||
    costoCompra < 0 ||
    porcentajeGanancia < 0
  ) {

    return 0;

  }

  return Math.round(

    costoCompra *
    (1 + porcentajeGanancia / 100) *
    100

  ) / 100;

}


// ==========================================
// CALCULAR GANANCIA BRUTA
// ==========================================

export function calcularGanancia(

  costoCompra: number,

  porcentajeGanancia: number

): number {

  const precioVenta = calcularPrecioVenta(

    costoCompra,

    porcentajeGanancia

  );

  return Math.round(

    (precioVenta - costoCompra) * 100

  ) / 100;

}
