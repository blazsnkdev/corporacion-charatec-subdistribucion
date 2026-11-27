
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
  PopupService
} from '../../../core/services/popup.service';
import {
  convertirPrecio,
  calcularPrecioReferencial,
  calcularPrecioVenta,
  calcularGanancia
} from '../../../shared/utils/price.utils';

import {
  ProductCostInput
} from '../../../core/models/product-cost.model';

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
  private readonly popupService = inject(PopupService);
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
// ==========================================
// CONFIGURACION DE COSTOS
// ==========================================

readonly modoPrecio =
  signal<'automatico' | 'manual'>('automatico');

readonly costoCompra = signal<number | null>(null);

readonly porcentajeGanancia = signal<number | null>(3);

readonly cargandoCosto = signal(false);

private versionEdicion = 0;


// ==========================================
// PRECIO DE VENTA CALCULADO
// ==========================================

readonly precioVentaCalculado = computed(() =>

  calcularPrecioVenta(
    this.costoCompra() ?? 0,
    this.porcentajeGanancia() ?? 0
  )

);


// ==========================================
// GANANCIA ESTIMADA
// ==========================================

readonly gananciaUSD = computed(() =>

  calcularGanancia(
    this.costoCompra() ?? 0,
    this.porcentajeGanancia() ?? 0
  )

);

readonly gananciaPEN = computed(() =>

  this.gananciaUSD() * this.tipoCambio()

);
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

// ==========================================
// CAMBIAR MODO DE PRECIO
// ==========================================

cambiarModoPrecio(
  modo: 'automatico' | 'manual'
): void {

  if (this.cargandoCosto() || this.busy()) {
    return;
  }

  this.modoPrecio.set(modo);

  if (modo === 'automatico') {

    if (this.form.currency !== 'USD') {

      this.form.reference_price = null;

    }

    this.form.currency = 'USD';

    this.actualizarPrecioFinal();

  }

}


// ==========================================
// CAMBIAR COSTO DE COMPRA
// ==========================================

cambiarCostoCompra(valor: number | null): void {

  this.costoCompra.set(valor);

  this.actualizarPrecioFinal();

}


// ==========================================
// CAMBIAR PORCENTAJE DE GANANCIA
// ==========================================

cambiarPorcentajeGanancia(
  valor: number | null
): void {

  this.porcentajeGanancia.set(valor);

  this.actualizarPrecioFinal();

}


// ==========================================
// ACTUALIZAR PRECIO FINAL
// ==========================================

actualizarPrecioFinal(): void {

  if (this.modoPrecio() !== 'automatico') {

    return;

  }

  this.form.currency = 'USD';

  this.form.price = this.precioVentaCalculado();

}


// ==========================================
// VALIDAR COSTOS
// ==========================================

costosValidos(): boolean {

  if (this.modoPrecio() === 'manual') {

    return true;

  }

  const costo = this.costoCompra();

  const porcentaje = this.porcentajeGanancia();

  return (

    costo !== null &&

    porcentaje !== null &&

    Number.isFinite(costo) &&

    Number.isFinite(porcentaje) &&

    costo > 0 &&

    porcentaje >= 0 &&

    porcentaje <= 999999.99

  );

}


nuevoProducto(): void {

  this.versionEdicion++;

  this.form = createEmptyProduct();

  this.archivo = null;

  this.imagenPreview = '';

  this.mensaje.set('');

  this.cargandoCosto.set(false);

  // REINICIAR COSTOS

  this.modoPrecio.set('automatico');

  this.costoCompra.set(null);

  this.porcentajeGanancia.set(3);

}



async editar(producto: Product): Promise<void> {

  if (this.busy()) {

    return;

  }

  const version = ++this.versionEdicion;

  this.form = { ...producto };

  this.archivo = null;

  this.imagenPreview = producto.photo || '';

  this.mensaje.set('');

  this.error.set(false);

  this.cargandoCosto.set(true);

  this.modoPrecio.set('manual');

  this.costoCompra.set(null);

  this.porcentajeGanancia.set(null);

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });

  try {

    const costo =

      await this.productosService.obtenerCosto(
        producto.id
      );

    if (version !== this.versionEdicion) {

      return;

    }

    if (costo) {

      this.costoCompra.set(
        Number(costo.purchase_cost)
      );

      this.porcentajeGanancia.set(
        Number(costo.profit_percentage)
      );

      this.modoPrecio.set('automatico');

      this.actualizarPrecioFinal();

    }

  } catch (error) {

    if (version !== this.versionEdicion) {

      return;

    }

    this.mostrarError(error);

    this.nuevoProducto();

    await this.popupService.error(

      'Error al recuperar costos',

      'No se pudieron recuperar los costos del producto. Intenta editarlo nuevamente.'

    );

  } finally {

    if (version === this.versionEdicion) {

      this.cargandoCosto.set(false);

    }

  }

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

    this.cargandoCosto() ||

    !this.authService.admin()

  ) {

    return;

  }

  if (!this.costosValidos()) {

    await this.popupService.warning(

      'Revisa los costos',

      'Ingresa un costo de compra y un porcentaje de ganancia válidos.'

    );

    return;

  }

  this.busy.set(true);

  this.mensaje.set('');

  this.error.set(false);

  try {

    const editando = this.form.id > 0;

    let costos: ProductCostInput | null = null;


    // ======================================
    // PRECIO AUTOMATICO
    // ======================================

    if (this.modoPrecio() === 'automatico') {

      costos = {

        purchase_cost:
          Number(this.costoCompra()),

        profit_percentage:
          Number(this.porcentajeGanancia())

      };

      this.actualizarPrecioFinal();

    }


    // ======================================
    // VALIDAR PRECIO REFERENCIAL
    // ======================================

    if (

      this.form.reference_price !== null &&

      this.form.reference_price <= this.form.price

    ) {

      throw new Error(

        'El precio referencial debe ser superior al precio final.'

      );

    }


    // ======================================
    // GUARDAR PRODUCTO Y COSTOS
    // ======================================

    await this.productosService.guardarConCostos(

      this.form,

      costos,

      this.archivo

    );


    this.nuevoProducto();

    await this.cargarDatos();


    if (this.error()) {

      await this.popupService.warning(

        'Producto guardado',

        'El producto fue guardado, pero no se pudo actualizar el listado.'

      );

    } else {

      await this.popupService.success(

        editando

          ? '¡Producto actualizado!'

          : '¡Producto registrado!',

        'Los datos se guardaron correctamente.'

      );

    }

  } catch (error) {

    this.mostrarError(error);

    await this.popupService.error(

      'Error al guardar',

      (error as { message?: string })?.message ||

      'Revisa los datos del producto.'

    );

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

  this.busy.set(true);
  this.mensaje.set('');
  this.error.set(false);

  try {

    const confirmar =
      await this.popupService.confirm(
        '¿Eliminar producto?',
        `Se eliminará "${producto.name}" del inventario. Esta acción no se puede deshacer.`,
        'Eliminar'
      );

    if (!confirmar) return;

    await this.productosService.eliminar(
      producto.id
    );

    if (this.form.id === producto.id) {
      this.nuevoProducto();
    }

    await this.cargarDatos();

    if (this.error()) {

      await this.popupService.warning(
        'Producto eliminado',
        'El producto se eliminó, pero no se pudo actualizar el listado.'
      );

    } else {

      await this.popupService.success(
        '¡Producto eliminado!',
        'El producto fue retirado del inventario.'
      );

    }

  } catch (error) {

    this.mostrarError(error);

    await this.popupService.error(
      'Error',
      (error as { message?: string })?.message ||
      'No se pudo eliminar el producto.'
    );

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

    const confirmar = await this.popupService.confirm(
  '¿Importar productos de ejemplo?',
  'Los seis productos serán registrados como ocultos y con stock cero.',
  'Importar'
);

if (!confirmar) return;

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
