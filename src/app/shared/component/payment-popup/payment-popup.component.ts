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

@Component({
  selector: 'app-payment-popup',
  standalone: true,
  templateUrl: './payment-popup.component.html',
  styleUrl: './payment-popup.component.css'
})
export class PaymentPopupComponent {

  readonly method = input<PaymentMethod | null>(null);

  readonly closed = output<void>();

  readonly config = PAYMENT_CONFIG;

  readonly copiado = signal('');

  readonly errorCopia = signal('');

  readonly qrError = signal(false);

  readonly dialog =
    viewChild<ElementRef<HTMLDialogElement>>('dialog');

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

    if (metodo === 'yape' || metodo === 'plin') {
      return this.config[metodo];
    }

    return null;

  });

  constructor() {

    effect(() => {

      const metodo = this.method();

      const dialog = this.dialog()?.nativeElement;

      this.copiado.set('');
      this.errorCopia.set('');
      this.qrError.set(false);

      if (!dialog) return;

      if (metodo && !dialog.open) {

        dialog.showModal();

      } else if (!metodo && dialog.open) {

        dialog.close();

      }

    });

  }

  async copiar(
    valor: string,
    campo: string
  ): Promise<void> {

    if (!valor) return;

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

  cerrar(): void {
    this.closed.emit();
  }

  cancelar(event: Event): void {

    event.preventDefault();

    this.cerrar();

  }

}