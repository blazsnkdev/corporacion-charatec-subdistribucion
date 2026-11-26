
import {
  Component,
  OnInit,
  OnDestroy,
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
  RafflesService
} from '../../../core/services/raffles.service';

import {
  Raffle
} from '../../../core/models/raffle.model';


type FiltroSorteo =
  | 'all'
  | 'available'
  | 'closed'
  | 'finished';


interface TiempoRestante {

  dias: string;
  horas: string;
  minutos: string;
  segundos: string;

}


@Component({
  selector: 'app-sorteos',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    FormsModule
  ],
  templateUrl: './sorteos.component.html',
  styleUrl: './sorteos.component.css'
})
export class SorteosComponent
  implements OnInit, OnDestroy {

  readonly authService =
    inject(AuthService);

  private readonly rafflesService =
    inject(RafflesService);


  // ==========================================
  // ESTADOS
  // ==========================================

  readonly sorteos = signal<Raffle[]>([]);

  readonly cargando = signal(true);

  readonly mensajeError = signal('');

  readonly busqueda = signal('');

  readonly filtro =
    signal<FiltroSorteo>('all');

  readonly ahora = signal(Date.now());

  private versionCarga = 0;

  private temporizador:
    ReturnType<typeof setInterval> | null = null;


  // ==========================================
  // PERMISOS DE VISUALIZACION
  // ==========================================

  readonly esAdministrador = computed(() =>

    this.authService.puedeAdministrar()

  );


  readonly mostrarFiltrosEstado = computed(() =>

    this.esAdministrador()

  );


  // ==========================================
  // FILTROS DISPONIBLES
  // ==========================================

  readonly filtros = computed<{
    label: string;
    value: FiltroSorteo;
  }[]>(() => {

    if (!this.esAdministrador()) {

      return [];

    }

    return [

      {
        label: 'Todos',
        value: 'all'
      },

      {
        label: 'Disponibles',
        value: 'available'
      },

      {
        label: 'Cerrados',
        value: 'closed'
      },

      {
        label: 'Finalizados',
        value: 'finished'
      }

    ];

  });


  // ==========================================
  // SORTEOS VISIBLES SEGUN EL ROL
  // ==========================================

  readonly sorteosVisibles = computed(() => {

    const registros = this.sorteos();

    // ADMINISTRADOR

    if (this.esAdministrador()) {

      return registros.filter(sorteo =>

        sorteo.status !== 'draft'

      );

    }

    // CLIENTES, EMPRESAS Y VISITANTES

    return registros.filter(sorteo =>

      this.estaDisponible(sorteo)

    );

  });


  // ==========================================
  // ESTADISTICAS
  // ==========================================

  readonly totalDisponibles = computed(() =>

    this.sorteosVisibles().filter(

      sorteo => this.estaDisponible(sorteo)

    ).length

  );


  readonly totalCerrados = computed(() =>

    this.sorteosVisibles().filter(

      sorteo => this.estaCerrado(sorteo)

    ).length

  );


  readonly totalFinalizados = computed(() =>

    this.sorteosVisibles().filter(

      sorteo => sorteo.status === 'finished'

    ).length

  );


  // ==========================================
  // LISTADO FILTRADO
  // ==========================================

  readonly sorteosFiltrados = computed(() => {

    const termino =
      this.normalizar(this.busqueda());

    const filtroActual =

      this.esAdministrador()

        ? this.filtro()

        : 'available';


    return this.sorteosVisibles()

      .filter(sorteo => {

        const texto = this.normalizar(

          `${sorteo.title}
           ${sorteo.prize}
           ${sorteo.description}`

        );


        // FILTRO DE BUSQUEDA

        if (
          termino &&
          !texto.includes(termino)
        ) {

          return false;

        }


        // FILTRO DE ESTADO

        switch (filtroActual) {

          case 'available':

            return this.estaDisponible(sorteo);


          case 'closed':

            return this.estaCerrado(sorteo);


          case 'finished':

            return sorteo.status === 'finished';


          default:

            return true;

        }

      })


      // ORDENAR SORTEOS

      .sort((a, b) => {

        const prioridadA =
          this.estaDisponible(a) ? 0 : 1;

        const prioridadB =
          this.estaDisponible(b) ? 0 : 1;


        if (prioridadA !== prioridadB) {

          return prioridadA - prioridadB;

        }


        // DISPONIBLES:
        // PRIMERO LOS QUE CIERRAN MAS PRONTO

        if (prioridadA === 0) {

          return new Date(a.ends_at).getTime() -

            new Date(b.ends_at).getTime();

        }


        // RESTANTES:
        // MAS RECIENTES PRIMERO

        return new Date(b.created_at).getTime() -

          new Date(a.created_at).getTime();

      });

  });


  // ==========================================
  // INICIALIZACION
  // ==========================================

  ngOnInit(): void {

    void this.cargarSorteos();

    this.temporizador = setInterval(() => {

      this.ahora.set(Date.now());

    }, 1000);

  }


  // ==========================================
  // DESTRUIR COMPONENTE
  // ==========================================

  ngOnDestroy(): void {

    this.versionCarga++;

    if (this.temporizador !== null) {

      clearInterval(this.temporizador);

      this.temporizador = null;

    }

  }


  // ==========================================
  // CARGAR SORTEOS DESDE SUPABASE
  // ==========================================

  async cargarSorteos(): Promise<void> {

    const version = ++this.versionCarga;

    this.cargando.set(true);

    this.mensajeError.set('');

    try {

      // RECUPERAR AUTENTICACION INICIAL

      await this.authService.inicializar();


      // CONSULTAR SORTEOS

      const resultado =

        await this.rafflesService

          .listarPublicos();


      if (version !== this.versionCarga) {

        return;

      }


      this.sorteos.set(resultado);

      this.ahora.set(Date.now());


    } catch (error) {

      if (version !== this.versionCarga) {

        return;

      }

      this.sorteos.set([]);

      this.mensajeError.set(

        (error as { message?: string })?.message ||

        'No se pudieron cargar los sorteos.'

      );

    } finally {

      if (version === this.versionCarga) {

        this.cargando.set(false);

      }

    }

  }


  // ==========================================
  // CONVERTIR FECHA
  // ==========================================

  fechaEnMilisegundos(
    fecha: string | null
  ): number {

    return fecha

      ? new Date(fecha).getTime()

      : Number.POSITIVE_INFINITY;

  }


  // ==========================================
  // CAMBIAR FILTRO
  // ==========================================

  cambiarFiltro(filtro: FiltroSorteo): void {

    if (!this.esAdministrador()) {

      this.filtro.set('available');

      return;

    }

    this.filtro.set(filtro);

  }


  // ==========================================
  // LIMPIAR FILTROS
  // ==========================================

  limpiarFiltros(): void {

    this.busqueda.set('');

    this.filtro.set(

      this.esAdministrador()

        ? 'all'

        : 'available'

    );

  }


  // ==========================================
  // VALIDAR DISPONIBILIDAD
  // ==========================================

  estaDisponible(sorteo: Raffle): boolean {

    if (

      sorteo.status !== 'published' ||

      !sorteo.starts_at

    ) {

      return false;

    }


    const inicio =

      new Date(sorteo.starts_at).getTime();


    const cierre =

      new Date(sorteo.ends_at).getTime();


    const fechaActual = this.ahora();


    if (

      !Number.isFinite(inicio) ||

      !Number.isFinite(cierre)

    ) {

      return false;

    }


    return (

      fechaActual >= inicio &&

      fechaActual < cierre

    );

  }


  // ==========================================
  // VALIDAR SORTEO CERRADO
  // ==========================================

  estaCerrado(sorteo: Raffle): boolean {

    return (

      sorteo.status === 'closed' ||

      (

        sorteo.status === 'published' &&

        this.ahora() >=

          new Date(sorteo.ends_at).getTime()

      )

    );

  }


  // ==========================================
  // CONTADOR REGRESIVO
  // ==========================================

  tiempoRestante(fecha: string): TiempoRestante {

    const diferencia = Math.max(

      0,

      new Date(fecha).getTime() -

        this.ahora()

    );


    const segundosTotales =

      Math.floor(diferencia / 1000);


    const dias =

      Math.floor(segundosTotales / 86400);


    const horas =

      Math.floor(
        (segundosTotales % 86400) / 3600
      );


    const minutos =

      Math.floor(
        (segundosTotales % 3600) / 60
      );


    const segundos =

      segundosTotales % 60;


    return {

      dias:

        String(dias).padStart(2, '0'),

      horas:

        String(horas).padStart(2, '0'),

      minutos:

        String(minutos).padStart(2, '0'),

      segundos:

        String(segundos).padStart(2, '0')

    };

  }


  // ==========================================
  // ETIQUETA DEL ESTADO
  // ==========================================

  etiquetaEstado(sorteo: Raffle): string {

    if (this.estaDisponible(sorteo)) {

      return 'Participaciones abiertas';

    }

    if (this.estaCerrado(sorteo)) {

      return 'Participaciones cerradas';

    }

    if (sorteo.status === 'finished') {

      return 'Sorteo finalizado';

    }

    if (sorteo.status === 'cancelled') {

      return 'Sorteo cancelado';

    }

    if (sorteo.status === 'draft') {

      return 'Borrador';

    }

    return 'Próximamente';

  }


  // ==========================================
  // CLASE DEL ESTADO
  // ==========================================

  claseEstado(sorteo: Raffle): string {

    if (this.estaDisponible(sorteo)) {

      return 'status-available';

    }

    if (this.estaCerrado(sorteo)) {

      return 'status-closed';

    }

    if (sorteo.status === 'finished') {

      return 'status-finished';

    }

    return 'status-default';

  }


  // ==========================================
  // NAVEGACION
  // ==========================================

  explorarSorteos(): void {

    this.filtro.set('available');

    document

      .getElementById('sorteos-disponibles')

      ?.scrollIntoView({

        behavior: 'smooth',

        block: 'start'

      });

  }


  // ==========================================
  // UTILIDADES
  // ==========================================

  private normalizar(texto: string): string {

    return texto

      .toLowerCase()

      .normalize('NFD')

      .replace(/[\u0300-\u036f]/g, '')

      .trim();

  }

}
