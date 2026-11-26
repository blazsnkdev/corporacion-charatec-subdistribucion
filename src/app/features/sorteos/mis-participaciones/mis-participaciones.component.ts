
import {
  Component,
  OnInit,
  inject,
  signal,
  computed
} from '@angular/core';

import { DatePipe } from '@angular/common';

import { FormsModule } from '@angular/forms';

import { RouterLink } from '@angular/router';

import {
  AuthService
} from '../../../core/services/auth.service';

import {
  ParticipationsService
} from '../../../core/services/participations.service';

import {
  RafflesService
} from '../../../core/services/raffles.service';

import {
  Raffle,
  RaffleContribution,
  ContributionStatus,
  RaffleStatus
} from '../../../core/models/raffle.model';


type FiltroParticipacion =
  'all' | ContributionStatus;


interface MiAporteDetalle extends RaffleContribution {

  raffle: Raffle | null;

}


@Component({
  selector: 'app-mis-participaciones',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink
  ],
  templateUrl: './mis-participaciones.component.html',
  styleUrl: './mis-participaciones.component.css'
})
export class MisParticipacionesComponent
  implements OnInit {


  // ==========================================
  // SERVICIOS
  // ==========================================

  readonly authService =
    inject(AuthService);

  private readonly participationsService =
    inject(ParticipationsService);

  private readonly rafflesService =
    inject(RafflesService);


  // ==========================================
  // ESTADOS
  // ==========================================

  readonly participaciones =
    signal<MiAporteDetalle[]>([]);

  readonly cargando = signal(true);

  readonly mensajeError = signal('');

  readonly busqueda = signal('');

  readonly filtro =
    signal<FiltroParticipacion>('all');

  private versionCarga = 0;


  // ==========================================
  // PAGINACION
  // ==========================================

  readonly pagina = signal(1);

  readonly tamanioPagina = signal(10);


  // ==========================================
  // FILTROS
  // ==========================================

  readonly filtros: {
    label: string;
    value: FiltroParticipacion;
  }[] = [

    {
      label: 'Todas',
      value: 'all'
    },

    {
      label: 'Pendientes',
      value: 'pending'
    },

    {
      label: 'Aprobadas',
      value: 'approved'
    },

    {
      label: 'Rechazadas',
      value: 'rejected'
    },

    {
      label: 'Canceladas',
      value: 'cancelled'
    }

  ];


  // ==========================================
  // ESTADISTICAS DE SOLICITUDES
  // ==========================================

  readonly total = computed(() =>

    this.participaciones().length

  );


  readonly pendientes = computed(() =>

    this.participaciones().filter(
      item => item.status === 'pending'
    ).length

  );


  readonly aprobadas = computed(() =>

    this.participaciones().filter(
      item => item.status === 'approved'
    ).length

  );


  readonly rechazadas = computed(() =>

    this.participaciones().filter(
      item => item.status === 'rejected'
    ).length

  );


  readonly canceladas = computed(() =>

    this.participaciones().filter(
      item => item.status === 'cancelled'
    ).length

  );


  // ==========================================
  // TOTAL DE APORTES CONFIRMADOS
  // ==========================================

  readonly totalConfirmado = computed(() => {

    return this.participaciones()

      .filter(item =>
        item.status === 'approved'
      )

      .reduce((total, item) =>

        total + Math.round(
          Number(item.approved_amount ?? 0) * 100
        ),

        0

      ) / 100;

  });


  // ==========================================
  // TOTAL DE APORTES PENDIENTES
  // ==========================================

  readonly totalPendiente = computed(() => {

    return this.participaciones()

      .filter(item =>
        item.status === 'pending'
      )

      .reduce((total, item) =>

        total + Math.round(
          Number(item.amount) * 100
        ),

        0

      ) / 100;

  });


  // ==========================================
  // LISTADO FILTRADO
  // ==========================================

  readonly participacionesFiltradas = computed(() => {

    const termino =
      this.normalizar(this.busqueda());

    const filtroActual =
      this.filtro();

    return this.participaciones()

      .filter(item => {

        const texto = this.normalizar(

          `${item.raffle?.title ?? ''}
           ${item.raffle?.prize ?? ''}
           ${item.raffle_id}
           ${item.id}
           ${item.payment_method}
           ${item.amount}`

        );

        const coincideBusqueda =

          !termino ||

          texto.includes(termino);


        const coincideEstado =

          filtroActual === 'all' ||

          item.status === filtroActual;


        return coincideBusqueda &&
          coincideEstado;

      })

      .sort((a, b) => {

        return new Date(b.created_at).getTime() -

          new Date(a.created_at).getTime();

      });

  });


  // ==========================================
  // TOTAL DE PAGINAS
  // ==========================================

  readonly totalPaginas = computed(() =>

    Math.max(

      1,

      Math.ceil(

        this.participacionesFiltradas().length /

        this.tamanioPagina()

      )

    )

  );


  // ==========================================
  // REGISTROS PAGINADOS
  // ==========================================

  readonly participacionesPaginadas = computed(() => {

    const inicio =

      (this.pagina() - 1) *

      this.tamanioPagina();

    return this.participacionesFiltradas().slice(

      inicio,

      inicio + this.tamanioPagina()

    );

  });


  // ==========================================
  // REGISTRO INICIAL
  // ==========================================

  readonly registroInicial = computed(() => {

    if (
      this.participacionesFiltradas().length === 0
    ) {
      return 0;
    }

    return (

      (this.pagina() - 1) *

      this.tamanioPagina()

    ) + 1;

  });


  // ==========================================
  // REGISTRO FINAL
  // ==========================================

  readonly registroFinal = computed(() =>

    Math.min(

      this.pagina() *

      this.tamanioPagina(),

      this.participacionesFiltradas().length

    )

  );


  // ==========================================
  // INICIALIZACION
  // ==========================================

  ngOnInit(): void {

    void this.cargarParticipaciones();

  }


  // ==========================================
  // CARGAR HISTORIAL DE APORTES
  // ==========================================

  async cargarParticipaciones(): Promise<void> {

    const version = ++this.versionCarga;

    this.cargando.set(true);

    this.mensajeError.set('');

    try {

      // CONSULTAR LOS APORTES DEL CLIENTE

      const aportes =

        await this.participationsService

          .listarMisAportes();


      // OBTENER IDS UNICOS DE SORTEOS

      const idsSorteos = Array.from(

        new Set(

          aportes.map(item =>
            item.raffle_id
          )

        )

      );


      // CONSULTAR INFORMACION DE CADA SORTEO

      const sorteos = await Promise.all(

        idsSorteos.map(async id => {

          try {

            return await this.rafflesService

              .obtenerPorId(id);

          } catch {

            return null;

          }

        })

      );


      // EVITAR RESPUESTAS DESACTUALIZADAS

      if (version !== this.versionCarga) {
        return;
      }


      // RELACIONAR SORTEOS CON APORTES

      const mapaSorteos = new Map<number, Raffle>();

      for (const sorteo of sorteos) {

        if (sorteo) {

          mapaSorteos.set(

            sorteo.id,

            sorteo

          );

        }

      }


      const resultado: MiAporteDetalle[] =

        aportes.map(aporte => ({

          ...aporte,

          raffle:

            mapaSorteos.get(aporte.raffle_id)

            ?? null

        }));


      this.participaciones.set(resultado);

      this.pagina.set(1);


    } catch (error) {

      if (version !== this.versionCarga) {
        return;
      }

      this.participaciones.set([]);

      this.mensajeError.set(

        this.obtenerError(error)

      );

    } finally {

      if (version === this.versionCarga) {

        this.cargando.set(false);

      }

    }

  }


  // ==========================================
  // BUSQUEDA
  // ==========================================

  cambiarBusqueda(valor: string): void {

    this.busqueda.set(valor);

    this.pagina.set(1);

  }


  // ==========================================
  // CAMBIAR FILTRO
  // ==========================================

  cambiarFiltro(
    valor: FiltroParticipacion
  ): void {

    this.filtro.set(valor);

    this.pagina.set(1);

  }


  // ==========================================
  // LIMPIAR FILTROS
  // ==========================================

  limpiarFiltros(): void {

    this.busqueda.set('');

    this.filtro.set('all');

    this.pagina.set(1);

  }


  // ==========================================
  // REGISTROS POR PAGINA
  // ==========================================

  cambiarTamanioPagina(event: Event): void {

    const select =

      event.target as HTMLSelectElement;

    const cantidad = Number(select.value);

    if (![10, 15, 25, 50].includes(cantidad)) {
      return;
    }

    this.tamanioPagina.set(cantidad);

    this.pagina.set(1);

  }


  // ==========================================
  // PAGINA ANTERIOR
  // ==========================================

  paginaAnterior(): void {

    if (this.pagina() > 1) {

      this.pagina.update(
        valor => valor - 1
      );

    }

  }


  // ==========================================
  // PAGINA SIGUIENTE
  // ==========================================

  paginaSiguiente(): void {

    if (this.pagina() < this.totalPaginas()) {

      this.pagina.update(
        valor => valor + 1
      );

    }

  }


  // ==========================================
  // FORMATEAR MONTO
  // ==========================================

  formatearMonto(
    monto: number | null
  ): string {

    if (monto === null) {
      return '—';
    }

    return 'S/ ' +

      Number(monto).toLocaleString(

        'es-PE',

        {

          minimumFractionDigits: 2,

          maximumFractionDigits: 2

        }

      );

  }


  // ==========================================
  // METODO DE PAGO
  // ==========================================

  nombreMetodoPago(metodo: string): string {

    const metodos: Record<string, string> = {

      yape: 'Yape',

      bcp: 'BCP',

      plin: 'Plin'

    };

    return metodos[metodo] ?? metodo;

  }


  // ==========================================
  // CODIGO DE SOLICITUD
  // ==========================================

  codigoSolicitud(id: string): string {

    return '#' + id.slice(0, 8).toUpperCase();

  }


  // ==========================================
  // ESTADO DE LA SOLICITUD
  // ==========================================

  nombreEstado(
    estado: ContributionStatus
  ): string {

    const estados: Record<
      ContributionStatus,
      string
    > = {

      pending: 'Pendiente de aprobación',

      approved: 'Aprobada',

      rejected: 'Rechazada',

      cancelled: 'Cancelada'

    };

    return estados[estado];

  }


  // ==========================================
  // ESTADO DEL SORTEO
  // ==========================================

  nombreEstadoSorteo(
    estado: RaffleStatus
  ): string {

    const estados: Record<RaffleStatus, string> = {

      draft: 'Borrador',

      published: 'Publicado',

      closed: 'Cerrado',

      finished: 'Finalizado',

      cancelled: 'Cancelado'

    };

    return estados[estado];

  }


  // ==========================================
  // MENSAJE SEGUN ESTADO
  // ==========================================

  mensajeEstado(item: MiAporteDetalle): string {

    switch (item.status) {

      case 'pending':

        return 'Tu aporte está pendiente de validación por el administrador.';


      case 'approved':

        return 'Tu aporte ha sido confirmado correctamente.';


      case 'rejected':

        return 'Tu solicitud de aporte no fue aprobada.';


      case 'cancelled':

        return 'Esta solicitud fue cancelada.';

    }

  }


  // ==========================================
  // NORMALIZAR BUSQUEDA
  // ==========================================

  private normalizar(texto: string): string {

    return texto

      .toLowerCase()

      .normalize('NFD')

      .replace(/[\u0300-\u036f]/g, '')

      .trim();

  }


  // ==========================================
  // CONTROL DE ERRORES
  // ==========================================

  private obtenerError(error: unknown): string {

    if (error instanceof Error) {

      return error.message;

    }

    if (

      typeof error === 'object' &&

      error !== null &&

      'message' in error &&

      typeof error.message === 'string'

    ) {

      return error.message;

    }

    return 'No se pudieron cargar tus participaciones.';

  }

}
