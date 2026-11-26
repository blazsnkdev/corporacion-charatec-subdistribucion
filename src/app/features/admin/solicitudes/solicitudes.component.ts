
import {
  Component,
  OnInit,
  inject,
  signal,
  computed
} from '@angular/core';

import {
  FormsModule
} from '@angular/forms';

import {
  DatePipe,
  DecimalPipe
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
  RaffleParticipationDetail,
  RaffleContribution,
  ParticipationStatus,
  ParticipantType,
  RaffleContributionAdmin
} from '../../../core/models/raffle.model';

import {
  ParticipationsService
} from '../../../core/services/participations.service';


type FiltroEstado =
  'all' | ParticipationStatus;

type FiltroTipo =
  'all' | ParticipantType;

type AccionRevision =
  'approved' | 'rejected';


@Component({
  selector: 'app-solicitudes',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    DecimalPipe,
    RouterLink
  ],
  templateUrl: './solicitudes.component.html',
  styleUrl: './solicitudes.component.css'
})
export class SolicitudesComponent implements OnInit {

  private readonly participationsService =
    inject(ParticipationsService);

  private readonly rafflesService =
    inject(RafflesService);

  private readonly popupService =
    inject(PopupService);


  //* ==========================================
  //* ESTADOS GENERALES
  //* ==========================================

  readonly solicitudes =
    signal<RaffleParticipationDetail[]>([]);

  readonly sorteos =
    signal<Raffle[]>([]);

  readonly aportes =
    signal<RaffleContributionAdmin []>([]);

  readonly cargando = signal(true);

  readonly procesando = signal(false);

  readonly mensajeError = signal('');

  readonly busqueda = signal('');


  //* ==========================================
  //* FILTROS
  //* ==========================================

  readonly filtroEstado =
    signal<FiltroEstado>('all');

  readonly filtroTipo =
    signal<FiltroTipo>('all');

  readonly filtroSorteo =
    signal<number | 'all'>('all');


  //* ==========================================
  //* FORMULARIO DE REVISION ANTERIOR
  //* ==========================================

  readonly seleccionada =
    signal<RaffleParticipationDetail | null>(null);

  readonly accion =
    signal<AccionRevision>('approved');

  readonly comentario = signal('');


  //* ==========================================
  //* FORMULARIO DE REVISION DE APORTES
  //* ==========================================

  readonly aporteSeleccionado =
    signal<RaffleContributionAdmin  | null>(null);

  readonly montoConfirmado =
    signal<number | null>(null);

  readonly referenciaOperacion =
    signal('');

  readonly transferenciaVerificada =
    signal(false);

  readonly mostrarMontos =
    signal(false);


  //* ==========================================
  //* DIFERENCIA ENTRE MONTOS
  //* ==========================================

  readonly diferenciaMonto = computed(() => {

    const aporte = this.aporteSeleccionado();

    const confirmado = this.montoConfirmado();

    if (!aporte || confirmado === null) {

      return 0;

    }

    return Math.round(

      (confirmado - Number(aporte.amount)) * 100

    ) / 100;

  });


  //* ==========================================
  //* VALIDAR MONTO CONFIRMADO
  //* ==========================================

  readonly montoConfirmadoValido = computed(() => {

    const monto = this.montoConfirmado();

    return (

      monto !== null &&

      Number.isFinite(monto) &&

      monto > 0 &&

      monto <= 9999999999.99 &&

      Math.abs(

        monto * 100 -

        Math.round(monto * 100)

      ) < 0.00001

    );

  });


  //* ==========================================
  //* VALIDAR FORMULARIO DE APORTES
  //* ==========================================

  readonly puedeConfirmarAporte = computed(() => {

    const aporte = this.aporteSeleccionado();

    const comentario = this.comentario().trim();

    const referencia = this.referenciaOperacion().trim();

    if (

      !aporte ||

      !this.puedeRevisarAporte(aporte) ||

      this.procesando() ||

      this.cargando() ||

      comentario.length > 500

    ) {

      return false;

    }


    // RECHAZAR SOLICITUD

    if (this.accion() === 'rejected') {

      return comentario.length > 0;

    }


    // APROBAR SOLICITUD

    if (!this.montoConfirmadoValido()) {

      return false;

    }

    if (

      referencia.length === 0 ||

      referencia.length > 150

    ) {

      return false;

    }

    if (!this.transferenciaVerificada()) {

      return false;

    }


    // OBSERVACION OBLIGATORIA
    // CUANDO EXISTE DIFERENCIA DE MONTO

    if (

      this.diferenciaMonto() !== 0 &&

      !comentario

    ) {

      return false;

    }

    return true;

  });


  //* ==========================================
  //* PAGINACION
  //* ==========================================

  readonly pagina = signal(1);

  readonly tamanioPagina = signal(10);

  readonly opcionesPagina = [10, 20, 50];


  //* ==========================================
  //* SOLICITUDES POR SORTEO
  //* ==========================================

  readonly solicitudesPorSorteo = computed(() => {

    const filtro = this.filtroSorteo();

    return this.solicitudes().filter(item =>

      filtro === 'all' ||

      item.raffle_id === filtro

    );

  });


  //* ==========================================
  //* APORTES POR SORTEO
  //* ==========================================

  readonly aportesPorSorteo = computed(() => {

    const filtro = this.filtroSorteo();

    return this.aportes().filter(item =>

      filtro === 'all' ||

      item.raffle_id === filtro

    );

  });


  //* ==========================================
  //* ESTADISTICAS DE PARTICIPACIONES
  //* ==========================================

  readonly total = computed(() =>

    this.solicitudesPorSorteo().length

  );


  readonly pendientes = computed(() =>

    this.solicitudesPorSorteo().filter(

      item => item.status === 'pending'

    ).length

  );


  readonly aprobadas = computed(() =>

    this.solicitudesPorSorteo().filter(

      item => item.status === 'approved'

    ).length

  );


  readonly rechazadas = computed(() =>

    this.solicitudesPorSorteo().filter(

      item => item.status === 'rejected'

    ).length

  );


  readonly canceladas = computed(() =>

    this.solicitudesPorSorteo().filter(

      item => item.status === 'cancelled'

    ).length

  );


  //* ==========================================
  //* ESTADISTICAS DE APORTES
  //* ==========================================

  readonly totalAportes = computed(() =>

    this.aportesPorSorteo().length

  );


  readonly aportesPendientes = computed(() =>

    this.aportesPorSorteo().filter(

      item => item.status === 'pending'

    ).length

  );


  readonly aportesAprobados = computed(() =>

    this.aportesPorSorteo().filter(

      item => item.status === 'approved'

    ).length

  );


  readonly aportesRechazados = computed(() =>

    this.aportesPorSorteo().filter(

      item => item.status === 'rejected'

    ).length

  );


  readonly aportesCancelados = computed(() =>

    this.aportesPorSorteo().filter(

      item => item.status === 'cancelled'

    ).length

  );


  //* ==========================================
  //* MONTO TOTAL CONFIRMADO
  //* ==========================================

  readonly totalRecaudado = computed(() =>

    this.aportesPorSorteo()

      .filter(item =>

        item.status === 'approved' &&

        item.approved_amount !== null

      )

      .reduce((total, item) =>

        total + Math.round(

          Number(item.approved_amount) * 100

        ),

        0

      ) / 100

  );


  //* ==========================================
  //* MONTO TOTAL PENDIENTE
  //* ==========================================

  readonly totalMontoPendiente = computed(() =>

    this.aportesPorSorteo()

      .filter(item =>

        item.status === 'pending'

      )

      .reduce((total, item) =>

        total + Math.round(

          Number(item.amount) * 100

        ),

        0

      ) / 100

  );


  //* ==========================================
  //* MONTO TOTAL RECHAZADO
  //* ==========================================

  readonly totalMontoRechazado = computed(() =>

    this.aportesPorSorteo()

      .filter(item =>

        item.status === 'rejected'

      )

      .reduce((total, item) =>

        total + Math.round(

          Number(item.amount) * 100

        ),

        0

      ) / 100

  );


  //* ==========================================
  //* META DE RECAUDACION
  //* ==========================================

  readonly metaRecaudacion = computed(() => {

    const filtro = this.filtroSorteo();

    const sorteos = this.sorteos().filter(item =>

      filtro === 'all' ||

      item.id === filtro

    );

    return sorteos.reduce((total, item) =>

      total + Math.round(

        Number(item.collection_goal ?? 0) * 100

      ),

      0

    ) / 100;

  });


  //* ==========================================
  //* MONTO RESTANTE PARA LA META
  //* ==========================================

  readonly montoRestante = computed(() =>

    Math.max(

      0,

      Math.round(

        (

          this.metaRecaudacion() -

          this.totalRecaudado()

        ) * 100

      ) / 100

    )

  );


  //* ==========================================
  //* MONTO EXCEDENTE DE LA META
  //* ==========================================

  readonly montoExcedente = computed(() =>

    Math.max(

      0,

      Math.round(

        (

          this.totalRecaudado() -

          this.metaRecaudacion()

        ) * 100

      ) / 100

    )

  );


  //* ==========================================
  //* PORCENTAJE DE RECAUDACION
  //* ==========================================

  readonly porcentajeRecaudacion = computed(() => {

    const meta = this.metaRecaudacion();

    if (meta <= 0) {

      return 0;

    }

    return Math.round(

      (this.totalRecaudado() / meta) * 10000

    ) / 100;

  });


  readonly porcentajeBarra = computed(() =>

    Math.min(

      100,

      this.porcentajeRecaudacion()

    )

  );


  //* ==========================================
  //* PARTICIPANTES UNICOS APROBADOS
  //* ==========================================

  readonly empresasAprobadas = computed(() =>

    new Set(

      this.solicitudesPorSorteo()

        .filter(item =>

          item.status === 'approved' &&

          item.participant_type === 'distributor'

        )

        .map(item => item.user_id)

    ).size

  );


  readonly particularesAprobados = computed(() =>

    new Set(

      this.solicitudesPorSorteo()

        .filter(item =>

          item.status === 'approved' &&

          item.participant_type === 'customer'

        )

        .map(item => item.user_id)

    ).size

  );


  //* ==========================================
  //* LISTADO DE PARTICIPACIONES FILTRADAS
  //* ==========================================

  readonly solicitudesFiltradas = computed(() => {

    const termino =
      this.normalizar(this.busqueda());

    const estado = this.filtroEstado();

    const tipo = this.filtroTipo();

    return this.solicitudesPorSorteo()

      .filter(item => {

        const texto = this.normalizar(

          `${item.participant_name}
           ${item.raffle?.title ?? ''}
           ${item.raffle_id}`

        );

        const coincideBusqueda =

          !termino ||

          texto.includes(termino);

        const coincideEstado =

          estado === 'all' ||

          item.status === estado;

        const coincideTipo =

          tipo === 'all' ||

          item.participant_type === tipo;

        return coincideBusqueda &&

          coincideEstado &&

          coincideTipo;

      })

      .sort((a, b) => {

        const prioridadA =

          a.status === 'pending' ? 0 : 1;

        const prioridadB =

          b.status === 'pending' ? 0 : 1;

        if (prioridadA !== prioridadB) {

          return prioridadA - prioridadB;

        }

        return new Date(b.created_at).getTime() -

          new Date(a.created_at).getTime();

      });

  });


  //* ==========================================
  //* LISTADO DE APORTES FILTRADOS
  //* ==========================================

readonly aportesFiltrados = computed(() => {

  const termino =
    this.normalizar(this.busqueda());

  const estado =
    this.filtroEstado();

  const tipo =
    this.filtroTipo();

  return this.aportesPorSorteo()

    .filter(item => {

      const texto = this.normalizar(

        `${item.id}
         ${item.participant_name}
         ${item.phone ?? ''}
         ${item.ruc ?? ''}
         ${item.user_id}
         ${item.raffle_id}
         ${this.nombreSorteo(item.raffle_id)}
         ${item.payment_method}
         ${item.operation_reference ?? ''}`

      );

      const coincideBusqueda =

        !termino ||

        texto.includes(termino);

      const coincideEstado =

        estado === 'all' ||

        item.status === estado;

      const coincideTipo =

        tipo === 'all' ||

        item.participant_type === tipo;

      return (

        coincideBusqueda &&

        coincideEstado &&

        coincideTipo

      );

    })

    .sort((a, b) => {

      const prioridadA =

        a.status === 'pending' ? 0 : 1;

      const prioridadB =

        b.status === 'pending' ? 0 : 1;

      if (prioridadA !== prioridadB) {

        return prioridadA - prioridadB;

      }

      return new Date(b.created_at).getTime() -

        new Date(a.created_at).getTime();

    });

});



  //* ==========================================
  //* PAGINACION CALCULADA
  //* ==========================================

  readonly totalPaginas = computed(() =>

    Math.max(

      1,

      Math.ceil(

        this.solicitudesFiltradas().length /

        this.tamanioPagina()

      )

    )

  );


  readonly solicitudesPaginadas = computed(() => {

    const inicio =

      (this.pagina() - 1) *

      this.tamanioPagina();

    return this.solicitudesFiltradas().slice(

      inicio,

      inicio + this.tamanioPagina()

    );

  });


  //* ==========================================
  //* PAGINACION DE APORTES
  //* ==========================================

  readonly paginaAportes = signal(1);


  readonly totalPaginasAportes = computed(() =>

    Math.max(

      1,

      Math.ceil(

        this.aportesFiltrados().length /

        this.tamanioPagina()

      )

    )

  );


  readonly aportesPaginados = computed(() => {

    const inicio =

      (this.paginaAportes() - 1) *

      this.tamanioPagina();

    return this.aportesFiltrados().slice(

      inicio,

      inicio + this.tamanioPagina()

    );

  });


  //* ==========================================
  //* VALIDAR FORMULARIO DE REVISION ANTERIOR
  //* ==========================================

  readonly puedeConfirmar = computed(() => {

    const solicitud = this.seleccionada();

    const comentario = this.comentario().trim();

    return (

      solicitud !== null &&

      this.puedeRevisar(solicitud) &&

      !this.procesando() &&

      !this.cargando() &&

      comentario.length <= 500 &&

      (

        this.accion() === 'approved' ||

        comentario.length > 0

      )

    );

  });


  //* ==========================================
  //* INICIALIZACION
  //* ==========================================

  ngOnInit(): void {

    void this.cargarSolicitudes();

  }


  //* ==========================================
  //* CARGAR INFORMACION DESDE SUPABASE
  //* ==========================================

  async cargarSolicitudes(): Promise<void> {

    this.cargando.set(true);

    this.mensajeError.set('');

    try {

      const [solicitudes, sorteos, aportes] =

        await Promise.all([

          this.participationsService.listarAdmin(),

          this.rafflesService.listarAdmin(),

          this.participationsService.listarAportesAdmin()

        ]);


      this.solicitudes.set(solicitudes);

      this.sorteos.set(sorteos);

      this.aportes.set(aportes);


      // CORREGIR PAGINACION DE SOLICITUDES

      if (this.pagina() > this.totalPaginas()) {

        this.pagina.set(

          this.totalPaginas()

        );

      }


      // CORREGIR PAGINACION DE APORTES

      if (

        this.paginaAportes() >

        this.totalPaginasAportes()

      ) {

        this.paginaAportes.set(

          this.totalPaginasAportes()

        );

      }

    } catch (error) {

      this.mensajeError.set(

        this.obtenerError(error)

      );

    } finally {

      this.cargando.set(false);

    }

  }


  //* ==========================================
  //* CONTROLES DE FILTROS
  //* ==========================================

  cambiarBusqueda(valor: string): void {

    this.busqueda.set(valor);

    this.pagina.set(1);

    this.paginaAportes.set(1);

  }


  cambiarEstado(valor: FiltroEstado): void {

    this.filtroEstado.set(valor);

    this.pagina.set(1);

    this.paginaAportes.set(1);

  }


 cambiarTipo(valor: FiltroTipo): void {

  this.filtroTipo.set(valor);

  this.pagina.set(1);

  this.paginaAportes.set(1);

}

  cambiarSorteo(valor: number | 'all'): void {

    this.filtroSorteo.set(valor);

    this.pagina.set(1);

    this.paginaAportes.set(1);

    this.mostrarMontos.set(false);

  }


  limpiarFiltros(): void {

    this.busqueda.set('');

    this.filtroEstado.set('all');

    this.filtroTipo.set('all');

    this.filtroSorteo.set('all');

    this.pagina.set(1);

    this.paginaAportes.set(1);

    this.mostrarMontos.set(false);

  }


  //* ==========================================
  //* CONTROLES DE PAGINACION
  //* ==========================================

  cambiarTamanio(valor: number): void {

    const tamanio = Number(valor);

    if (!this.opcionesPagina.includes(tamanio)) {

      return;

    }

    this.tamanioPagina.set(tamanio);

    this.pagina.set(1);

    this.paginaAportes.set(1);

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


  paginaAnteriorAportes(): void {

    if (this.paginaAportes() > 1) {

      this.paginaAportes.update(

        valor => valor - 1

      );

    }

  }


  paginaSiguienteAportes(): void {

    if (

      this.paginaAportes() <

      this.totalPaginasAportes()

    ) {

      this.paginaAportes.update(

        valor => valor + 1

      );

    }

  }


  //* ==========================================
  //* MOSTRAR U OCULTAR MONTOS
  //* ==========================================

  alternarMontos(): void {

    this.mostrarMontos.update(

      valor => !valor

    );

  }


  //* ==========================================
  //* ABRIR FORMULARIO DE REVISION ANTERIOR
  //* ==========================================

  abrirRevision(

    solicitud: RaffleParticipationDetail,

    accion: AccionRevision

  ): void {

    if (

      this.procesando() ||

      this.cargando() ||

      this.seleccionada() !== null ||

      this.aporteSeleccionado() !== null ||

      !this.puedeRevisar(solicitud)

    ) {

      return;

    }

    this.seleccionada.set(solicitud);

    this.accion.set(accion);

    this.comentario.set('');

  }


  //* ==========================================
  //* CERRAR FORMULARIO DE REVISION ANTERIOR
  //* ==========================================

  cerrarRevision(): void {

    if (this.procesando()) {

      return;

    }

    this.seleccionada.set(null);

    this.comentario.set('');

  }


  //* ==========================================
  //* CONFIRMAR PARTICIPACION ANTERIOR
  //* ==========================================

  async confirmarRevision(): Promise<void> {

    const solicitud = this.seleccionada();

    if (

      !solicitud ||

      !this.puedeConfirmar()

    ) {

      return;

    }

    const accion = this.accion();

    const aprobar = accion === 'approved';

    const comentario = this.comentario().trim();

    this.procesando.set(true);

    try {

      const confirmar =

        await this.popupService.confirm(

          aprobar

            ? '¿Aprobar participación?'

            : '¿Rechazar participación?',

          `Confirma la revisión de la solicitud de ${solicitud.participant_name}.`,

          aprobar

            ? 'Aprobar'

            : 'Rechazar'

        );

      if (!confirmar) {

        return;

      }


      await this.participationsService.revisar(

        solicitud.id,

        accion,

        comentario

      );


      this.seleccionada.set(null);

      this.comentario.set('');


      await this.cargarSolicitudes();


      await this.popupService.success(

        aprobar

          ? 'Participación aprobada'

          : 'Participación rechazada',

        this.mensajeError()

          ? 'La revisión fue registrada, pero no se pudo actualizar el listado. Presiona Actualizar.'

          : 'La revisión fue registrada correctamente.'

      );

    } catch (error) {

      await this.popupService.error(

        'No se pudo revisar la solicitud',

        this.obtenerError(error)

      );

    } finally {

      this.procesando.set(false);

    }

  }


  //* ==========================================
  //* ABRIR FORMULARIO DE REVISION DE APORTES
  //* ==========================================

  abrirRevisionAporte(

    
  aporte: RaffleContributionAdmin,

  accion: AccionRevision

  ): void {

    if (

      this.procesando() ||

      this.cargando() ||

      this.seleccionada() !== null ||

      this.aporteSeleccionado() !== null ||

      !this.puedeRevisarAporte(aporte)

    ) {

      return;

    }


    // SELECCIONAR APORTE

    this.aporteSeleccionado.set(aporte);

    this.accion.set(accion);


    // PRECARGAR MONTO DECLARADO POR EL CLIENTE

    this.montoConfirmado.set(

      Number(aporte.amount)

    );


    // REINICIAR CAMPOS ADMINISTRATIVOS

    this.referenciaOperacion.set('');

    this.transferenciaVerificada.set(false);

    this.comentario.set('');

  }


  //* ==========================================
  //* MODIFICAR MONTO CONFIRMADO
  //* ==========================================

  cambiarMontoConfirmado(

    valor: number | null

  ): void {

    if (this.procesando()) {

      return;

    }

    this.montoConfirmado.set(valor);

    this.transferenciaVerificada.set(false);

  }


  //* ==========================================
  //* MODIFICAR REFERENCIA DE OPERACION
  //* ==========================================

  cambiarReferenciaOperacion(

    valor: string

  ): void {

    if (this.procesando()) {

      return;

    }

    this.referenciaOperacion.set(valor);

    this.transferenciaVerificada.set(false);

  }


  //* ==========================================
  //* CONFIRMAR VERIFICACION MANUAL
  //* ==========================================

  cambiarTransferenciaVerificada(

    valor: boolean

  ): void {

    if (this.procesando()) {

      return;

    }

    this.transferenciaVerificada.set(valor);

  }


  //* ==========================================
  //* RESTABLECER MONTO DECLARADO
  //* ==========================================

  restablecerMonto(): void {

    const aporte = this.aporteSeleccionado();

    if (!aporte || this.procesando()) {

      return;

    }

    this.montoConfirmado.set(

      Number(aporte.amount)

    );

    this.transferenciaVerificada.set(false);

  }


  //* ==========================================
  //* CERRAR FORMULARIO DE APORTES
  //* ==========================================

  cerrarRevisionAporte(): void {

    if (this.procesando()) {

      return;

    }

    this.limpiarRevisionAporte();

  }


  private limpiarRevisionAporte(): void {

    this.aporteSeleccionado.set(null);

    this.montoConfirmado.set(null);

    this.referenciaOperacion.set('');

    this.transferenciaVerificada.set(false);

    this.comentario.set('');

  }


  //* ==========================================
  //* CONFIRMAR REVISION DEL APORTE
  //* ==========================================


//* ==========================================
//* CONFIRMAR REVISION DEL APORTE
//* ==========================================

async confirmarRevisionAporte(): Promise<void> {

  const aporte = this.aporteSeleccionado();

  if (

    !aporte ||

    !this.puedeConfirmarAporte()

  ) {

    return;

  }


  const accion = this.accion();

  const aprobar = accion === 'approved';

  const monto = this.montoConfirmado();

  const comentario = this.comentario().trim();

  const referencia =
    this.referenciaOperacion().trim();


  this.procesando.set(true);


  try {


    // MENSAJE DE CONFIRMACION

    const mensaje = aprobar

      ? `Monto declarado: S/ ${Number(aporte.amount).toFixed(2)}.

Monto confirmado: S/ ${Number(monto).toFixed(2)}.

¿Deseas confirmar la revisión de esta solicitud?`

      : '¿Deseas rechazar esta solicitud de participación?';


    // CONFIRMACION ADMINISTRATIVA

    const confirmar =

      await this.popupService.confirm(

        aprobar

          ? 'Confirmar participación'

          : 'Rechazar participación',

        mensaje,

        aprobar

          ? 'Confirmar'

          : 'Rechazar'

      );


    if (!confirmar) {

      return;

    }


    // GUARDAR EN SUPABASE

    await this.participationsService.revisarAporte({

      contribution_id:
        aporte.id,

      status:
        accion,

      approved_amount:

        aprobar
          ? monto
          : null,

      operation_reference:

        aprobar
          ? referencia
          : null,

      admin_comment:
        comentario

    });


    // LIMPIAR FORMULARIO

    this.limpiarRevisionAporte();


    // ACTUALIZAR INFORMACION

    await this.cargarSolicitudes();


    // MOSTRAR CONFIRMACION

    await this.popupService.success(

      aprobar

        ? 'Aporte confirmado'

        : 'Solicitud rechazada',

      this.mensajeError()

        ? 'La revisión fue registrada, pero no se pudo actualizar el listado.'

        : 'La revisión administrativa fue registrada correctamente.'

    );


  } catch (error) {


    await this.popupService.error(

      'No se pudo revisar la solicitud',

      this.obtenerError(error)

    );


  } finally {

    this.procesando.set(false);

  }

}



  //* ==========================================
  //* VALIDAR ACCIONES DE PARTICIPACIONES
  //* ==========================================

  puedeRevisar(

    item: RaffleParticipationDetail

  ): boolean {

    return (

      item.status === 'pending' &&

      (

        item.raffle?.status === 'published' ||

        item.raffle?.status === 'closed'

      )

    );

  }


  //* ==========================================
  //* VALIDAR ACCIONES DE APORTES
  //* ==========================================

  puedeRevisarAporte(

    item: RaffleContribution

  ): boolean {

    const sorteo = this.sorteos().find(

      registro => registro.id === item.raffle_id

    );

    return (

      item.status === 'pending' &&

      !!sorteo &&

      (

        sorteo.status === 'published' ||

        sorteo.status === 'closed'

      )

    );

  }


  //* ==========================================
  //* OBTENER NOMBRE DEL SORTEO
  //* ==========================================

  nombreSorteo(raffleId: number): string {

    const sorteo = this.sorteos().find(

      item => item.id === raffleId

    );

    return sorteo?.title ??

      `Sorteo #${raffleId}`;

  }


  //* ==========================================
  //* NOMBRE DEL METODO DE PAGO
  //* ==========================================

  nombreMetodoPago(metodo: string): string {

    switch (metodo) {

      case 'yape':

        return 'Yape';

      case 'plin':

        return 'Plin';

      case 'bcp':

        return 'BCP';

      default:

        return 'No especificado';

    }

  }


  //* ==========================================
  //* NOMBRE DEL ESTADO
  //* ==========================================

  nombreEstado(

    estado: ParticipationStatus

  ): string {

    const estados: Record<

      ParticipationStatus,

      string

    > = {

      pending: 'Pendiente',

      approved: 'Aprobada',

      rejected: 'Rechazada',

      cancelled: 'Cancelada'

    };

    return estados[estado];

  }


  //* ==========================================
  //* TIPO DE PARTICIPANTE
  //* ==========================================

nombreTipo(

  tipo: ParticipantType | 'unknown'

): string {

  switch (tipo) {

    case 'distributor':
      return 'Cliente empresa';

    case 'customer':
      return 'Cliente particular';

    default:
      return 'Sin perfil';

  }

}

  //* ==========================================
  //* FORMATEAR MONTO
  //* ==========================================

  formatearMonto(

    monto: number | null

  ): string {

    if (!this.mostrarMontos()) {

      return 'S/ ••••••';

    }

    if (monto === null) {

      return '—';

    }

    return `S/ ${Number(monto).toLocaleString('es-PE', {

      minimumFractionDigits: 2,

      maximumFractionDigits: 2

    })}`;

  }


  //* ==========================================
  //* NORMALIZAR TEXTO DEL BUSCADOR
  //* ==========================================

  private normalizar(texto: string): string {

    return texto

      .toLowerCase()

      .normalize('NFD')

      .replace(/[\u0300-\u036f]/g, '')

      .trim();

  }


  //* ==========================================
  //* MANEJO DE ERRORES
  //* ==========================================

  private obtenerError(error: unknown): string {

    return (

      (error as { message?: string })?.message ||

      'No se pudo completar la operación.'

    );

  }

}
