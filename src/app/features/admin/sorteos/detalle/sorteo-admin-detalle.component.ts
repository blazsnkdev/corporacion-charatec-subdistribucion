
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

import {
  ActivatedRoute,
  RouterLink
} from '@angular/router';

import { Subscription } from 'rxjs';

import {
  RafflesService
} from '../../../../core/services/raffles.service';

import {
  ParticipationsService
} from '../../../../core/services/participations.service';

import {
  PopupService
} from '../../../../core/services/popup.service';

import {
  Raffle,
  RaffleContributionAdmin,
  RaffleUpdateRequest
} from '../../../../core/models/raffle.model';


type FiltroAporte =
  | 'all'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';


@Component({
  selector: 'app-sorteo-admin-detalle',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    FormsModule
  ],
  templateUrl: './sorteo-admin-detalle.component.html',
  styleUrl: './sorteo-admin-detalle.component.css'
})
export class SorteoAdminDetalleComponent
  implements OnInit, OnDestroy {


  // ==========================================
  // SERVICIOS
  // ==========================================

  private readonly route =
    inject(ActivatedRoute);

  private readonly rafflesService =
    inject(RafflesService);

  private readonly participationsService =
    inject(ParticipationsService);

  private readonly popupService =
    inject(PopupService);


  // ==========================================
  // ESTADOS GENERALES
  // ==========================================

  readonly sorteo =
    signal<Raffle | null>(null);

  readonly aportes =
    signal<RaffleContributionAdmin[]>([]);

  readonly cargando = signal(true);

  readonly guardando = signal(false);

  readonly procesando = signal(false);

  readonly mensajeError = signal('');

  readonly mostrarMontos = signal(false);


  // ==========================================
  // CONTROL INTERNO
  // ==========================================

  private raffleId = 0;

  private versionCarga = 0;

  private routeSubscription?: Subscription;


  // ==========================================
  // BUSQUEDA Y PAGINACION
  // ==========================================

  readonly busquedaAportes = signal('');

  readonly filtroAportes =
    signal<FiltroAporte>('pending');

  readonly paginaAportes = signal(1);

  readonly tamanioPaginaAportes = signal(10);


  // ==========================================
  // CONFIGURACION DEL SORTEO
  // ==========================================

  readonly aporteMinimo = computed(() =>
    Number(this.sorteo()?.min_contribution ?? 0)
  );

  readonly aporteMaximo = computed(() =>
    Number(this.sorteo()?.max_contribution ?? 0)
  );

  readonly incrementoAporte = computed(() =>
    Number(this.sorteo()?.contribution_step ?? 0)
  );

  readonly metaRecaudacion = computed(() =>
    Number(this.sorteo()?.collection_goal ?? 0)
  );


  // ==========================================
  // TOTAL RECAUDADO
  // SOLO APORTES APROBADOS
  // ==========================================

  readonly totalRecaudado = computed(() => {

    const centimos = this.aportes()

      .filter(item => item.status === 'approved')

      .reduce((total, item) => {

        return total + Math.round(
          Number(item.approved_amount ?? 0) * 100
        );

      }, 0);

    return centimos / 100;

  });


  // ==========================================
  // ESTADOS DE APORTES
  // ==========================================

  readonly estadisticasAportes = computed(() => ({

    total: this.aportes().length,

    pending: this.aportes().filter(
      item => item.status === 'pending'
    ).length,

    approved: this.aportes().filter(
      item => item.status === 'approved'
    ).length,

    rejected: this.aportes().filter(
      item => item.status === 'rejected'
    ).length,

    cancelled: this.aportes().filter(
      item => item.status === 'cancelled'
    ).length

  }));


  // ==========================================
  // FILTRAR APORTES
  // ==========================================

  readonly aportesFiltrados = computed(() => {

    const termino = this.normalizar(
      this.busquedaAportes()
    );

    const estado = this.filtroAportes();

    return this.aportes()

      .filter(item => {

        const texto = this.normalizar(

          `${item.id}
           ${item.participant_name}
           ${item.participant_type}
           ${item.phone ?? ''}
           ${item.ruc ?? ''}
           ${item.payment_method}`

        );

        return (

          (estado === 'all' ||
            item.status === estado) &&

          (!termino || texto.includes(termino))

        );

      })

      .sort((a, b) =>

        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()

      );

  });


  // ==========================================
  // PAGINACION
  // ==========================================
readonly totalPaginasAportes = computed(() =>
  Math.max(
    1,
    Math.ceil(
      this.aportesFiltrados().length /
      this.tamanioPaginaAportes()
    )
  )
);

readonly aportesPaginados = computed(() => {

  const inicio =
    (this.paginaAportes() - 1) *
    this.tamanioPaginaAportes();

  return this.aportesFiltrados().slice(
    inicio,
    inicio + this.tamanioPaginaAportes()
  );

});

readonly registroInicialAportes = computed(() => {

  if (this.aportesFiltrados().length === 0) {
    return 0;
  }

  return (
    (this.paginaAportes() - 1) *
    this.tamanioPaginaAportes()
  ) + 1;

});

readonly registroFinalAportes = computed(() =>

  Math.min(
    this.paginaAportes() *
    this.tamanioPaginaAportes(),
    this.aportesFiltrados().length
  )

);

  // ==========================================
  // EDICION DEL SORTEO
  // ==========================================

  readonly editandoSorteo = signal(false);

  readonly vistaPrevia = signal('');

  readonly archivoImagen =
    signal<File | null>(null);


  formulario: RaffleUpdateRequest = {

    title: '',

    description: '',

    prize: '',

    rules: '',

    image: null,

    ends_at: '',

    draw_at: '',

    min_contribution: null,

    max_contribution: null,

    contribution_step: null,

    collection_goal: null

  };


  readonly puedeEditarSorteo = computed(() => {

    const item = this.sorteo();

    return !!item &&

      !this.cargando() &&

      !this.guardando() &&

      !this.procesando() &&

      (
        item.status === 'draft' ||
        item.status === 'published'
      );

  });


  // ==========================================
  // REVISION DE APORTES
  // ==========================================

  readonly aporteSeleccionado =
    signal<RaffleContributionAdmin | null>(null);

  readonly montoConfirmado =
    signal<number | null>(null);

  readonly referenciaOperacion = signal('');

  readonly observacion = signal('');

  readonly transferenciaVerificada = signal(false);


  readonly diferenciaMonto = computed(() => {

    const aporte = this.aporteSeleccionado();

    const monto = this.montoConfirmado();

    if (!aporte || monto === null) {
      return 0;
    }

    return Math.round(

      (monto - Number(aporte.amount)) * 100

    ) / 100;

  });


  readonly montoConfirmadoValido = computed(() => {

    const monto = this.montoConfirmado();

    if (
      monto === null ||
      !Number.isFinite(monto) ||
      monto <= 0 ||
      monto > 9999999999.99 ||
      Math.abs(
        monto * 100 - Math.round(monto * 100)
      ) > 0.00001
    ) {
      return false;
    }

    return (

      monto >= this.aporteMinimo() &&

      monto <= this.aporteMaximo()

    );

  });


  readonly puedeAprobar = computed(() => {

    const aporte = this.aporteSeleccionado();

    return !!aporte &&

      this.puedeRevisarAporte(aporte) &&

      !this.procesando() &&

      this.montoConfirmadoValido() &&

      this.transferenciaVerificada() &&

      this.referenciaOperacion().trim().length > 0 &&

      this.referenciaOperacion().trim().length <= 150 &&

      this.observacion().trim().length <= 500 &&

      (
        this.diferenciaMonto() === 0 ||
        this.observacion().trim().length > 0
      );

  });


  readonly puedeRechazar = computed(() => {

    const aporte = this.aporteSeleccionado();

    return !!aporte &&

      this.puedeRevisarAporte(aporte) &&

      !this.procesando() &&

      this.observacion().trim().length > 0 &&

      this.observacion().trim().length <= 500;

  });


  // ==========================================
  // ACCESO A RULETA
  // ==========================================

  readonly puedeAbrirRuleta = computed(() => {

    const item = this.sorteo();

    return !!item &&

      !this.cargando() &&

      !this.mensajeError() &&

      !this.procesando() &&

      item.status !== 'cancelled';

  });


  // ==========================================
  // INICIALIZACION
  // ==========================================

  ngOnInit(): void {

    this.routeSubscription =

      this.route.paramMap.subscribe(params => {

        this.raffleId = Number(
          params.get('id')
        );

        this.mostrarMontos.set(false);

        this.busquedaAportes.set('');

        this.filtroAportes.set('pending');

        this.paginaAportes.set(1);

        this.editandoSorteo.set(false);

        this.aporteSeleccionado.set(null);

        void this.cargarDetalle();

      });

  }


  ngOnDestroy(): void {

    this.routeSubscription?.unsubscribe();

    this.versionCarga++;

  }


  // ==========================================
  // CARGAR DETALLE
  // ==========================================

  async cargarDetalle(): Promise<void> {

    const version = ++this.versionCarga;

    const id = this.raffleId;

    this.cargando.set(true);

    this.mensajeError.set('');

    this.sorteo.set(null);

    this.aportes.set([]);

    try {

      if (
        !Number.isSafeInteger(id) ||
        id <= 0
      ) {

        throw new Error(
          'El identificador del sorteo no es válido.'
        );

      }

      const [sorteo, aportes] =

        await Promise.all([

          this.rafflesService.obtenerPorId(id),

          this.participationsService
            .listarAportesAdmin(id)

        ]);

      if (version !== this.versionCarga) {
        return;
      }

      this.sorteo.set(sorteo);

      this.aportes.set(aportes);

      this.paginaAportes.set(

        Math.min(

          this.paginaAportes(),

          this.totalPaginasAportes()

        )

      );

    } catch (error) {

      if (version !== this.versionCarga) {
        return;
      }

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
  // MOSTRAR U OCULTAR TOTAL RECAUDADO
  // ==========================================

  alternarMontos(): void {

    this.mostrarMontos.update(
      valor => !valor
    );

  }


  // ==========================================
  // ABRIR FORMULARIO DE EDICION
  // ==========================================

  abrirEdicion(): void {

    const item = this.sorteo();

    if (!item || !this.puedeEditarSorteo()) {
      return;
    }

    this.formulario = {

      title: item.title,

      description: item.description,

      prize: item.prize,

      rules: item.rules,

      image: item.image,

      ends_at: this.fechaLocal(item.ends_at),

      draw_at: this.fechaLocal(item.draw_at),

      min_contribution: item.min_contribution,

      max_contribution: item.max_contribution,

      contribution_step: item.contribution_step,

      collection_goal: item.collection_goal

    };

    this.archivoImagen.set(null);

    this.vistaPrevia.set(item.image ?? '');

    this.editandoSorteo.set(true);

  }


  // ==========================================
  // CERRAR EDICION
  // ==========================================

  cerrarEdicion(): void {

    if (this.guardando()) {
      return;
    }

    this.editandoSorteo.set(false);

    this.archivoImagen.set(null);

    this.vistaPrevia.set('');

  }


  // ==========================================
  // SELECCIONAR IMAGEN
  // ==========================================

  async seleccionarImagen(event: Event): Promise<void> {

    const input =
      event.target as HTMLInputElement;

    const archivo = input.files?.[0];

    if (!archivo) {
      return;
    }

    if (![
      'image/jpeg',
      'image/png',
      'image/webp'
    ].includes(archivo.type)) {

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

        'El tamaño máximo permitido es de 2 MB.'

      );

      return;

    }

    this.archivoImagen.set(archivo);

    const reader = new FileReader();

    reader.onload = () => {

      if (this.archivoImagen() === archivo) {

        this.vistaPrevia.set(
          String(reader.result ?? '')
        );

      }

    };

    reader.readAsDataURL(archivo);

  }


  quitarImagen(): void {

    if (this.guardando()) {
      return;
    }

    this.archivoImagen.set(null);

    this.vistaPrevia.set('');

    this.formulario.image = null;

  }


  // ==========================================
  // GUARDAR CAMBIOS DEL SORTEO
  // ==========================================

  async guardarSorteo(): Promise<void> {

    const item = this.sorteo();

    if (
      !item ||
      !this.editandoSorteo() ||
      !this.puedeEditarSorteo()
    ) {
      return;
    }

    const version = this.versionCarga;

    const formulario = { ...this.formulario };

    this.guardando.set(true);

    try {

      const minimo = Number(
        formulario.min_contribution
      );

      const maximo = Number(
        formulario.max_contribution
      );

      const paso = Number(
        formulario.contribution_step
      );

      const meta = Number(
        formulario.collection_goal
      );

      const montos = [
        minimo,
        maximo,
        paso,
        meta
      ];

      if (montos.some(valor =>

        !Number.isFinite(valor) ||

        valor <= 0 ||

        valor > 9999999999.99 ||

        Math.abs(
          valor * 100 - Math.round(valor * 100)
        ) > 0.00001

      )) {

        throw new Error(
          'Ingresa una configuración de aportes válida.'
        );

      }

      if (maximo < minimo) {

        throw new Error(

          'El aporte máximo no puede ser menor al mínimo.'

        );

      }

      const minimoCentimos = Math.round(minimo * 100);

      const maximoCentimos = Math.round(maximo * 100);

      const pasoCentimos = Math.round(paso * 100);

      if (
        pasoCentimos <= 0 ||
        (maximoCentimos - minimoCentimos) %
          pasoCentimos !== 0
      ) {

        throw new Error(
          'El incremento debe coincidir con el rango de aportes.'
        );

      }

      if (
        !formulario.title.trim() ||
        !formulario.description.trim() ||
        !formulario.prize.trim() ||
        !formulario.rules.trim()
      ) {

        throw new Error(
          'Completa toda la información del sorteo.'
        );

      }

      // PROTEGER APORTES EXISTENTES

      const cambioCondiciones =

        minimo !== this.aporteMinimo() ||

        maximo !== this.aporteMaximo() ||

        paso !== this.incrementoAporte() ||

        meta !== this.metaRecaudacion();

      if (
        cambioCondiciones &&
        this.aportes().some(aporte =>

          aporte.status === 'pending' ||
          aporte.status === 'approved'

        )
      ) {

        throw new Error(

          'No puedes cambiar las condiciones económicas ' +
          'si existen aportes pendientes o aprobados.'

        );

      }

      const cierre = new Date(
        formulario.ends_at + ':00-05:00'
      );

      const fechaSorteo = new Date(
        formulario.draw_at + ':00-05:00'
      );

      if (
        !Number.isFinite(cierre.getTime()) ||
        !Number.isFinite(fechaSorteo.getTime()) ||
        cierre.getTime() <= Date.now() ||
        fechaSorteo.getTime() < cierre.getTime()
      ) {

        throw new Error(
          'Revisa las fechas del sorteo.'
        );

      }

      let imagen = formulario.image;

      const archivo = this.archivoImagen();

      if (archivo) {

        imagen = await this.rafflesService
          .subirImagen(archivo);

      }

      const request: RaffleUpdateRequest = {

        title: formulario.title.trim(),

        description: formulario.description.trim(),

        prize: formulario.prize.trim(),

        rules: formulario.rules.trim(),

        image: imagen,

        ends_at: cierre.toISOString(),

        draw_at: fechaSorteo.toISOString(),

        min_contribution: minimo,

        max_contribution: maximo,

        contribution_step: paso,

        collection_goal: meta

      };

      await this.rafflesService.actualizar(
        item.id,
        request
      );

      if (version !== this.versionCarga) {
        return;
      }

      this.editandoSorteo.set(false);

      this.archivoImagen.set(null);

      this.vistaPrevia.set('');

      await this.cargarDetalle();

      await this.popupService.success(

        'Sorteo actualizado',

        'Los cambios se guardaron correctamente.'

      );

    } catch (error) {

      if (version === this.versionCarga) {

        await this.popupService.error(

          'No se pudo actualizar el sorteo',

          this.obtenerError(error)

        );

      }

    } finally {

      this.guardando.set(false);

    }

  }


  // ==========================================
  // VALIDAR SI UNA SOLICITUD ES REVISABLE
  // ==========================================

  puedeRevisarAporte(
    aporte: RaffleContributionAdmin
  ): boolean {

    const estado = this.sorteo()?.status;

    return (

      aporte.status === 'pending' &&

      (
        estado === 'published' ||
        estado === 'closed'
      )

    );

  }


  // ==========================================
  // ABRIR REVISION DE SOLICITUD
  // ==========================================

  abrirRevision(
    aporte: RaffleContributionAdmin
  ): void {

    if (
      this.procesando() ||
      !this.puedeRevisarAporte(aporte)
    ) {
      return;
    }

    this.aporteSeleccionado.set(aporte);

    this.montoConfirmado.set(
      Number(aporte.amount)
    );

    this.referenciaOperacion.set('');

    this.observacion.set('');

    this.transferenciaVerificada.set(false);

  }


  // ==========================================
  // CERRAR REVISION
  // ==========================================

  cerrarRevision(): void {

    if (this.procesando()) {
      return;
    }

    this.limpiarRevision();

  }


  private limpiarRevision(): void {

    this.aporteSeleccionado.set(null);

    this.montoConfirmado.set(null);

    this.referenciaOperacion.set('');

    this.observacion.set('');

    this.transferenciaVerificada.set(false);

  }


  // ==========================================
  // MODIFICAR MONTO CONFIRMADO
  // ==========================================

  cambiarMontoConfirmado(valor: number | null): void {

    this.montoConfirmado.set(valor);

    this.transferenciaVerificada.set(false);

  }


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


  cambiarReferenciaOperacion(valor: string): void {

    this.referenciaOperacion.set(valor);

    this.transferenciaVerificada.set(false);

  }


  // ==========================================
  // APROBAR O RECHAZAR APORTE
  // ==========================================

  async revisarAporte(
    estado: 'approved' | 'rejected'
  ): Promise<void> {

    const aporte = this.aporteSeleccionado();

    if (
      !aporte ||
      this.procesando() ||
      !this.puedeRevisarAporte(aporte)
    ) {
      return;
    }

    if (
      estado === 'approved' &&
      !this.puedeAprobar()
    ) {
      return;
    }

    if (
      estado === 'rejected' &&
      !this.puedeRechazar()
    ) {
      return;
    }

    const version = this.versionCarga;

    const esAprobacion = estado === 'approved';

    const monto = this.montoConfirmado();

    const referencia =
      this.referenciaOperacion().trim();

    const comentario =
      this.observacion().trim();

    this.procesando.set(true);

    try {

      const confirmado = await this.popupService.confirm(

        esAprobacion
          ? 'Aprobar aporte'
          : 'Rechazar solicitud',

        esAprobacion

          ? `¿Confirmas el aporte de ${
              this.formatearMonto(monto)
            } correspondiente a ${
              aporte.participant_name
            }?`

          : `¿Deseas rechazar la solicitud de ${
              aporte.participant_name
            }?`,

        esAprobacion
          ? 'Aprobar'
          : 'Rechazar'

      );

      if (
        !confirmado ||
        version !== this.versionCarga
      ) {
        return;
      }

      await this.participationsService.revisarAporte({

        contribution_id: aporte.id,

        status: estado,

        approved_amount: esAprobacion
          ? monto
          : null,

        operation_reference: esAprobacion
          ? referencia
          : null,

        admin_comment: comentario

      });

      if (version !== this.versionCarga) {
        return;
      }

      this.limpiarRevision();

      await this.cargarDetalle();

      await this.popupService.success(

        esAprobacion
          ? 'Aporte aprobado'
          : 'Solicitud rechazada',

        esAprobacion
          ? 'El monto confirmado se ha registrado.'
          : 'La solicitud ha sido rechazada.'

      );

    } catch (error) {

      if (version === this.versionCarga) {

        await this.popupService.error(

          'No se pudo revisar la solicitud',

          this.obtenerError(error)

        );

      }

    } finally {

      this.procesando.set(false);

    }

  }


  // ==========================================
  // CONTACTAR AL CLIENTE
  // ==========================================

  enlaceWhatsApp(
    aporte: RaffleContributionAdmin
  ): string {

    const telefono = (
      aporte.phone ?? ''
    ).replace(/\D/g, '');

    if (!telefono) {
      return '';
    }

    const numero = telefono.length === 9

      ? '51' + telefono

      : telefono;

    if (!/^519\d{8}$/.test(numero)) {
      return '';
    }

    const mensaje =

      `Hola ${aporte.participant_name}, ` +

      `te contactamos de Corporación Charatec ` +

      `por tu solicitud #${aporte.id.slice(0, 8).toUpperCase()}.`;

    return `https://wa.me/${numero}?text=${
      encodeURIComponent(mensaje)
    }`;

  }


  // ==========================================
  // BUSQUEDA
  // ==========================================

  cambiarBusquedaAportes(event: Event): void {

    const input =
      event.target as HTMLInputElement;

    this.busquedaAportes.set(input.value);

    this.paginaAportes.set(1);

  }


  // ==========================================
  // FILTRAR POR ESTADO
  // ==========================================

  cambiarFiltroAportes(event: Event): void {

    const select =
      event.target as HTMLSelectElement;

    const valor = select.value as FiltroAporte;

    if (![

      'all',
      'pending',
      'approved',
      'rejected',
      'cancelled'

    ].includes(valor)) {
      return;
    }

    this.filtroAportes.set(valor);

    this.paginaAportes.set(1);

  }


  limpiarFiltrosAportes(): void {

    this.busquedaAportes.set('');

    this.filtroAportes.set('pending');

    this.paginaAportes.set(1);

  }


  // ==========================================
  // CONTROLES DE PAGINACION
  // ==========================================

  cambiarTamanioPaginaAportes(event: Event): void {

  const select = event.target as HTMLSelectElement;

  const cantidad = Number(select.value);

  if (![10, 15, 25, 50].includes(cantidad)) {
    return;
  }

  this.tamanioPaginaAportes.set(cantidad);

  this.paginaAportes.set(1);

}
  paginaAnteriorAportes(): void {

    if (this.paginaAportes() > 1) {

      this.paginaAportes.update(
        pagina => pagina - 1
      );

    }

  }


  paginaSiguienteAportes(): void {

    if (
      this.paginaAportes() <
      this.totalPaginasAportes()
    ) {

      this.paginaAportes.update(
        pagina => pagina + 1
      );

    }

  }


  // ==========================================
  // FORMATEAR MONTO
  // ==========================================

  formatearMonto(monto: number | null): string {

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


  // ==========================================
  // NOMBRE DEL METODO DE PAGO
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
  // TIPO DE PARTICIPANTE
  // ==========================================

  nombreTipo(tipo: string): string {

    const tipos: Record<string, string> = {

      customer: 'Cliente particular',

      distributor: 'Cliente empresa',

      unknown: 'Sin perfil'

    };

    return tipos[tipo] ?? tipo;

  }


  // ==========================================
  // ESTADO DE APORTE
  // ==========================================

  nombreEstadoAporte(estado: string): string {

    const estados: Record<string, string> = {

      pending: 'Pendiente',

      approved: 'Aprobado',

      rejected: 'Rechazado',

      cancelled: 'Cancelado'

    };

    return estados[estado] ?? estado;

  }


  // ==========================================
  // ESTADO DEL SORTEO
  // ==========================================

  nombreEstado(estado: string): string {

    const estados: Record<string, string> = {

      draft: 'Borrador',

      published: 'Publicado',

      closed: 'Cerrado',

      finished: 'Finalizado',

      cancelled: 'Cancelado'

    };

    return estados[estado] ?? estado;

  }


  // ==========================================
  // CONVERTIR FECHA A HORARIO PERU
  // ==========================================

  private fechaLocal(valor: string): string {

    const fecha = new Date(valor);

    if (!Number.isFinite(fecha.getTime())) {
      return '';
    }

    const fechaPeru = new Date(

      fecha.getTime() - 5 * 60 * 60 * 1000

    );

    return fechaPeru.toISOString().slice(0, 16);

  }


  // ==========================================
  // NORMALIZAR BUSQUEDA
  // ==========================================

  private normalizar(texto: string): string {

    return texto

      .normalize('NFD')

      .replace(/[\u0300-\u036f]/g, '')

      .trim()

      .toLowerCase();

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

    return 'Ocurrió un error inesperado.';

  }

}
