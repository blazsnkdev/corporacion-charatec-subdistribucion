
import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed
} from '@angular/core';

import {
  DatePipe,
  DecimalPipe
} from '@angular/common';

import {
  ActivatedRoute,
  RouterLink
} from '@angular/router';

import {
  Subscription
} from 'rxjs';

import {
  PaymentPopupComponent,
  RafflePaymentContext
} from '../../../shared/component/payment-popup/payment-popup.component';

import {
  PaymentMethod
} from '../../../core/config/payment.config';

import {
  ResultadoSorteoComponent
} from '../../../shared/component/resultado-sorteo/resultado-sorteo.component';

import {
  AuthService
} from '../../../core/services/auth.service';

import {
  RafflesService
} from '../../../core/services/raffles.service';

import {
  ParticipationsService
} from '../../../core/services/participations.service';

import {
  PopupService
} from '../../../core/services/popup.service';

import {
  Raffle,
  RaffleParticipation,
  RaffleContribution
} from '../../../core/models/raffle.model';


@Component({
  selector: 'app-sorteo-detalle',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    ResultadoSorteoComponent,
    PaymentPopupComponent
  ],
  templateUrl: './sorteo-detalle.component.html',
  styleUrl: './sorteo-detalle.component.css'
})
export class SorteoDetalleComponent
  implements OnInit, OnDestroy {


  //* ==========================================
  //* SERVICIOS
  //* ==========================================

  readonly authService =
    inject(AuthService);

  private readonly route =
    inject(ActivatedRoute);

  private readonly rafflesService =
    inject(RafflesService);

  private readonly participationsService =
    inject(ParticipationsService);

  private readonly popupService =
    inject(PopupService);


  //* ==========================================
  //* ESTADOS GENERALES
  //* ==========================================

  readonly sorteo =
    signal<Raffle | null>(null);

  readonly participacion =
    signal<RaffleParticipation | null>(null);

  readonly misAportes =
    signal<RaffleContribution[]>([]);

  readonly cargando = signal(true);

  readonly enviando = signal(false);

  readonly aceptaReglas = signal(false);

  readonly mensajeError = signal('');

  readonly ahora = signal(Date.now());


  //* ==========================================
  //* ESTADOS DEL POPUP
  //* ==========================================

  readonly aporteSeleccionado = signal(0);
  readonly metodoSeleccionado =
    signal<PaymentMethod>('yape');

  readonly metodoPago =
    signal<PaymentMethod | null>(null);

  readonly contextoPago =
    signal<RafflePaymentContext | null>(null);


  //* ==========================================
  //* CONTROL INTERNO
  //* ==========================================

  private idActual = 0;

  private versionCarga = 0;

  private routeSubscription?: Subscription;

  private temporizador:
    ReturnType<typeof setInterval> | null = null;


  //* ==========================================
  //* CONFIGURACION DE APORTES
  //* ==========================================

  readonly aporteMinimo = computed(() =>

    Number(
      this.sorteo()?.min_contribution ?? 0
    )

  );


  readonly aporteMaximo = computed(() =>

    Number(
      this.sorteo()?.max_contribution ?? 0
    )

  );


  readonly incrementoAporte = computed(() =>

    Number(
      this.sorteo()?.contribution_step ?? 0
    )

  );


  //* ==========================================
  //* VALIDAR MONTO SELECCIONADO
  //* ==========================================

  readonly aporteValido = computed(() => {

    const monto = this.aporteSeleccionado();

    const minimo = this.aporteMinimo();

    const maximo = this.aporteMaximo();

    const incremento = this.incrementoAporte();

    if (

      !Number.isFinite(monto) ||

      !Number.isFinite(minimo) ||

      !Number.isFinite(maximo) ||

      !Number.isFinite(incremento) ||

      minimo <= 0 ||

      maximo < minimo ||

      incremento <= 0 ||

      monto < minimo ||

      monto > maximo

    ) {

      return false;

    }

    const montoCentimos =
      Math.round(monto * 100);

    const minimoCentimos =
      Math.round(minimo * 100);

    const pasoCentimos =
      Math.round(incremento * 100);

    return (

      pasoCentimos > 0 &&

      Math.abs(
        monto * 100 - montoCentimos
      ) < 0.00001 &&

      (
        montoCentimos - minimoCentimos
      ) % pasoCentimos === 0

    );

  });


  //* ==========================================
  //* PROGRESO DEL SLIDER
  //* ==========================================
  // ==========================================
  // PORCENTAJE REFERENCIAL SOBRE LA META
  // ==========================================

  readonly probabilidadReferencial = computed(() => {

    const meta = Number(
      this.sorteo()?.collection_goal ?? 0
    );

    const monto = this.aporteSeleccionado();

    if (
      !Number.isFinite(meta) ||
      !Number.isFinite(monto) ||
      meta <= 0 ||
      !this.aporteValido()
    ) {
      return 0;
    }

    return (monto / meta) * 100;

  });
  readonly porcentajeSlider = computed(() => {

    const minimo = this.aporteMinimo();

    const maximo = this.aporteMaximo();

    const monto = this.aporteSeleccionado();


    if (

      maximo <= minimo ||

      !Number.isFinite(monto)

    ) {

      return 0;

    }

    return Math.min(

      100,

      Math.max(

        0,

        ((monto - minimo) / (maximo - minimo)) * 100

      )

    );

  });


  //* ==========================================
  //* APORTE PENDIENTE DEL CLIENTE
  //* ==========================================

  readonly aportePendiente = computed(() =>

    this.misAportes().find(

      item => item.status === 'pending'

    ) ?? null

  );


  //* ==========================================
  //* APORTES APROBADOS
  //* ==========================================

  readonly aportesAprobados = computed(() =>

    this.misAportes().filter(

      item => item.status === 'approved'

    )

  );


  //* ==========================================
  //* ULTIMO APORTE
  //* ==========================================

  readonly ultimoAporte = computed(() =>

    this.misAportes()[0] ?? null

  );


  //* ==========================================
  //* APORTE PRINCIPAL
  //* ==========================================

  readonly miAporte = computed(() =>

    this.aportePendiente() ??

    this.aportesAprobados()[0] ??

    this.ultimoAporte()

  );


  //* ==========================================
  //* CODIGO DE SOLICITUD
  //* ==========================================

  readonly codigoSolicitud = computed(() => {

    const aporte = this.miAporte();

    return aporte

      ? aporte.id.slice(0, 8).toUpperCase()

      : '';

  });


  //* ==========================================
  //* TOTAL CONFIRMADO DEL CLIENTE
  //* ==========================================

  readonly totalMontoConfirmado = computed(() => {

    const totalCentimos =

      this.aportesAprobados().reduce(

        (total, item) =>

          total + Math.round(

            Number(item.approved_amount ?? 0) * 100

          ),

        0

      );

    return totalCentimos / 100;

  });


  //* ==========================================
  //* MONTO PENDIENTE
  //* ==========================================

  readonly totalMontoPendiente = computed(() => {

    const totalCentimos =

      this.misAportes()

        .filter(item => item.status === 'pending')

        .reduce(

          (total, item) =>

            total + Math.round(

              Number(item.amount) * 100

            ),

          0

        );

    return totalCentimos / 100;

  });


  //* ==========================================
  //* DISPONIBILIDAD DEL SORTEO
  //* ==========================================

  readonly disponible = computed(() => {

    const sorteo = this.sorteo();

    if (

      !sorteo ||

      sorteo.status !== 'published' ||

      !sorteo.starts_at

    ) {

      return false;

    }

    const inicio =

      new Date(sorteo.starts_at).getTime();

    const cierre =

      new Date(sorteo.ends_at).getTime();

    return (

      this.ahora() >= inicio &&

      this.ahora() < cierre

    );

  });


  //* ==========================================
  //* PARTICIPACION VIGENTE
  //* ==========================================

  readonly tieneParticipacion = computed(() => {

    const estado =
      this.participacion()?.status;

    return (

      estado === 'pending' ||

      estado === 'approved' ||

      this.aportePendiente() !== null ||

      this.aportesAprobados().length > 0

    );

  });


  //* ==========================================
  //* VALIDAR FORMULARIO
  //* ==========================================

  readonly puedeRegistrar = computed(() =>

    this.disponible() &&



    this.authService.puedeParticipar() &&

    this.aceptaReglas() &&

    this.aporteValido() &&

    !this.cargando() &&

    !this.enviando()

  );


  //* ==========================================
  //* CONTADOR REGRESIVO
  //* ==========================================

  readonly contador = computed(() => {

    const sorteo = this.sorteo();

    const diferencia = sorteo

      ? Math.max(

        0,

        new Date(sorteo.ends_at).getTime() -

        this.ahora()

      )

      : 0;

    const total =
      Math.floor(diferencia / 1000);

    return {

      dias:

        String(

          Math.floor(total / 86400)

        ).padStart(2, '0'),

      horas:

        String(

          Math.floor((total % 86400) / 3600)

        ).padStart(2, '0'),

      minutos:

        String(

          Math.floor((total % 3600) / 60)

        ).padStart(2, '0'),

      segundos:

        String(total % 60).padStart(2, '0')

    };

  });


  //* ==========================================
  //* INICIALIZACION
  //* ==========================================

  ngOnInit(): void {

    this.routeSubscription =

      this.route.paramMap.subscribe(params => {

        this.cerrarPopupPago();

        this.idActual =
          Number(params.get('id'));

        this.aceptaReglas.set(false);

        void this.cargarDetalle();

      });


    this.temporizador = setInterval(() => {

      this.ahora.set(Date.now());

    }, 1000);

  }


  //* ==========================================
  //* DESTRUIR COMPONENTE
  //* ==========================================

  ngOnDestroy(): void {

    this.routeSubscription?.unsubscribe();

    this.versionCarga++;

    if (this.temporizador !== null) {

      clearInterval(this.temporizador);

      this.temporizador = null;

    }

  }


  //* ==========================================
  //* CARGAR DETALLE DEL SORTEO
  //* ==========================================

  async cargarDetalle(): Promise<void> {

    const version = ++this.versionCarga;

    const id = this.idActual;

    this.cargando.set(true);

    this.mensajeError.set('');

    this.sorteo.set(null);

    this.participacion.set(null);

    this.misAportes.set([]);

    try {

      if (

        !Number.isSafeInteger(id) ||

        id <= 0

      ) {

        throw new Error(
          'El identificador del sorteo no es válido.'
        );

      }


      // ACTUALIZAR SESION

      await this.authService.refresh();


      // CONSULTAR SORTEO

      const resultado =

        await this.rafflesService.obtenerPorId(id);


      if (

        resultado.status === 'draft' &&

        !this.authService.admin()

      ) {

        throw new Error(
          'Este sorteo no está disponible.'
        );

      }


      // CONSULTAR PARTICIPACIONES Y APORTES

      let participacion:
        RaffleParticipation | null = null;

      let aportes:
        RaffleContribution[] = [];


      if (this.authService.puedeParticipar()) {

        [participacion, aportes] =

          await Promise.all([

            this.participationsService
              .obtenerMiParticipacion(id),

            this.participationsService
              .listarMisAportes(id)

          ]);

      }


      // EVITAR RESULTADOS DE UNA RUTA ANTERIOR

      if (version !== this.versionCarga) {

        return;

      }


      // ACTUALIZAR ESTADOS

      this.sorteo.set(resultado);

      this.participacion.set(participacion);

      this.misAportes.set(aportes);

      this.aporteSeleccionado.set(

        Number(resultado.min_contribution ?? 0)

      );

      this.ahora.set(Date.now());


    } catch (error) {

      if (version !== this.versionCarga) {

        return;

      }

      this.mensajeError.set(

        this.obtenerError(

          error,

          'No se pudo cargar el sorteo.'

        )

      );

    } finally {

      if (version === this.versionCarga) {

        this.cargando.set(false);

      }

    }

  }


  //* ==========================================
  //* ACTUALIZAR MIS APORTES
  //* ==========================================

  async actualizarMisAportes(): Promise<void> {

    if (

      !this.authService.puedeParticipar() ||

      this.cargando() ||

      this.enviando()

    ) {

      return;

    }

    const version = this.versionCarga;

    const id = this.idActual;

    try {

      const [participacion, aportes] =

        await Promise.all([

          this.participationsService
            .obtenerMiParticipacion(id),

          this.participationsService
            .listarMisAportes(id)

        ]);

      if (

        version !== this.versionCarga ||

        id !== this.idActual

      ) {

        return;

      }

      this.participacion.set(participacion);

      this.misAportes.set(aportes);

    } catch (error) {

      if (

        version !== this.versionCarga ||

        id !== this.idActual

      ) {

        return;

      }

      await this.popupService.error(

        'No se pudo actualizar la solicitud',

        this.obtenerError(error)

      );

    }

  }


  //* ==========================================
  //* ACEPTAR REGLAS
  //* ==========================================

  cambiarAceptacion(event: Event): void {

    const input =
      event.target as HTMLInputElement;

    this.aceptaReglas.set(input.checked);

  }


  //* ==========================================
  //* CAMBIAR MONTO DEL APORTE
  //* ==========================================

  cambiarAporte(event: Event): void {

    if (

      this.enviando() ||

      this.contextoPago() !== null

    ) {

      return;

    }

    const input =
      event.target as HTMLInputElement;

    this.aporteSeleccionado.set(

      input.valueAsNumber

    );

  }


  //* ==========================================
  //* ABRIR POPUP DE PARTICIPACION
  //* ==========================================
  // ==========================================
  // SELECCIONAR METODO DE PAGO
  // ==========================================

  seleccionarMetodo(metodo: PaymentMethod): void {

    if (
      this.enviando() ||
      this.contextoPago() !== null
    ) {
      return;
    }

    this.metodoSeleccionado.set(metodo);

  }

  async participar(): Promise<void> {

    const sorteo = this.sorteo();

    if (
      !sorteo ||
      !this.puedeRegistrar() ||
      this.contextoPago() !== null
    ) {
      return;
    }

    // GENERAR IDENTIFICADOR UNICO

    const contributionId = crypto.randomUUID();

    // PREPARAR CONTEXTO DEL POPUP

    this.contextoPago.set({

      raffleId: sorteo.id,

      title: sorteo.title,

      amount: this.aporteSeleccionado(),

      participant: this.authService.nombreCompleto(),

      contributionId: contributionId

    });

    // ABRIR METODO SELECCIONADO

    this.metodoPago.set(
      this.metodoSeleccionado()
    );

  }



  //* ==========================================
  //* RECUPERAR SOLICITUD PENDIENTE
  //* ==========================================

  continuarSolicitud(): void {

    const sorteo = this.sorteo();

    const aporte = this.aportePendiente();

    if (

      !sorteo ||

      !aporte ||

      !this.authService.puedeParticipar() ||

      this.enviando() ||

      this.contextoPago() !== null

    ) {

      return;

    }

    this.contextoPago.set({

      raffleId: sorteo.id,

      title: sorteo.title,

      amount: Number(aporte.amount),

      participant:
        this.authService.nombreCompleto(),

      contributionId: aporte.id

    });

    this.metodoPago.set(

      aporte.payment_method

    );

  }


  //* ==========================================
  //* CAMBIAR METODO DECLARADO
  //* ==========================================

  cambiarMetodoPago(

    metodo: PaymentMethod

  ): void {

    if (

      this.enviando() ||

      this.contextoPago()?.contributionId

    ) {

      return;

    }

    if (!['yape', 'bcp', 'plin'].includes(metodo)) {

      return;

    }

    this.metodoPago.set(metodo);

  }


  //* ==========================================
  //* CERRAR POPUP
  //* ==========================================

  cerrarPopupPago(): void {

    this.metodoPago.set(null);

    this.contextoPago.set(null);

  }


  //* ==========================================
  //* FINALIZACION DE SOLICITUD
  //* ==========================================

async finalizarAporte(
  metodo: PaymentMethod
): Promise<void> {

  const contexto = this.contextoPago();

  if (
    !contexto ||
    !contexto.contributionId ||
    metodo !== this.metodoPago() ||
    contexto.raffleId !== this.idActual ||
    this.enviando()
  ) {
    return;
  }

  const version = this.versionCarga;

  this.enviando.set(true);

  try {

    // REGISTRAR SOLICITUD EN SUPABASE

    await this.participationsService.registrarAporte({

      raffle_id: contexto.raffleId,

      amount: contexto.amount,

      payment_method: metodo,

      contribution_id: contexto.contributionId

    });

    if (
      version !== this.versionCarga ||
      contexto.raffleId !== this.idActual
    ) {
      return;
    }

    // CERRAR MODAL DE PAGO

    this.cerrarPopupPago();

    // RESTABLECER FORMULARIO

    this.aporteSeleccionado.set(
      this.aporteMinimo()
    );

    this.aceptaReglas.set(false);

    this.enviando.set(false);

    // ACTUALIZAR HISTORIAL

    await this.actualizarMisAportes();

    // NOTIFICAR AL CLIENTE

    if (version === this.versionCarga) {

      await this.popupService.success(

        'Solicitud pendiente de aprobación',

        'Tu solicitud ha sido registrada correctamente. ' +
        'Nuestro equipo revisará tu comprobante. ' +
        'Puedes realizar otro aporte si lo deseas.'

      );

    }

  } catch (error) {

    if (version === this.versionCarga) {

      await this.popupService.error(

        'No se pudo registrar la solicitud',

        this.obtenerError(error)

      );

    }

  } finally {

    this.enviando.set(false);

  }

}



  //* ==========================================
  //* COPIAR CODIGO DE SOLICITUD
  //* ==========================================

  async copiarCodigoSolicitud(): Promise<void> {

    const aporte = this.miAporte();

    if (!aporte) {

      return;

    }

    try {

      await navigator.clipboard.writeText(

        aporte.id

      );

      await this.popupService.success(

        'Código copiado',

        'Se copió el identificador completo de tu solicitud.'

      );

    } catch {

      await this.popupService.warning(

        'No se pudo copiar',

        'Consulta el código de solicitud mostrado en pantalla.'

      );

    }

  }


  //* ==========================================
  //* ESTADO DEL SORTEO
  //* ==========================================

  readonly etiquetaEstado = computed(() => {

    const sorteo = this.sorteo();

    if (!sorteo) {

      return '';

    }

    if (this.disponible()) {

      return 'Participaciones abiertas';

    }

    switch (sorteo.status) {

      case 'draft':

        return 'Borrador';

      case 'published':

        return this.ahora() >=

          new Date(sorteo.ends_at).getTime()

          ? 'Participaciones cerradas'

          : 'Próximamente';

      case 'closed':

        return 'Participaciones cerradas';

      case 'finished':

        return 'Sorteo finalizado';

      case 'cancelled':

        return 'Sorteo cancelado';

    }

  });


  //* ==========================================
  //* ESTADO DE MI APORTE
  //* ==========================================

  readonly estadoAporte = computed(() => {

    switch (this.miAporte()?.status) {

      case 'pending':

        return 'Solicitud pendiente de revisión';

      case 'approved':

        return 'Aporte confirmado';

      case 'rejected':

        return 'Solicitud rechazada';

      case 'cancelled':

        return 'Solicitud cancelada';

      default:

        return 'Sin solicitud';

    }

  });


  //* ==========================================
  //* ESTADO DE MI PARTICIPACION
  //* ==========================================

  readonly estadoParticipacion = computed(() => {

    switch (this.participacion()?.status) {

      case 'pending':

        return 'Pendiente de revisión';

      case 'approved':

        return 'Participación aprobada';

      case 'rejected':

        return 'Participación rechazada';

      case 'cancelled':

        return 'Participación cancelada';

      default:

        return 'Sin participación';

    }

  });


  //* ==========================================
  //* NOMBRE DEL METODO DECLARADO
  //* ==========================================

  nombreMetodoPago(metodo: string): string {

    switch (metodo) {

      case 'yape':

        return 'Yape';

      case 'bcp':

        return 'BCP';

      case 'plin':

        return 'Plin';

      default:

        return metodo;

    }

  }


  //* ==========================================
  //* FORMATEAR MONTO
  //* ==========================================

  formatearMonto(

    monto: number | null

  ): string {

    if (monto === null) {

      return '—';

    }

    return 'S/ ' + Number(monto).toLocaleString(

      'es-PE',

      {

        minimumFractionDigits: 2,

        maximumFractionDigits: 2

      }

    );

  }


  //* ==========================================
  //* COMPARTIR SORTEO
  //* ==========================================

  async compartir(): Promise<void> {

    const sorteo = this.sorteo();

    if (

      !sorteo ||

      sorteo.status === 'draft'

    ) {

      return;

    }

    const url =
      window.location.href;

    try {

      if (navigator.share) {

        await navigator.share({

          title: sorteo.title,

          text:

            `Conoce este sorteo de Corporación Charatec: ${sorteo.prize}`,

          url

        });

      } else {

        await navigator.clipboard.writeText(url);

        await this.popupService.success(

          'Enlace copiado',

          'Ahora puedes compartir el sorteo con tus amigos.'

        );

      }

    } catch (error) {

      if (

        (error as { name?: string })?.name ===

        'AbortError'

      ) {

        return;

      }

      await this.popupService.warning(

        'No se pudo compartir',

        'Puedes copiar el enlace desde la barra de direcciones.'

      );

    }

  }


  //* ==========================================
  //* CONTROL DE ERRORES
  //* ==========================================

  private obtenerError(

    error: unknown,

    mensaje = 'Ocurrió un error inesperado.'

  ): string {

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

    return mensaje;

  }

}
