
import {
  Component,
  input,
  computed
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  Product
} from '../../../core/models/product.model';

import {
  convertirPrecio,
  calcularDescuento
} from '../../utils/price.utils';

import {
  generarWhatsApp
} from '../../utils/whatsapp.utils';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.css'
})
export class ProductCardComponent {

  readonly product = input.required<Product>();

  readonly rate = input.required<number>();

  readonly precioUSD = computed(() =>
    convertirPrecio(
      this.product(),
      'USD',
      this.rate()
    )
  );

  readonly precioPEN = computed(() =>
    convertirPrecio(
      this.product(),
      'PEN',
      this.rate()
    )
  );

  readonly precioAnterior = computed(() =>
    convertirPrecio(
      this.product(),
      'USD',
      this.rate(),
      true
    )
  );

  readonly descuento = computed(() =>
    calcularDescuento(this.product())
  );

  readonly especificaciones = computed(() =>
    (this.product().specs || '')
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
  );

  readonly whatsapp = computed(() =>
    generarWhatsApp(
      this.product(),
      this.rate()
    )
  );

  ocultarImagen(event: Event): void {

    const imagen = event.target as HTMLImageElement;

    imagen.style.display = 'none';

  }

}
