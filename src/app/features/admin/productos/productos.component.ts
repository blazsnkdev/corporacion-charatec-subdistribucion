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
  ProductosService
} from '../../../core/services/productos.service';

import { ConfiguracionService } from '../../../core/services/configuracion.service';
import {
  AuthService
} from '../../../core/services/auth.service';

import {
  Product,
  Currency,
  createEmptyProduct
} from '../../../core/models/product.model';

import {
  convertirPrecio,
  calcularPrecioReferencial
} from '../../../shared/utils/price.utils';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.css'
})
export class ProductosComponent implements OnInit {

  private readonly productosService =
    inject(ProductosService);

  private readonly configuracionService =
    inject(ConfiguracionService);

  readonly authService = inject(AuthService);

  readonly productos = signal<Product[]>([]);

  readonly cargando = signal(true);
  readonly busy = signal(false);
  readonly mensaje = signal('');
  readonly error = signal(false);

  readonly tipoCambio = signal(3.75);

  readonly busqueda = signal('');
  readonly filtroEstado = signal('');

  readonly pagina = signal(1);

  readonly cantidadPorPagina = 10;

  form: Product = createEmptyProduct();

  archivo: File | null = null;

  imagenPreview = '';

  readonly totalProductos = computed(
    () => this.productos().length
  );

  readonly totalPublicados = computed(
    () => this.productos().filter(p => p.active).length
  );

  readonly totalOcultos = computed(
    () => this.productos().filter(p => !p.active).length
  );

  readonly totalSinStock = computed(
    () => this.productos().filter(p => p.stock === 0).length
  );

  readonly productosFiltrados = computed(() => {

    const texto = this.busqueda().toLowerCase().trim();

    const estado = this.filtroEstado();

    return this.productos().filter(p => {

      const coincide =
        `${p.id} ${p.name} ${p.brand} ${p.category} ${p.specs}`
          .toLowerCase()
          .includes(texto);

      const coincideEstado =
        !estado ||
        (estado === 'active' && p.active) ||
        (estado === 'hidden' && !p.active) ||
        (estado === 'nostock' && p.stock === 0);

      return coincide && coincideEstado;

    });

  });

  readonly totalPaginas = computed(() =>
    Math.max(
      1,
      Math.ceil(
        this.productosFiltrados().length /
        this.cantidadPorPagina
      )
    )
  );

  readonly productosPaginados = computed(() => {

    const inicio =
      (this.pagina() - 1) * this.cantidadPorPagina;

    return this.productosFiltrados().slice(
      inicio,
      inicio + this.cantidadPorPagina
    );

  });

  async ngOnInit(): Promise<void> {
    await this.cargarDatos();
  }

  async cargarDatos(): Promise<void> {

    if (!this.authService.admin()) {
      return;
    }

    this.cargando.set(true);

    try {

      const [productos, rate] = await Promise.all([

        this.productosService.listar(),

        this.configuracionService.obtenerTipoCambio()

      ]);

      this.productos.set(productos);
      this.tipoCambio.set(rate);

      this.pagina.set(
        Math.min(
          this.pagina(),
          this.totalPaginas()
        )
      );

    } catch (error) {

      this.mostrarError(error);

    } finally {

      this.cargando.set(false);

    }

  }

  cambiarBusqueda(valor: string): void {

    this.busqueda.set(valor);
    this.pagina.set(1);

  }

  cambiarFiltro(valor: string): void {

    this.filtroEstado.set(valor);
    this.pagina.set(1);

  }

  anterior(): void {

    if (this.pagina() > 1) {
      this.pagina.update(p => p - 1);
    }

  }

  siguiente(): void {

    if (this.pagina() < this.totalPaginas()) {
      this.pagina.update(p => p + 1);
    }

  }

  money(
    product: Product,
    currency: Currency
  ): number {

    return convertirPrecio(
      product,
      currency,
      this.tipoCambio()
    );

  }

  referenciaInterna(): number {

    return calcularPrecioReferencial(
      Number(this.form.price) || 0
    );

  }

  nuevoProducto(): void {

    this.form = createEmptyProduct();

    this.archivo = null;
    this.imagenPreview = '';
    this.mensaje.set('');

  }

  editar(producto: Product): void {

    this.form = { ...producto };

    this.archivo = null;

    this.imagenPreview = producto.photo || '';

    this.mensaje.set('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

  }

  seleccionarImagen(event: Event): void {

    const input = event.target as HTMLInputElement;

    const file = input.files?.[0];

    this.archivo = null;

    this.imagenPreview = this.form.photo || '';

    if (!file) {
      return;
    }

    try {

      this.productosService.validarImagen(file);

      this.archivo = file;

      const reader = new FileReader();

      reader.onload = () => {

        if (this.archivo === file) {
          this.imagenPreview = String(reader.result);
        }

      };

      reader.readAsDataURL(file);

    } catch (error) {

      input.value = '';

      this.mostrarError(error);

    }

  }

  async guardar(): Promise<void> {

    if (
      this.busy() ||
      !this.authService.admin()
    ) {
      return;
    }

    this.busy.set(true);
    this.mensaje.set('');
    this.error.set(false);

    try {

      const editando = this.form.id > 0;

      await this.productosService.guardar(
        this.form,
        this.archivo
      );

      this.nuevoProducto();

      await this.cargarDatos();

      if (!this.error()) {

        this.mensaje.set(
          editando
            ? 'Producto actualizado correctamente.'
            : 'Producto registrado correctamente.'
        );

      }

    } catch (error) {

      this.mostrarError(error);

    } finally {

      this.busy.set(false);

    }

  }

  async eliminar(producto: Product): Promise<void> {

    if (
      this.busy() ||
      !this.authService.admin()
    ) {
      return;
    }

    const confirmar = window.confirm(
      `¿Deseas eliminar el producto ${producto.name}?`
    );

    if (!confirmar) {
      return;
    }

    this.busy.set(true);
    this.mensaje.set('');
    this.error.set(false);

    try {

      await this.productosService.eliminar(
        producto.id
      );

      if (this.form.id === producto.id) {
        this.nuevoProducto();
      }

      await this.cargarDatos();

      if (!this.error()) {
        this.mensaje.set('Producto eliminado correctamente.');
      }

    } catch (error) {

      this.mostrarError(error);

    } finally {

      this.busy.set(false);

    }

  }

  async cambiarPublicacion(
    producto: Product
  ): Promise<void> {

    if (
      this.busy() ||
      !this.authService.admin()
    ) {
      return;
    }

    this.busy.set(true);
    this.mensaje.set('');
    this.error.set(false);

    try {

      await this.productosService.guardar({

        ...producto,

        active: !producto.active

      });

      if (this.form.id === producto.id) {
        this.form.active = !producto.active;
      }

      await this.cargarDatos();

      if (!this.error()) {

        this.mensaje.set(
          producto.active
            ? 'Producto ocultado del catálogo.'
            : 'Producto publicado en el catálogo.'
        );

      }

    } catch (error) {

      this.mostrarError(error);

    } finally {

      this.busy.set(false);

    }

  }

  async importarEjemplos(): Promise<void> {

    if (
      this.busy() ||
      !this.authService.admin()
    ) {
      return;
    }

    if (!window.confirm(
      '¿Importar los seis productos de ejemplo como ocultos y con stock cero?'
    )) {
      return;
    }

    this.busy.set(true);
    this.mensaje.set('');
    this.error.set(false);

    try {

      await this.productosService.importarEjemplos();

      await this.cargarDatos();

      if (!this.error()) {
        this.mensaje.set('Productos de ejemplo importados.');
      }

    } catch (error) {

      this.mostrarError(error);

    } finally {

      this.busy.set(false);

    }

  }

  private mostrarError(error: unknown): void {

    this.error.set(true);

    this.mensaje.set(
      (error as { message?: string })?.message ||
      'No se pudo completar la operación.'
    );

  }

}
