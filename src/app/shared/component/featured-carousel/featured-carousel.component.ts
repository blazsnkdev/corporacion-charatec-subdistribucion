
import {
  Component,
  input,
  signal,
  computed,
  OnInit,
  OnDestroy
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  Product
} from '../../../core/models/product.model';

import {
  convertirPrecio
} from '../../utils/price.utils';

import {
  generarWhatsApp
} from '../../utils/whatsapp.utils';

@Component({
  selector: 'app-featured-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './featured-carousel.component.html',
  styleUrl: './featured-carousel.component.css'
})
export class FeaturedCarouselComponent
  implements OnInit, OnDestroy {

  readonly productos = input.required<Product[]>();

  readonly rate = input.required<number>();

  readonly indice = signal(0);

  readonly pausado = signal(false);

  private timer?: ReturnType<typeof setInterval>;

  readonly destacado = computed(() => {

    const lista = this.productos();

    if (!lista.length) return null;

    return lista[this.indice() % lista.length];

  });

  ngOnInit(): void {

    this.timer = setInterval(() => {

      if (!this.pausado()) {
        this.siguiente();
      }

    }, 6000);

  }

  ngOnDestroy(): void {

    clearInterval(this.timer);

  }

  anterior(): void {

    const total = this.productos().length;

    if (!total) return;

    this.indice.update(i =>
      (i - 1 + total) % total
    );

  }

  siguiente(): void {

    const total = this.productos().length;

    if (!total) return;

    this.indice.update(i =>
      (i + 1) % total
    );

  }

  seleccionar(index: number): void {

    this.indice.set(index);

  }

  precio(producto: Product): number {

    return convertirPrecio(
      producto,
      'USD',
      this.rate()
    );

  }

  whatsapp(producto: Product): string {

    return generarWhatsApp(
      producto,
      this.rate()
    );

  }

}
