
import {
  Component,
  OnInit,
  inject,
  signal,
  computed
} from '@angular/core';

import {
  DatePipe
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  CustomersService
} from '../../../core/services/customers.service';

import {
  PopupService
} from '../../../core/services/popup.service';

import {
  Customer,
  CustomerStatus
} from '../../../core/models/customer.model';


type FiltroEstado =
  'all' | CustomerStatus;


@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe
  ],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.css'
})
export class ClientesComponent implements OnInit {

  private readonly customersService =
    inject(CustomersService);

  private readonly popupService =
    inject(PopupService);


  // ==========================================
  // ESTADOS
  // ==========================================

  readonly clientes = signal<Customer[]>([]);

  readonly cargando = signal(false);

  readonly procesandoId =
    signal<string | null>(null);

  readonly mensajeError = signal('');

  readonly busqueda = signal('');

  readonly filtroEstado =
    signal<FiltroEstado>('all');


  // ==========================================
  // PAGINACION
  // ==========================================

  readonly pagina = signal(1);

  readonly tamanioPagina = signal(10);

  readonly opcionesPagina = [
    10,
    20,
    50
  ];


  // ==========================================
  // ESTADISTICAS
  // ==========================================

  readonly totalClientes = computed(() =>
    this.clientes().length
  );


  readonly totalActivos = computed(() =>

    this.clientes().filter(
      cliente => cliente.status === 'active'
    ).length

  );


  readonly totalBloqueados = computed(() =>

    this.clientes().filter(
      cliente => cliente.status === 'blocked'
    ).length

  );


  // ==========================================
  // FILTRAR CLIENTES
  // ==========================================

  readonly clientesFiltrados = computed(() => {

    const termino =
      this.normalizarTexto(this.busqueda());

    const estado = this.filtroEstado();

    return this.clientes().filter(cliente => {

      const nombre = this.normalizarTexto(
        `${cliente.first_name} ${cliente.last_name}`
      );

      const coincideBusqueda =

        !termino ||

        nombre.includes(termino) ||

        cliente.phone.includes(termino);

      const coincideEstado =

        estado === 'all' ||

        cliente.status === estado;

      return coincideBusqueda &&
        coincideEstado;

    });

  });


  // ==========================================
  // PAGINACION CALCULADA
  // ==========================================

  readonly totalPaginas = computed(() =>

    Math.max(

      1,

      Math.ceil(

        this.clientesFiltrados().length /
        this.tamanioPagina()

      )

    )

  );


  readonly clientesPaginados = computed(() => {

    const inicio =

      (this.pagina() - 1) *
      this.tamanioPagina();

    return this.clientesFiltrados().slice(

      inicio,

      inicio + this.tamanioPagina()

    );

  });


  readonly primerRegistro = computed(() => {

    if (!this.clientesFiltrados().length) {

      return 0;

    }

    return (

      (this.pagina() - 1) *
      this.tamanioPagina()

    ) + 1;

  });


  readonly ultimoRegistro = computed(() =>

    Math.min(

      this.pagina() * this.tamanioPagina(),

      this.clientesFiltrados().length

    )

  );


  // ==========================================
  // INICIALIZACION
  // ==========================================

  ngOnInit(): void {

    void this.cargarClientes();

  }


  // ==========================================
  // CARGAR CLIENTES
  // ==========================================

  async cargarClientes(): Promise<void> {

    if (
      this.cargando() ||
      this.procesandoId()
    ) {

      return;

    }

    this.cargando.set(true);

    this.mensajeError.set('');

    try {

      const resultado =
        await this.customersService.listar();

      this.clientes.set(resultado);

      this.pagina.set(1);

    } catch (error) {

      const mensaje =

        (error as { message?: string })?.message ||

        'No se pudo cargar el listado de clientes.';

      this.mensajeError.set(mensaje);

      await this.popupService.error(

        'Error al cargar clientes',

        mensaje

      );

    } finally {

      this.cargando.set(false);

    }

  }


  // ==========================================
  // BUSCADOR
  // ==========================================

  cambiarBusqueda(valor: string): void {

    this.busqueda.set(valor);

    this.pagina.set(1);

  }


  cambiarFiltro(estado: FiltroEstado): void {

    this.filtroEstado.set(estado);

    this.pagina.set(1);

  }


  limpiarFiltros(): void {

    this.busqueda.set('');

    this.filtroEstado.set('all');

    this.pagina.set(1);

  }


  // ==========================================
  // CONTROLES DE PAGINACION
  // ==========================================

  cambiarTamanioPagina(valor: number): void {

    this.tamanioPagina.set(Number(valor));

    this.pagina.set(1);

  }


  paginaAnterior(): void {

    if (this.pagina() > 1) {

      this.pagina.update(
        valor => valor - 1
      );

    }

  }


  paginaSiguiente(): void {

    if (this.pagina() < this.totalPaginas()) {

      this.pagina.update(
        valor => valor + 1
      );

    }

  }


  // ==========================================
  // ACTIVAR O BLOQUEAR CLIENTE
  // ==========================================

  async cambiarEstado(
    cliente: Customer
  ): Promise<void> {

    if (
      this.procesandoId() ||
      this.cargando()
    ) {

      return;

    }

    this.procesandoId.set(cliente.id);

    const bloquear =
      cliente.status === 'active';

    const nombre =
      this.nombreCompleto(cliente);

    const nuevoEstado: CustomerStatus =

      bloquear
        ? 'blocked'
        : 'active';

    try {

      const confirmar =
        await this.popupService.confirm(

          bloquear

            ? '¿Bloquear cliente?'

            : '¿Activar cliente?',

          bloquear

            ? `¿Deseas bloquear la cuenta de ${nombre}? No podrá realizar nuevas participaciones mientras esté bloqueada.`

            : `¿Deseas activar nuevamente la cuenta de ${nombre}?`,

          bloquear

            ? 'Bloquear cliente'

            : 'Activar cliente'

        );

      if (!confirmar) {

        return;

      }

      const actualizado =
        await this.customersService.actualizarEstado(

          cliente.id,

          nuevoEstado

        );

      // ACTUALIZAR LISTADO LOCAL

      this.clientes.update(clientes =>

        clientes.map(item =>

          item.id === actualizado.id

            ? actualizado

            : item

        )

      );

      // CORREGIR PAGINA SI CAMBIA EL FILTRO

      if (this.pagina() > this.totalPaginas()) {

        this.pagina.set(
          this.totalPaginas()
        );

      }

      await this.popupService.success(

        bloquear

          ? 'Cliente bloqueado'

          : 'Cliente activado',

        `El estado de ${nombre} fue actualizado correctamente.`

      );

    } catch (error) {

      await this.popupService.error(

        'No se pudo actualizar el cliente',

        (error as { message?: string })?.message ||

        'Inténtalo nuevamente.'

      );

    } finally {

      this.procesandoId.set(null);

    }

  }


  // ==========================================
  // UTILIDADES
  // ==========================================

  nombreCompleto(cliente: Customer): string {

    return `${cliente.first_name} ${cliente.last_name}`;

  }


  iniciales(cliente: Customer): string {

    return (

      cliente.first_name.charAt(0) +

      cliente.last_name.charAt(0)

    ).toUpperCase();

  }


  enlaceWhatsapp(cliente: Customer): string {

    return `https://wa.me/51${cliente.phone}`;

  }


  private normalizarTexto(
    texto: string
  ): string {

    return texto

      .toLowerCase()

      .normalize('NFD')

      .replace(/[\u0300-\u036f]/g, '')

      .trim();

  }

}
