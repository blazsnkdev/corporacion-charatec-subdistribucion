
export type Currency = 'USD' | 'PEN';

export interface Product {
  id: number;
  name: string;
  brand: string;
  category: string;
  price: number;
  currency: string;
  stock: number;
  image: string;
  specs: string;
  active: boolean;
  offer: boolean;
  reference_price: number | null;
  photo?: string;
}

export function createEmptyProduct(): Product {
  return {
    id: 0,
    name: '',
    brand: '',
    category: 'Gaming',
    price: 0,
    currency: 'USD',
    stock: 0,
    image: '',
    specs: '',
    active: true,
    offer: false,
    reference_price: null
  };
}
