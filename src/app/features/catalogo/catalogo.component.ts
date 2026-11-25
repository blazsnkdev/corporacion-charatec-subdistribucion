
import {
  Component,
  OnInit,
  inject,
  signal,
  computed
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  Router
} from '@angular/router';

import {
  AuthService
} from '../../core/services/auth.service';

import {
  ProductosService
} from '../../core/services/productos.service';

import {
  ConfiguracionService
} from '../../core/services/configuracion.service';

import {
  Product
} from '../../core/models/product.model';

import {
  ProductCardComponent
} from '../../shared/component/product-card/product-card.component';

import {
  FeaturedCarouselComponent
} from '../../shared/component/featured-carousel/featured-carousel.component';

import {
  convertirPrecio
} from '../../shared/utils/price.utils';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ProductCardComponent,
    FeaturedCarouselComponent
  ],
  templateUrl: './catalogo.component.html',
  styleUrl: './catalogo.component.css'
})
export class CatalogoComponent implements OnInit {

  readonly authService = inject(AuthService);

  private readonly productosService =
    inject(ProductosService);

  private readonly configuracionService =
    inject(ConfiguracionService);

  private readonly router = inject(Router);

  readonly productos = signal<Product[]>([]);

  readonly rate = signal(0);

  readonly cargando = signal(true);
  readonly error = signal('');

  readonly busqueda = signal('');
  readonly categoria = signal('');
  readonly marca = signal('');
  readonly orden = signal('recent');
  readonly soloStock = signal(false);

  readonly pagina = signal(1);

  readonly productosPorPagina = 12;

  readonly categorias = computed(() =>
    [...new Set(
      this.productos().map(p => p.category)
    )].sort()
  );

  readonly marcas = computed(() =>
    [...new Set(
      this.productos().map(p => p.brand)
    )].sort()
  );

  readonly destacados = computed(() =>
    this.productos()
      .filter(p => p.active && p.offer)
      .slice(0, 8)
  );

  readonly filtrados = computed(() => {

    const texto = this.busqueda()
      .trim().toLowerCase();

    const categoria = this.categoria();

    const marca = this.marca();

    const orden = this.orden();

    const stock = this.soloStock();

    const rate = this.rate();

    const lista = this.productos().filter(p => {

      const contenido =
        `${p.id} ${p.name} ${p.brand} ${p.category} ${p.specs}`
          .toLowerCase();

      return p.active &&
        contenido.includes(texto) &&
        (!categoria || p.category === categoria) &&
        (!marca || p.brand === marca) &&
        (!stock || p.stock > 0);

    });

    switch (orden) {

      case 'price-asc':

        if (rate > 0) {

          lista.sort((a, b) =>
            convertirPrecio(a, 'USD', rate) -
            convertirPrecio(b, 'USD', rate)
          );

        }

        break;

      case 'price-desc':

        if (rate > 0) {

          lista.sort((a, b) =>
            convertirPrecio(b, 'USD', rate) -
            convertirPrecio(a, 'USD', rate)
          );

        }

        break;

      case 'name':

        lista.sort((a, b) =>
          a.name.localeCompare(b.name)
        );

        break;

      case 'stock':

        lista.sort((a, b) =>
          b.stock - a.stock
        );

        break;

      default:

        lista.sort((a, b) =>
          b.id - a.id
        );

    }

    return lista;

  });

  readonly totalPaginas = computed(() =>
    Math.max(
      1,
      Math.ceil(
        this.filtrados().length /
        this.productosPorPagina
      )
    )
  );

  readonly paginados = computed(() => {

    const inicio =
      (this.pagina() - 1) *
      this.productosPorPagina;

    return this.filtrados().slice(
      inicio,
      inicio + this.productosPorPagina
    );

  });

  async ngOnInit(): Promise<void> {

    await this.cargarCatalogo();

  }

  async cargarCatalogo(): Promise<void> {

    this.cargando.set(true);
    this.error.set('');

    // Evitar mantener datos anteriores si falla el acceso.
    this.productos.set([]);
    this.rate.set(0);

    try {

      await this.authService.refresh();

      if (!this.authService.autenticado()) {

        await this.router.navigate(['/login']);

        return;

      }

      if (!this.authService.allowed()) {

        await this.router.navigate(['/pendiente']);

        return;

      }

      const [productos, rate] = await Promise.all([

        this.productosService.listar(),

        this.configuracionService.obtenerTipoCambio()

      ]);

      if (!Number.isFinite(rate) || rate <= 0) {

        throw new Error(
          'No hay un tipo de cambio válido.'
        );

      }

      this.rate.set(rate);

      this.productos.set(
        productos.filter(p => p.active)
      );

      this.pagina.set(1);

    } catch (error) {

      this.error.set(
        (error as { message?: string })?.message ||
        'No se pudo cargar el catálogo.'
      );

    } finally {

      this.cargando.set(false);

    }

  }

  seleccionarCategoria(value: string): void {

    this.categoria.set(value);
    this.pagina.set(1);

  }

  buscar(value: string): void {

    this.busqueda.set(value);
    this.pagina.set(1);

  }

  seleccionarMarca(value: string): void {

    this.marca.set(value);
    this.pagina.set(1);

  }

  ordenar(value: string): void {

    this.orden.set(value);
    this.pagina.set(1);

  }

  cambiarStock(value: boolean): void {

    this.soloStock.set(value);
    this.pagina.set(1);

  }

  limpiarFiltros(): void {

    this.busqueda.set('');
    this.categoria.set('');
    this.marca.set('');
    this.orden.set('recent');
    this.soloStock.set(false);
    this.pagina.set(1);

  }

  cambiarPagina(value: number): void {

    if (
      value < 1 ||
      value > this.totalPaginas()
    ) {
      return;
    }

    this.pagina.set(value);

    document
      .getElementById('catalogo-productos')
      ?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

  }

}
