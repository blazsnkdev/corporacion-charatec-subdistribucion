
import {
  Component,
  ElementRef,
  viewChild,
  input,
  output,
  signal,
  effect,
  computed
} from '@angular/core';

import {
  PAYMENT_CONFIG,
  PaymentMethod
} from '../../../core/config/payment.config';


export interface RafflePaymentContext {

  raffleId: number;

  title: string;

  amount: number;

  participant: string;

  contributionId?: string;

}


@Component({
  selector: 'app-payment-popup',
  standalone: true,
  templateUrl: './payment-popup.component.html',
  styleUrl: './payment-popup.component.css'
})
export class PaymentPopupComponent {


  // ==========================================
  // INPUTS Y OUTPUTS
  // ==========================================

  readonly method =
    input<PaymentMethod | null>(null);

  readonly raffleContext =
    input<RafflePaymentContext | null>(null);

  readonly procesando =
    input<boolean>(false);

  readonly closed =
    output<void>();

  readonly methodChanged =
    output<PaymentMethod>();

  readonly completed =
    output<PaymentMethod>();


  // ==========================================
  // ESTADOS GENERALES
  // ==========================================

  readonly config = PAYMENT_CONFIG;

  readonly copiado = signal('');

  readonly errorCopia = signal('');

  readonly qrError = signal(false);

  readonly whatsappAbierto = signal(false);

  readonly comprobanteEnviado = signal(false);

  readonly errorWhatsApp = signal('');

  readonly dialog =
    viewChild<ElementRef<HTMLDialogElement>>('dialog');


  // ==========================================
  // CONFIGURACION DE WHATSAPP
  // ==========================================

  private readonly whatsappNumber =
    '51943771361';


  // ==========================================
  // CONTEXTO DEL POPUP
  // ==========================================

  readonly esSorteo = computed(() =>

    this.raffleContext() !== null

  );


  readonly monto = computed(() =>

    this.raffleContext()?.amount ?? 0

  );


  readonly montoFormateado = computed(() =>

    this.monto().toLocaleString('es-PE', {

      minimumFractionDigits: 2,

      maximumFractionDigits: 2

    })

  );


  // ==========================================
  // CODIGO DE SOLICITUD
  // ==========================================

  readonly codigoSolicitud = computed(() => {

    const id =
      this.raffleContext()?.contributionId;

    return id
      ? id.slice(0, 8).toUpperCase()
      : '';

  });


  // ==========================================
  // METODOS DE PAGO
  // ==========================================

  readonly nombre = computed(() => {

    switch (this.method()) {

      case 'bcp':
        return 'BCP';

      case 'yape':
        return 'Yape';

      case 'plin':
        return 'Plin';

      default:
        return '';

    }

  });


  readonly billetera = computed(() => {

    const metodo = this.method();

    if (
      metodo === 'yape' ||
      metodo === 'plin'
    ) {

      return this.config[metodo];

    }

    return null;

  });


  // ==========================================
  // MENSAJE DE WHATSAPP
  // ==========================================

  readonly mensajeWhatsApp = computed(() => {

    const contexto = this.raffleContext();

    if (!contexto) {
      return '';
    }

    const mensaje = [

      'Hola, Corporación Charatec.',

      '',

      'Adjunto mi captura del pago para participar en el sorteo.',

      '',

      `Sorteo: ${contexto.title}`,

      `Código de sorteo: #${contexto.raffleId}`,

      `Participante: ${contexto.participant}`,

      `Monto declarado: S/ ${this.montoFormateado()}`,

      `Método de pago: ${this.nombre()}`

    ];

    if (contexto.contributionId) {

      mensaje.push(

        `Código de solicitud: #${this.codigoSolicitud()}`,

        `ID de solicitud: ${contexto.contributionId}`

      );

    }

    mensaje.push(

      '',

      'Quedo atento a la validación de mi participación.'

    );

    return mensaje.join('\n');

  });


  // ==========================================
  // URL DE WHATSAPP
  // ==========================================

  readonly urlWhatsApp = computed(() => {

    const mensaje = this.mensajeWhatsApp();

    if (!mensaje) {
      return '';
    }

    return `https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(mensaje)}`;

  });


  // ==========================================
  // VALIDAR APERTURA DE WHATSAPP
  // ==========================================

  readonly puedeAbrirWhatsApp = computed(() =>

    this.esSorteo() &&

    this.method() !== null &&

    this.monto() > 0 &&

    Number.isFinite(this.monto()) &&

    !this.whatsappAbierto() &&

    !this.procesando()

  );


  // ==========================================
  // VALIDAR FINALIZACION
  // ==========================================

  readonly puedeFinalizar = computed(() =>

    this.esSorteo() &&

    this.method() !== null &&

    this.whatsappAbierto() &&

    !this.procesando()

  );


  // ==========================================
  // TEXTO DINAMICO DEL BOTON
  // ==========================================

  readonly textoBotonComprobante = computed(() => {

    if (this.procesando()) {

      return 'Procesando solicitud...';

    }

    return this.whatsappAbierto()

      ? 'Ya envié mi comprobante'

      : 'Enviar comprobante por WhatsApp';

  });


  // ==========================================
  // ESTADO DEL BOTON PRINCIPAL
  // ==========================================

  readonly botonComprobanteHabilitado = computed(() => {

    if (this.procesando()) {

      return false;

    }

    return this.whatsappAbierto()

      ? this.puedeFinalizar()

      : this.puedeAbrirWhatsApp();

  });


  // ==========================================
  // INICIALIZACION
  // ==========================================

  constructor() {

    effect(() => {

      const metodo = this.method();

      const dialog =
        this.dialog()?.nativeElement;

      this.raffleContext();


      // REINICIAR ESTADOS

      this.copiado.set('');

      this.errorCopia.set('');

      this.qrError.set(false);

      this.whatsappAbierto.set(false);

      this.comprobanteEnviado.set(false);

      this.errorWhatsApp.set('');


      if (!dialog) {

        return;

      }


      // ABRIR POPUP

      if (metodo && !dialog.open) {

        dialog.showModal();

      }


      // CERRAR POPUP

      else if (!metodo && dialog.open) {

        dialog.close();

      }

    });

  }


  // ==========================================
  // SELECCIONAR METODO
  // ==========================================

  seleccionarMetodo(
    metodo: PaymentMethod
  ): void {

    if (
      this.procesando() ||
      this.whatsappAbierto() ||
      this.raffleContext()?.contributionId
    ) {

      return;

    }

    if (this.method() === metodo) {

      return;

    }

    this.whatsappAbierto.set(false);

    this.comprobanteEnviado.set(false);

    this.errorWhatsApp.set('');

    this.methodChanged.emit(metodo);

  }


  // ==========================================
  // ACCION DEL BOTON DINAMICO
  // ==========================================

  accionComprobante(): void {

    if (!this.botonComprobanteHabilitado()) {

      return;

    }


    // PRIMER CLICK: ABRIR WHATSAPP

    if (!this.whatsappAbierto()) {

      this.abrirWhatsApp();

      return;

    }


    // SEGUNDO CLICK: CONFIRMAR ENVIO DECLARADO

    this.finalizarParticipacion();

  }


  // ==========================================
  // ABRIR WHATSAPP
  // ==========================================

abrirWhatsApp(): void {

  if (!this.puedeAbrirWhatsApp()) {
    return;
  }

  const url = this.urlWhatsApp();

  if (!url) {
    return;
  }

  this.errorWhatsApp.set('');

  try {

    const ventana = window.open(
      'about:blank',
      '_blank'
    );

    if (!ventana) {

      this.errorWhatsApp.set(
        'Permite las ventanas emergentes para abrir WhatsApp.'
      );

      return;

    }

    ventana.opener = null;
    ventana.location.href = url;

    this.registrarAperturaWhatsApp();

  } catch {

    this.errorWhatsApp.set(
      'No se pudo abrir WhatsApp.'
    );

  }

}


  // ==========================================
  // REGISTRAR APERTURA DE WHATSAPP
  // ==========================================

  registrarAperturaWhatsApp(): void {

    if (!this.puedeAbrirWhatsApp()) {

      return;

    }

    this.errorWhatsApp.set('');

    this.whatsappAbierto.set(true);

    this.comprobanteEnviado.set(false);

  }


  // ==========================================
  // COMPATIBILIDAD CON HTML ANTERIOR
  // ==========================================

  simularWhatsApp(): void {

    this.errorWhatsApp.set(
      'El registro de nuevas solicitudes todavía no está habilitado.'
    );

  }


  cambiarComprobanteEnviado(
    valor: boolean
  ): void {

    if (
      !this.whatsappAbierto() ||
      this.procesando()
    ) {

      return;

    }

    this.comprobanteEnviado.set(valor);

  }


  // ==========================================
  // FINALIZAR PARTICIPACION
  // ==========================================

  finalizarParticipacion(): void {

    const metodo = this.method();

    if (
      !metodo ||
      !this.puedeFinalizar()
    ) {

      return;

    }

    this.comprobanteEnviado.set(true);

    this.errorWhatsApp.set('');


    // NOTIFICAR AL COMPONENTE PADRE
    // EL PADRE REGISTRA Y CIERRA EL POPUP
    // SOLAMENTE SI EL REGISTRO ES CORRECTO

    this.completed.emit(metodo);

  }


  // ==========================================
  // COPIAR DATOS BANCARIOS
  // ==========================================

  async copiar(
    valor: string,
    campo: string
  ): Promise<void> {

    if (!valor) {

      return;

    }

    this.errorCopia.set('');

    try {

      await navigator.clipboard.writeText(valor);

      this.copiado.set(campo);

    } catch {

      this.errorCopia.set(
        'No se pudo copiar. Selecciona el número manualmente.'
      );

    }

  }


  // ==========================================
  // COPIAR CODIGO DE SOLICITUD
  // ==========================================

  async copiarCodigoSolicitud(): Promise<void> {

    const id =
      this.raffleContext()?.contributionId;

    if (!id) {

      return;

    }

    await this.copiar(
      id,
      'solicitud'
    );

  }


  // ==========================================
  // CERRAR POPUP
  // ==========================================

  cerrar(): void {

    if (this.procesando()) {

      return;

    }

    this.closed.emit();

  }


  // ==========================================
  // CANCELAR POPUP
  // ==========================================

  cancelar(event: Event): void {

    event.preventDefault();

    this.cerrar();

  }

}
