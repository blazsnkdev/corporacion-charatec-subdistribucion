
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
  DistribuidoresService
} from '../../../core/services/distribuidores.service';

import {
  AuthService
} from '../../../core/services/auth.service';

import {
  Distributor
} from '../../../core/models/distributor.model';

import {
  PopupService
} from '../../../core/services/popup.service';


type DistributorStatus =
  | 'pending'
  | 'approved'
  | 'blocked';

type FiltroEstado =
  'all' | DistributorStatus;


@Component({
  selector: 'app-distribuidores',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './distribuidores.component.html',
  styleUrl: './distribuidores.component.css'
})
export class DistribuidoresComponent implements OnInit {

  private readonly distribuidoresService =
    inject(DistribuidoresService);

  private readonly authService =
    inject(AuthService);

  private readonly popupService =
    inject(PopupService);


  // ==========================================
  // ESTADOS
  // ==========================================

  readonly distribuidores =
    signal<Distributor[]>([]);

  readonly cargando = signal(false);

  readonly busy = signal(false);

  readonly procesandoId =
    signal<string | null>(null);

  readonly mensaje = signal('');

  readonly error = signal(false);

  readonly busqueda = signal('');

  readonly filtro =
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

  readonly total = computed(() =>

    this.distribuidores().length

  );


  readonly pendientes = computed(() =>

    this.distribuidores().filter(
      d => d.status === 'pending'
    ).length

  );


  readonly aprobados = computed(() =>

    this.distribuidores().filter(
      d => d.status === 'approved'
    ).length

  );


  readonly bloqueados = computed(() =>

    this.distribuidores().filter(
      d => d.status === 'blocked'
    ).length

  );


  // ==========================================
  // FILTRAR DISTRIBUIDORES
  // ==========================================

  readonly filtrados = computed(() => {

    const texto =
      this.normalizarTexto(this.busqueda());

    const estado = this.filtro();

    return this.distribuidores().filter(d => {

      const informacion = this.normalizarTexto(

        `${d.company} ${d.ruc} ${d.phone}`

      );

      const coincideBusqueda =

        !texto ||

        informacion.includes(texto);

      const coincideEstado =

        estado === 'all' ||

        d.status === estado;

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

        this.filtrados().length /
        this.tamanioPagina()

      )

    )

  );


  readonly distribuidoresPaginados =
    computed(() => {

      const inicio =

        (this.pagina() - 1) *
        this.tamanioPagina();

      return this.filtrados().slice(

        inicio,

        inicio + this.tamanioPagina()

      );

    });


  readonly primerRegistro = computed(() => {

    if (!this.filtrados().length) {

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

      this.filtrados().length

    )

  );


  // ==========================================
  // INICIALIZACION
  // ==========================================

  ngOnInit(): void {

    void this.cargarDistribuidores();

  }


  // ==========================================
  // CARGAR DISTRIBUIDORES
  // ==========================================

  async cargarDistribuidores(): Promise<void> {

    if (
      this.cargando() ||
      this.busy()
    ) {

      return;

    }

    this.cargando.set(true);

    this.mensaje.set('');

    this.error.set(false);

    try {

      await this.authService.inicializar();

      if (!this.authService.puedeAdministrar()) {

        this.distribuidores.set([]);

        this.pagina.set(1);

        throw new Error(
          'No tienes permisos para administrar distribuidores.'
        );

      }

      const data =
        await this.distribuidoresService.listar();

      this.distribuidores.set(data);

      this.pagina.set(1);

    } catch (error) {

      this.distribuidores.set([]);

      this.pagina.set(1);

      this.mostrarError(error);

      await this.popupService.error(

        'Error al cargar distribuidores',

        this.mensaje()

      );

    } finally {

      this.cargando.set(false);

    }

  }


  // ==========================================
  // BUSCADOR Y FILTROS
  // ==========================================

  cambiarBusqueda(valor: string): void {

    this.busqueda.set(valor);

    this.pagina.set(1);

  }


  cambiarFiltro(estado: FiltroEstado): void {

    this.filtro.set(estado);

    this.pagina.set(1);

  }


  limpiarFiltros(): void {

    this.busqueda.set('');

    this.filtro.set('all');

    this.pagina.set(1);

  }


  // ==========================================
  // CONTROLES DE PAGINACION
  // ==========================================

  cambiarTamanioPagina(valor: number): void {

    const cantidad = Number(valor);

    if (!this.opcionesPagina.includes(cantidad)) {

      return;

    }

    this.tamanioPagina.set(cantidad);

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
  // NOMBRE DEL ESTADO
  // ==========================================

  nombreEstado(status: string): string {

    switch (status) {

      case 'approved':

        return 'Aprobado';

      case 'blocked':

        return 'Bloqueado';

      case 'pending':

        return 'Pendiente';

      default:

        return status;

    }

  }


  // ==========================================
  // CAMBIAR ESTADO DEL DISTRIBUIDOR
  // ==========================================

  async cambiarEstado(
    distribuidor: Distributor,
    status: DistributorStatus
  ): Promise<void> {

    if (

      this.busy() ||

      this.cargando() ||

      !this.authService.puedeAdministrar() ||

      distribuidor.status === status

    ) {

      return;

    }


    const accion =

      status === 'approved'

        ? 'Aprobar'

        : status === 'blocked'

          ? 'Bloquear'

          : 'Desaprobar';


    const descripcion =

      status === 'approved'

        ? 'podrá acceder al catálogo mayorista.'

        : 'perderá el acceso al catálogo mayorista.';


    this.busy.set(true);

    this.procesandoId.set(distribuidor.id);

    this.mensaje.set('');

    this.error.set(false);

    try {

      const confirmar =
        await this.popupService.confirm(

          `¿${accion} distribuidor?`,

          `${distribuidor.company} ${descripcion}`,

          accion

        );

      if (!confirmar) {

        return;

      }


      // ACTUALIZAR EN SUPABASE

      await this.distribuidoresService.actualizarEstado(

        distribuidor.id,

        status

      );


      // ACTUALIZAR LISTADO LOCAL

      this.distribuidores.update(lista =>

        lista.map(d =>

          d.id === distribuidor.id

            ? { ...d, status }

            : d

        )

      );


      // CORREGIR PAGINA AL CAMBIAR ESTADO

      if (this.pagina() > this.totalPaginas()) {

        this.pagina.set(
          this.totalPaginas()
        );

      }


      await this.popupService.success(

        '¡Estado actualizado!',

        `${distribuidor.company}: ${this.nombreEstado(status)}.`

      );

    } catch (error) {

      this.mostrarError(error);

      await this.popupService.error(

        'Error al actualizar',

        (error as { message?: string })?.message ||

        'No se pudo actualizar el distribuidor.'

      );

    } finally {

      this.busy.set(false);

      this.procesandoId.set(null);

    }

  }


  // ==========================================
  // INICIALES DE LA EMPRESA
  // ==========================================

  iniciales(distribuidor: Distributor): string {

    return distribuidor.company

      .trim()

      .split(/\s+/)

      .slice(0, 2)

      .map(palabra => palabra.charAt(0))

      .join('')

      .toUpperCase() || 'E';

  }


  // ==========================================
  // FORMATEAR TELEFONO
  // ==========================================

  telefonoVisible(distribuidor: Distributor): string {

    const numero =
      distribuidor.phone.replace(/\D/g, '');

    if (numero.length === 9) {

      return `+51 ${numero}`;

    }

    if (
      numero.length === 11 &&
      numero.startsWith('51')
    ) {

      return `+51 ${numero.slice(2)}`;

    }

    return distribuidor.phone;

  }


  // ==========================================
  // ENLACE WHATSAPP
  // ==========================================

  whatsapp(distribuidor: Distributor): string {

    const numero =
      distribuidor.phone.replace(/\D/g, '');

    const telefono =

      numero.length === 9

        ? `51${numero}`

        : numero;

    const mensaje = encodeURIComponent(

      `Hola ${distribuidor.company}, ` +

      `te contactamos de Corporación Charatec ` +

      `respecto a tu cuenta de distribuidor.`

    );

    return `https://wa.me/${telefono}?text=${mensaje}`;

  }


  // ==========================================
  // MANEJAR ERRORES
  // ==========================================

  private mostrarError(error: unknown): void {

    this.error.set(true);

    this.mensaje.set(

      (error as { message?: string })?.message ||

      'No se pudo completar la operación.'

    );

  }


  // ==========================================
  // NORMALIZAR TEXTO
  // ==========================================

  private normalizarTexto(texto: string): string {

    return texto

      .toLowerCase()

      .normalize('NFD')

      .replace(/[\u0300-\u036f]/g, '')

      .trim();

  }

}
