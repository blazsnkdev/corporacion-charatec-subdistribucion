
import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed
} from '@angular/core';

import {
  FormsModule
} from '@angular/forms';

import {
  DatePipe
} from '@angular/common';

import {
  RouterLink
} from '@angular/router';

import {
  RafflesService
} from '../../../core/services/raffles.service';

import {
  PopupService
} from '../../../core/services/popup.service';

import {
  Raffle,
  RaffleStatus,
  RaffleCreateRequest
} from '../../../core/models/raffle.model';


interface SorteoForm {

  title: string;

  description: string;

  prize: string;

  rules: string;

  ends_at: string;

  draw_at: string;

  image: string | null;

}


@Component({
  selector: 'app-sorteos-admin',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    RouterLink
  ],
  templateUrl: './sorteos-admin.component.html',
  styleUrl: './sorteos-admin.component.css'
})
export class SorteosAdminComponent
  implements OnInit, OnDestroy {


  private readonly rafflesService =
    inject(RafflesService);

  private readonly popupService =
    inject(PopupService);


  // ==========================================
  // ESTADOS
  // ==========================================

  readonly sorteos = signal<Raffle[]>([]);

  readonly cargando = signal(false);

  readonly guardando = signal(false);

  readonly procesandoId =
    signal<number | null>(null);

  readonly mostrarFormulario = signal(false);

  readonly editandoId =
    signal<number | null>(null);

  readonly mensajeError = signal('');

  readonly busqueda = signal('');

  readonly filtroEstado =
    signal<'all' | RaffleStatus>('all');


  // ==========================================
  // CONFIGURACION ECONOMICA
  // ==========================================

  aporteMinimo: number | null = null;

  aporteMaximo: number | null = null;

  incrementoAporte: number | null = null;

  metaRecaudacion: number | null = null;


  // ==========================================
  // IMAGEN
  // ==========================================

  archivoImagen: File | null = null;

  readonly vistaPrevia =
    signal<string | null>(null);

  private objectUrl: string | null = null;


  // ==========================================
  // FORMULARIO
  // ==========================================

  formulario: SorteoForm =
    this.formularioVacio();


  private formularioVacio(): SorteoForm {

    return {

      title: '',

      description: '',

      prize: '',

      rules: '',

      ends_at: '',

      draw_at: '',

      image: null

    };

  }


  // ==========================================
  // LIMPIAR CONFIGURACION ECONOMICA
  // ==========================================

  private limpiarAportes(): void {

    this.aporteMinimo = null;

    this.aporteMaximo = null;

    this.incrementoAporte = null;

    this.metaRecaudacion = null;

  }


  // ==========================================
  // ESTADISTICAS
  // ==========================================

  readonly total = computed(() =>
    this.sorteos().length
  );


  readonly borradores = computed(() =>

    this.sorteos().filter(
      item => item.status === 'draft'
    ).length

  );


  readonly publicados = computed(() =>

    this.sorteos().filter(
      item => item.status === 'published'
    ).length

  );


  readonly finalizados = computed(() =>

    this.sorteos().filter(
      item => item.status === 'finished'
    ).length

  );


  // ==========================================
  // FILTROS
  // ==========================================

  readonly sorteosFiltrados = computed(() => {

    const termino =
      this.busqueda().trim().toLowerCase();

    const estado =
      this.filtroEstado();

    return this.sorteos().filter(item => {

      const coincideBusqueda =

        !termino ||

        item.title.toLowerCase().includes(termino) ||

        item.prize.toLowerCase().includes(termino);

      const coincideEstado =

        estado === 'all' ||

        item.status === estado;

      return coincideBusqueda &&
        coincideEstado;

    });

  });


  // PAGINACION DEL CATALOGO
  readonly pagina = signal(1);
  readonly tamanioPagina = signal(10);
  readonly opcionesPagina = [10, 20, 50];

  readonly totalPaginas = computed(() => Math.max(1,
    Math.ceil(this.sorteosFiltrados().length / this.tamanioPagina())));

  readonly sorteosPaginados = computed(() => {
    const inicio = (this.pagina() - 1) * this.tamanioPagina();
    return this.sorteosFiltrados().slice(inicio, inicio + this.tamanioPagina());
  });

  readonly primerRegistro = computed(() => this.sorteosFiltrados().length
    ? (this.pagina() - 1) * this.tamanioPagina() + 1 : 0);

  readonly ultimoRegistro = computed(() => Math.min(
    this.pagina() * this.tamanioPagina(), this.sorteosFiltrados().length));

  cambiarBusqueda(valor: string): void {
    this.busqueda.set(valor);
    this.pagina.set(1);
  }

  cambiarFiltro(valor: 'all' | RaffleStatus): void {
    this.filtroEstado.set(valor);
    this.pagina.set(1);
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.filtroEstado.set('all');
    this.pagina.set(1);
  }

  cambiarTamanioPagina(valor: number): void {
    const cantidad = Number(valor);
    if (!this.opcionesPagina.includes(cantidad)) return;
    this.tamanioPagina.set(cantidad);
    this.pagina.set(1);
  }

  paginaAnterior(): void {
    if (this.pagina() > 1) this.pagina.update(p => p - 1);
  }

  paginaSiguiente(): void {
    if (this.pagina() < this.totalPaginas()) this.pagina.update(p => p + 1);
  }

  private ajustarPagina(): void {
    this.pagina.set(Math.min(this.pagina(), this.totalPaginas()));
  }

  // ==========================================
  // INICIALIZACION
  // ==========================================

  ngOnInit(): void {

    void this.cargarSorteos();

  }


  ngOnDestroy(): void {

    this.liberarVistaPrevia();

  }


  // ==========================================
  // CARGAR SORTEOS
  // ==========================================

  async cargarSorteos(): Promise<void> {

    if (this.cargando()) {

      return;

    }

    this.cargando.set(true);

    this.mensajeError.set('');

    try {

      this.sorteos.set(

        await this.rafflesService.listarAdmin()

      );

      this.ajustarPagina();

    } catch (error) {

      const mensaje =
        this.obtenerError(error);

      this.mensajeError.set(mensaje);

      await this.popupService.error(

        'Error al cargar sorteos',

        mensaje

      );

    } finally {

      this.cargando.set(false);

    }

  }


  // ==========================================
  // NUEVO SORTEO
  // ==========================================

  nuevoSorteo(): void {

    if (

      this.guardando() ||

      this.procesandoId() !== null

    ) {

      return;

    }

    this.limpiarImagen();

    this.limpiarAportes();

    this.formulario =
      this.formularioVacio();

    this.editandoId.set(null);

    this.mostrarFormulario.set(true);

  }


  // ==========================================
  // EDITAR SORTEO
  // ==========================================

  editarSorteo(sorteo: Raffle): void {

    if (

      sorteo.status !== 'draft' ||

      this.guardando() ||

      this.procesandoId() !== null

    ) {

      return;

    }

    this.limpiarImagen();


    // CARGAR DATOS GENERALES

    this.formulario = {

      title: sorteo.title,

      description: sorteo.description,

      prize: sorteo.prize,

      rules: sorteo.rules,

      ends_at:
        this.fechaParaInput(sorteo.ends_at),

      draw_at:
        this.fechaParaInput(sorteo.draw_at),

      image: sorteo.image

    };


    // CARGAR CONFIGURACION ECONOMICA

    this.aporteMinimo =
      sorteo.min_contribution ?? null;

    this.aporteMaximo =
      sorteo.max_contribution ?? null;

    this.incrementoAporte =
      sorteo.contribution_step ?? null;

    this.metaRecaudacion =
      sorteo.collection_goal ?? null;


    // MOSTRAR FORMULARIO

    this.vistaPrevia.set(sorteo.image);

    this.editandoId.set(sorteo.id);

    this.mostrarFormulario.set(true);

  }


  // ==========================================
  // CERRAR FORMULARIO
  // ==========================================

  cerrarFormulario(): void {

    if (this.guardando()) {

      return;

    }

    this.reiniciarFormulario();

  }


  private reiniciarFormulario(): void {

    this.mostrarFormulario.set(false);

    this.editandoId.set(null);

    this.formulario =
      this.formularioVacio();

    this.limpiarAportes();

    this.limpiarImagen();

  }


  // ==========================================
  // SELECCIONAR IMAGEN
  // ==========================================

  async seleccionarImagen(
    event: Event
  ): Promise<void> {

    const input =
      event.target as HTMLInputElement;

    const archivo =
      input.files?.[0];

    if (!archivo) {

      return;

    }

    const formatos = [

      'image/jpeg',

      'image/png',

      'image/webp'

    ];

    if (!formatos.includes(archivo.type)) {

      input.value = '';

      await this.popupService.warning(

        'Formato no permitido',

        'Selecciona una imagen JPG, PNG o WEBP.'

      );

      return;

    }

    if (archivo.size > 2 * 1024 * 1024) {

      input.value = '';

      await this.popupService.warning(

        'Imagen demasiado grande',

        'La imagen no debe superar los 2 MB.'

      );

      return;

    }

    this.liberarVistaPrevia();

    this.archivoImagen = archivo;

    this.objectUrl =
      URL.createObjectURL(archivo);

    this.vistaPrevia.set(this.objectUrl);

    input.value = '';

  }


  quitarImagen(): void {

    this.limpiarImagen();

    this.formulario.image = null;

  }


  private liberarVistaPrevia(): void {

    if (this.objectUrl) {

      URL.revokeObjectURL(this.objectUrl);

      this.objectUrl = null;

    }

  }


  private limpiarImagen(): void {

    this.liberarVistaPrevia();

    this.archivoImagen = null;

    this.vistaPrevia.set(null);

  }


  // ==========================================
  // VALIDAR CONFIGURACION ECONOMICA
  // ==========================================

  private validarConfiguracionAportes(): void {

    const minimo = this.aporteMinimo;

    const maximo = this.aporteMaximo;

    const incremento = this.incrementoAporte;

    const meta = this.metaRecaudacion;


    // VALIDAR APORTE MINIMO

    if (

      minimo === null ||

      !Number.isFinite(minimo) ||

      minimo <= 0

    ) {

      throw new Error(

        'Ingresa un aporte mínimo válido.'

      );

    }


    // VALIDAR APORTE MAXIMO

    if (

      maximo === null ||

      !Number.isFinite(maximo) ||

      maximo < minimo

    ) {

      throw new Error(

        'El aporte máximo debe ser mayor o igual al mínimo.'

      );

    }


    // VALIDAR INCREMENTO

    if (

      incremento === null ||

      !Number.isFinite(incremento) ||

      incremento <= 0

    ) {

      throw new Error(

        'Ingresa un incremento válido para el selector.'

      );

    }


    // VALIDAR META DE RECAUDACION

    if (

      meta === null ||

      !Number.isFinite(meta) ||

      meta <= 0

    ) {

      throw new Error(

        'Ingresa una meta de recaudación válida.'

      );

    }


    // VALIDAR DECIMALES Y LIMITES

    const montos = [

      minimo,

      maximo,

      incremento,

      meta

    ];

    if (montos.some(monto =>

      monto > 9999999999.99 ||

      Math.abs(

        monto * 100 -

        Math.round(monto * 100)

      ) > 0.00001

    )) {

      throw new Error(

        'Los montos deben tener como máximo dos decimales y estar dentro del límite permitido.'

      );

    }


    // VALIDAR RANGO DEL SELECTOR

    const minimoCentimos =
      Math.round(minimo * 100);

    const maximoCentimos =
      Math.round(maximo * 100);

    const incrementoCentimos =
      Math.round(incremento * 100);

    const rangoCentimos =
      maximoCentimos - minimoCentimos;


    if (

      incrementoCentimos <= 0 ||

      rangoCentimos % incrementoCentimos !== 0

    ) {

      throw new Error(

        'El incremento debe ser compatible con el rango de aporte mínimo y máximo.'

      );

    }

  }


  // ==========================================
  // GUARDAR SORTEO
  // ==========================================

  async guardarSorteo(): Promise<void> {

    if (this.guardando()) {

      return;

    }

    this.guardando.set(true);

    try {


      // VALIDAR APORTES ANTES DE SUBIR IMAGEN

      this.validarConfiguracionAportes();


      // CONSTRUIR REQUEST

      const request: RaffleCreateRequest = {

        title:
          this.formulario.title.trim(),

        description:
          this.formulario.description.trim(),

        prize:
          this.formulario.prize.trim(),

        rules:
          this.formulario.rules.trim(),

        image:
          this.formulario.image,

        ends_at:
          this.fechaLimaAISO(
            this.formulario.ends_at
          ),

        draw_at:
          this.fechaLimaAISO(
            this.formulario.draw_at
          ),


        min_contribution:
          this.aporteMinimo,

        max_contribution:
          this.aporteMaximo,

        contribution_step:
          this.incrementoAporte,

        collection_goal:
          this.metaRecaudacion

      };


      // VALIDAR DATOS GENERALES

      if (

        request.title.length < 3 ||

        !request.description ||

        !request.prize ||

        !request.rules

      ) {

        throw new Error(

          'Completa todos los campos obligatorios.'

        );

      }


      // VALIDAR FECHA DE CIERRE

      if (

        new Date(request.ends_at).getTime()

        <= Date.now()

      ) {

        throw new Error(

          'La fecha de cierre debe ser futura.'

        );

      }


      // VALIDAR FECHA DEL SORTEO

      if (

        new Date(request.draw_at).getTime() <

        new Date(request.ends_at).getTime()

      ) {

        throw new Error(

          'La fecha del sorteo debe ser igual o posterior al cierre.'

        );

      }


      // SUBIR IMAGEN SI EXISTE

      if (this.archivoImagen) {

        request.image =

          await this.rafflesService.subirImagen(

            this.archivoImagen

          );

        // Conservar la URL si falla el guardado.

        this.formulario.image = request.image;

        this.archivoImagen = null;

      }


      // CREAR O ACTUALIZAR

      const id = this.editandoId();

      const resultado = id !== null

        ? await this.rafflesService.actualizar(

            id,

            request

          )

        : await this.rafflesService.crear(

            request

          );


      // ACTUALIZAR LISTADO

      if (id !== null) {

        this.sorteos.update(items =>

          items.map(item =>

            item.id === resultado.id

              ? resultado

              : item

          )

        );

      } else {

        this.sorteos.update(items =>

          [resultado, ...items]

        );

      }


      // LIMPIAR FORMULARIO

      if (id === null) this.limpiarFiltros();
      this.ajustarPagina();
      this.reiniciarFormulario();


      // MOSTRAR CONFIRMACION

      await this.popupService.success(

        'Sorteo guardado',

        id !== null

          ? 'El borrador fue actualizado correctamente.'

          : 'El nuevo sorteo fue guardado como borrador.'

      );

    } catch (error) {

      await this.popupService.error(

        'No se pudo guardar el sorteo',

        this.obtenerError(error)

      );

    } finally {

      this.guardando.set(false);

    }

  }


  // ==========================================
  // PUBLICAR O CERRAR SORTEO
  // ==========================================

// ==========================================
// PUBLICAR O CERRAR SORTEO
// ==========================================

async cambiarEstado(
  sorteo: Raffle
): Promise<void> {

  if (
    this.guardando() ||
    this.cargando() ||
    this.procesandoId() !== null
  ) {
    return;
  }

  if (
    sorteo.status !== 'draft' &&
    sorteo.status !== 'published'
  ) {
    return;
  }

  this.procesandoId.set(sorteo.id);

  const publicar =
    sorteo.status === 'draft';

  try {

    // VALIDAR FECHA DE PUBLICACION

    if (
      publicar &&
      new Date(sorteo.ends_at).getTime() <= Date.now()
    ) {

      throw new Error(
        'La fecha de cierre debe ser posterior a la fecha actual.'
      );

    }

    // CONFIRMAR OPERACION

    const confirmar =
      await this.popupService.confirm(

        publicar
          ? '¿Publicar sorteo?'
          : '¿Cerrar sorteo?',

        publicar
          ? 'El sorteo estará visible para los clientes. Ya no podrás editarlo como borrador.'
          : 'Se cerrará la recepción de nuevas participaciones.',

        publicar
          ? 'Publicar'
          : 'Cerrar sorteo'

      );

    if (!confirmar) {
      return;
    }

    // ACTUALIZAR ESTADO

    if (publicar) {

      await this.rafflesService.publicar(
        sorteo.id
      );

    } else {

      await this.rafflesService.cerrar(
        sorteo.id
      );

    }

    await this.cargarSorteos();

    await this.popupService.success(

      publicar
        ? 'Sorteo publicado'
        : 'Sorteo cerrado',

      publicar
        ? 'El sorteo ya se encuentra publicado.'
        : 'El sorteo se cerró correctamente.'

    );

  } catch (error) {

    await this.popupService.error(

      'No se pudo cambiar el estado',

      this.obtenerError(error)

    );

  } finally {

    this.procesandoId.set(null);

  }

}



  // ==========================================
  // ETIQUETAS DE ESTADOS
  // ==========================================

  nombreEstado(
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
  // FECHAS - HORA DE PERU
  // ==========================================

  private fechaLimaAISO(
    valor: string
  ): string {

    if (!valor) {

      throw new Error(

        'Completa las fechas del sorteo.'

      );

    }

    const fecha =
      new Date(`${valor}:00-05:00`);

    if (!Number.isFinite(fecha.getTime())) {

      throw new Error(

        'La fecha ingresada no es válida.'

      );

    }

    return fecha.toISOString();

  }


  private fechaParaInput(
    valor: string
  ): string {

    const fecha =
      new Date(valor);

    return new Date(

      fecha.getTime() -

      5 * 60 * 60 * 1000

    ).toISOString().slice(0, 16);

  }


  // ==========================================
  // CONTROL DE ERRORES
  // ==========================================

  private obtenerError(
    error: unknown
  ): string {

    return (

      (error as { message?: string })?.message ||

      'No se pudo completar la operación.'

    );

  }

}
