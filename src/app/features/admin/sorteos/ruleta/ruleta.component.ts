
import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import { Wheel } from 'spin-wheel';

import {
  RaffleDrawService,
  WeightedRaffleParticipant
} from '../../../../core/services/raffle-draw.service';

import {
  RafflesService
} from '../../../../core/services/raffles.service';

import {
  Raffle
} from '../../../../core/models/raffle.model';


// ==========================================
// MODELO DE PARTICIPANTE
// ==========================================

interface Participante extends WeightedRaffleParticipant {

  color: string;

  numero: number;

}


@Component({
  selector: 'app-ruleta',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './ruleta.component.html',
  styleUrl: './ruleta.component.css'
})
export class RuletaComponent
  implements AfterViewInit, OnDestroy {


  @ViewChild('wheelHost')
  wheelHost!: ElementRef<HTMLDivElement>;


  // ==========================================
  // SERVICIOS
  // ==========================================

  private readonly service =
    inject(RaffleDrawService);

  private readonly rafflesService =
    inject(RafflesService);

  private readonly route =
    inject(ActivatedRoute);

  private readonly router =
    inject(Router);

  private readonly zone =
    inject(NgZone);


  // ==========================================
  // CONTROL INTERNO
  // ==========================================

  private wheel: Wheel | null = null;

  private timer?: ReturnType<typeof setInterval>;

  private destruido = false;


  // ==========================================
  // ESTADOS GENERALES
  // ==========================================

  readonly sorteoId = signal(0);

  readonly sorteo =
    signal<Raffle | null>(null);

  readonly participantes =
    signal<Participante[]>([]);

  readonly cargando = signal(false);

  readonly girando = signal(false);

  readonly error = signal('');

  readonly ganador =
    signal<Participante | null>(null);

  readonly modalGanador = signal(false);

  readonly mostrarRecaudacion = signal(false);


  // ==========================================
  // CONFIGURACION DEL GIRO
  // ==========================================

  readonly duracion = signal(12);

  readonly ahora = signal(Date.now());


  // ==========================================
  // BUSQUEDA Y PAGINACION
  // ==========================================

  readonly pagina = signal(1);

  readonly tamanioPagina = signal(8);

  readonly busqueda = signal('');


  // ==========================================
  // COLORES DE LOS PARTICIPANTES
  // ==========================================

  private readonly colores = [

    '#7C3AED',
    '#2563EB',
    '#0891B2',
    '#059669',
    '#EA580C',

    '#DB2777',
    '#4F46E5',
    '#0F766E',
    '#DC2626',
    '#9333EA',

    '#0284C7',
    '#15803D',
    '#CA8A04',
    '#BE185D',
    '#1D4ED8',

    '#C2410C',
    '#7E22CE',
    '#0E7490',
    '#B91C1C',
    '#4338CA',

    '#047857',
    '#A21CAF',
    '#0369A1',
    '#A16207',
    '#9F1239'

  ];


  // ==========================================
  // TOTAL DE PARTICIPANTES
  // ==========================================

  readonly totalParticipantes = computed(() =>

    this.participantes().length

  );


  // ==========================================
  // TOTAL RECAUDADO
  // ==========================================

  readonly totalRecaudado = computed(() =>

    this.participantes().reduce(

      (total, participante) =>

        total + participante.confirmed_amount,

      0

    )

  );


  // ==========================================
  // CLIENTES PARTICULARES
  // ==========================================

  readonly particulares = computed(() =>

    this.participantes().filter(

      participante =>

        participante.participant_type === 'customer'

    ).length

  );


  // ==========================================
  // CLIENTES EMPRESA
  // ==========================================

  readonly empresas = computed(() =>

    this.participantes().filter(

      participante =>

        participante.participant_type === 'distributor'

    ).length

  );


  // ==========================================
  // CUENTA REGRESIVA
  // ==========================================

  readonly tiempoRestante = computed(() => {

    const fecha = new Date(

      this.sorteo()?.draw_at ?? ''

    ).getTime();

    const diferencia = Number.isFinite(fecha)

      ? Math.max(0, fecha - this.ahora())

      : 0;

    const segundos =

      Math.ceil(diferencia / 1000);

    return {

      dias: this.formato(

        Math.floor(segundos / 86400)

      ),

      horas: this.formato(

        Math.floor(segundos / 3600) % 24

      ),

      minutos: this.formato(

        Math.floor(segundos / 60) % 60

      ),

      segundos: this.formato(

        segundos % 60

      )

    };

  });


  // ==========================================
  // VALIDAR FECHA PROGRAMADA
  // ==========================================

  readonly fechaAlcanzada = computed(() => {

    const fecha = new Date(

      this.sorteo()?.draw_at ?? ''

    ).getTime();

    return Number.isFinite(fecha) &&

      this.ahora() >= fecha;

  });


  // ==========================================
  // VALIDAR DISPONIBILIDAD DEL GIRO
  // ==========================================

  readonly puedeGirar = computed(() => {

    const sorteo = this.sorteo();

    return (

      !!sorteo &&

      sorteo.status !== 'cancelled' &&

      this.fechaAlcanzada() &&

      this.participantes().length > 0 &&

      !this.cargando() &&

      !this.girando() &&

      !this.modalGanador() &&

      !this.error() &&

      Number.isInteger(this.duracion()) &&

      this.duracion() >= 3 &&

      this.duracion() <= 60

    );

  });


  // ==========================================
  // FILTRAR PARTICIPANTES
  // ==========================================

  readonly participantesFiltrados = computed(() => {

    const termino =

      this.normalizar(this.busqueda());

    return this.participantes().filter(

      participante => {

        const texto = this.normalizar(

          participante.participant_name

        );

        return texto.includes(termino);

      }

    );

  });


  // ==========================================
  // TOTAL DE PAGINAS
  // ==========================================

  readonly totalPaginas = computed(() =>

    Math.max(

      1,

      Math.ceil(

        this.participantesFiltrados().length /

        this.tamanioPagina()

      )

    )

  );


  // ==========================================
  // PARTICIPANTES PAGINADOS
  // ==========================================

  readonly participantesPaginados = computed(() => {

    const inicio =

      (this.pagina() - 1) *

      this.tamanioPagina();

    return this.participantesFiltrados().slice(

      inicio,

      inicio + this.tamanioPagina()

    );

  });


  // ==========================================
  // INICIALIZACION
  // ==========================================

  ngAfterViewInit(): void {

    queueMicrotask(() => {

      if (this.destruido) return;

      const id = Number(

        this.route.snapshot.paramMap.get('id')

      );

      if (

        !Number.isSafeInteger(id) ||

        id <= 0

      ) {

        this.error.set(

          'El identificador del sorteo no es válido.'

        );

        return;

      }

      this.sorteoId.set(id);

      this.timer = setInterval(() => {

        this.ahora.set(Date.now());

      }, 1000);

      void this.cargarDatos();

    });

  }


  // ==========================================
  // DESTRUIR COMPONENTE
  // ==========================================

  ngOnDestroy(): void {

    this.destruido = true;

    clearInterval(this.timer);

    this.eliminarRuleta();

  }


  // ==========================================
  // CONSULTAR DATOS DESDE SUPABASE
  // ==========================================

  async cargarDatos(): Promise<void> {

    if (

      this.girando() ||

      this.cargando() ||

      this.modalGanador()

    ) {

      return;

    }

    this.cargando.set(true);

    this.error.set('');

    this.ganador.set(null);

    this.modalGanador.set(false);

    this.participantes.set([]);

    this.eliminarRuleta();

    try {

      const id = this.sorteoId();

      if (!Number.isSafeInteger(id) || id <= 0) {

        throw new Error('Sorteo no válido.');

      }

      const [sorteo, datos] =

        await Promise.all([

          this.rafflesService.obtenerPorId(id),

          this.service.obtenerParticipantesPonderados(id)

        ]);

      if (this.destruido) return;

      if (!sorteo) {

        throw new Error(

          'No se encontró el sorteo.'

        );

      }

      this.sorteo.set(sorteo);


      // Ordenar desde el mayor aporte.

      const ordenados = datos

        .filter(participante =>

          Number.isFinite(

            participante.confirmed_amount

          ) &&

          participante.confirmed_amount > 0

        )

        .sort((a, b) =>

          b.confirmed_amount -

          a.confirmed_amount ||

          a.user_id.localeCompare(b.user_id)

        );


      // Calcular el total acumulado.

      const total = ordenados.reduce(

        (suma, participante) =>

          suma + participante.confirmed_amount,

        0

      );

      if (!Number.isFinite(total)) {

        throw new Error(

          'El total de aportes no es válido.'

        );

      }


      // Preparar participantes para la ruleta.

      this.participantes.set(

        ordenados.map((participante, indice) => ({

          ...participante,

          numero: indice + 1,

          color: this.colores[

            indice % this.colores.length

          ],

          winning_probability: total > 0

            ? participante.confirmed_amount /

              total * 100

            : 0

        }))

      );

      this.pagina.set(1);

      this.busqueda.set('');

      this.construirRuleta();

    } catch (error: unknown) {

      if (this.destruido) return;

      this.participantes.set([]);

      this.eliminarRuleta();

      this.error.set(

        this.obtenerError(error)

      );

    } finally {

      if (!this.destruido) {

        this.cargando.set(false);

      }

    }

  }


  // ==========================================
  // CONSTRUIR RULETA VISUAL
  // ==========================================

  private construirRuleta(): void {

    this.eliminarRuleta();

    const participantes =

      this.participantes();

    if (

      !participantes.length ||

      !this.wheelHost?.nativeElement

    ) {

      return;

    }

    this.wheel = new Wheel(

      this.wheelHost.nativeElement,

      {

        items: participantes.map(participante => ({

          label:

            this.nombreCorto(

              participante.participant_name

            ),

          weight:

            participante.confirmed_amount,

          backgroundColor:

            participante.color,

          labelColor:

            '#ffffff',

          value:

            participante.user_id

        })),


        // Deshabilitar giro mediante arrastre.

        isInteractive: false,


        // Puntero superior.

        pointerAngle: 0,


        // Etiquetas.

        itemLabelFontSizeMax: 16,

        itemLabelRadius: 0.88,

        itemLabelRadiusMax: 0.25,


        // Bordes.

        borderWidth: 5,

        borderColor: '#ffffff',

        lineWidth: 1,

        lineColor: '#ffffff',


        // Evento al finalizar la animacion.

        onRest: event => {

          this.zone.run(() => {

            if (

              !this.girando() ||

              this.destruido

            ) {

              return;

            }

            const seleccionado =

              this.participantes()[event.currentIndex];

            this.girando.set(false);

            if (seleccionado) {

              this.ganador.set(seleccionado);

              this.modalGanador.set(true);

            } else {

              this.error.set(

                'No se pudo identificar al participante seleccionado.'

              );

            }

          });

        }

      }

    );

  }


  // ==========================================
  // GIRAR RULETA - SIMULACION VISUAL
  // ==========================================

  girar(): void {

    if (

      !this.puedeGirar() ||

      !this.wheel

    ) {

      return;

    }

    const fecha = new Date(

      this.sorteo()?.draw_at ?? ''

    ).getTime();

    if (

      !Number.isFinite(fecha) ||

      Date.now() < fecha

    ) {

      return;

    }

    this.error.set('');

    this.ganador.set(null);

    this.modalGanador.set(false);

    this.girando.set(true);

    try {

      // Seleccion de un angulo aleatorio.
      // Exclusivamente para la simulacion visual.

      const numero = new Uint32Array(1);

      crypto.getRandomValues(numero);

      const angulo =

        numero[0] / 4294967296 * 360;


      // Rotacion actual.

      const rotacionActual =

        this.wheel.rotation;

      const rotacionBase =

        Math.ceil(rotacionActual / 360) * 360;


      // Duracion configurable.

      this.wheel.spinTo(

        rotacionBase + (360 * 12) + angulo,

        this.duracion() * 1000

      );

    } catch (error: unknown) {

      this.girando.set(false);

      this.error.set(

        this.obtenerError(error)

      );

    }

  }


  // ==========================================
  // CAMBIAR BUSQUEDA
  // ==========================================

  cambiarBusqueda(valor: string): void {

    this.busqueda.set(valor);

    this.pagina.set(1);

  }


  // ==========================================
  // CAMBIAR PAGINA
  // ==========================================

  cambiarPagina(pagina: number): void {

    if (

      pagina >= 1 &&

      pagina <= this.totalPaginas()

    ) {

      this.pagina.set(pagina);

    }

  }


  // ==========================================
  // CONFIGURAR DURACION DEL GIRO
  // ==========================================

  cambiarDuracion(valor: number): void {

    if (!this.girando()) {

      this.duracion.set(

        Number(valor)

      );

    }

  }


  // ==========================================
  // MOSTRAR / OCULTAR RECAUDACION
  // ==========================================

  alternarMontos(): void {

    this.mostrarRecaudacion.update(

      valor => !valor

    );

  }


  // ==========================================
  // CERRAR POPUP
  // ==========================================

  cerrarGanador(): void {

    this.modalGanador.set(false);

  }


  // ==========================================
  // ABREVIAR NOMBRE
  // ==========================================

  nombreCorto(nombre: string): string {

    const partes = nombre

      .trim()

      .split(/\s+/)

      .filter(Boolean);

    if (partes.length === 0) {

      return 'Participante';

    }

    return partes.length > 1

      ? `${partes[0]} ${partes[1].charAt(0)}.`

      : partes[0];

  }


  // ==========================================
  // FORMATO DEL CONTADOR
  // ==========================================

  private formato(numero: number): string {

    return String(numero).padStart(2, '0');

  }


  // ==========================================
  // NORMALIZAR TEXTO
  // ==========================================

  private normalizar(texto: string): string {

    return texto

      .normalize('NFD')

      .replace(/[\u0300-\u036f]/g, '')

      .trim()

      .toLowerCase();

  }


  // ==========================================
  // ELIMINAR RULETA
  // ==========================================

  private eliminarRuleta(): void {

    if (this.wheel) {

      this.wheel.remove();

      this.wheel = null;

    }

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

    return 'No fue posible completar la operación.';

  }


  // ==========================================
  // REGRESAR AL DETALLE ADMINISTRATIVO
  // ==========================================

  volver(): void {

    if (this.girando()) {

      return;

    }

    void this.router.navigate([

      '/admin/sorteos',

      this.sorteoId()

    ]);

  }

}
