
import {
  Product,
  Currency
} from '../../core/models/product.model';

export function convertirPrecio(
  product: Product,
  currency: Currency,
  rate: number,
  reference = false
): number {

  const amount = reference
    ? product.reference_price ?? product.price
    : product.price;

  if (product.currency === currency) {
    return amount;
  }

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error('Tipo de cambio inválido.');
  }

  return currency === 'PEN'
    ? amount * rate
    : amount / rate;
}

export function calcularPrecioReferencial(
  price: number,
  percentage = 12
): number {

  return Math.round(
    price * (1 + percentage / 100) * 100
  ) / 100;

}
