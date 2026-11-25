import {
  Component,
  inject,
  signal
} from '@angular/core';

import { RouterLink } from '@angular/router';

import {
  AuthService
} from '../../core/services/auth.service';

import {
  PaymentPopupComponent
} from '../../shared/component/payment-popup/payment-popup.component';

import {
  PaymentMethod
} from '../../core/config/payment.config';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [
    RouterLink,
    PaymentPopupComponent
  ],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {

  readonly authService = inject(AuthService);

  readonly anioActual = new Date().getFullYear();

  readonly paymentMethod =
    signal<PaymentMethod | null>(null);

  abrirPago(method: PaymentMethod): void {

    this.paymentMethod.set(method);

  }

  cerrarPago(): void {

    this.paymentMethod.set(null);

  }

}