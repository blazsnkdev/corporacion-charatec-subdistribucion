
import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  ConfiguracionService
} from '../../../core/services/configuracion.service';

import {
  AuthService
} from '../../../core/services/auth.service';

@Component({
  selector: 'app-tipo-cambio',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './tipo-cambio.component.html',
  styleUrl: './tipo-cambio.component.css'
})
export class TipoCambioComponent implements OnInit {

  private readonly configuracionService =
    inject(ConfiguracionService);

  private readonly authService =
    inject(AuthService);

  readonly actual = signal(3.75);

  readonly cargando = signal(true);
  readonly busy = signal(false);

  readonly mensaje = signal('');
  readonly error = signal(false);

  nuevoTipoCambio = 3.75;

  readonly ejemplos = [
    100,
    500,
    1000,
    1500,
    2000
  ];

  async ngOnInit(): Promise<void> {

    await this.cargarTipoCambio();

  }

  async cargarTipoCambio(): Promise<void> {

    this.cargando.set(true);

    try {

      const rate =
        await this.configuracionService.obtenerTipoCambio();

      this.actual.set(rate);

      this.nuevoTipoCambio = rate;

    } catch (error) {

      this.mostrarError(error);

    } finally {

      this.cargando.set(false);

    }

  }

  convertir(dolares: number): number {

    return dolares *
      (Number(this.nuevoTipoCambio) || 0);

  }

  restablecer(): void {

    this.nuevoTipoCambio = this.actual();

    this.mensaje.set('');

  }

  async guardar(): Promise<void> {

    if (
      this.busy() ||
      !this.authService.admin()
    ) {
      return;
    }

    this.mensaje.set('');
    this.error.set(false);

    if (
      !Number.isFinite(this.nuevoTipoCambio) ||
      this.nuevoTipoCambio <= 0 ||
      this.nuevoTipoCambio > 999999.9999
    ) {

      this.mostrarError(
        new Error('Ingresa un tipo de cambio válido.')
      );

      return;

    }

    this.busy.set(true);

    try {

      await this.configuracionService
        .actualizarTipoCambio(this.nuevoTipoCambio);

      await this.cargarTipoCambio();

      if (!this.error()) {

        this.mensaje.set(
          'Tipo de cambio actualizado correctamente.'
        );

      }

    } catch (error) {

      this.mostrarError(error);

    } finally {

      this.busy.set(false);

    }

  }

  private mostrarError(error: unknown): void {

    this.error.set(true);

    this.mensaje.set(
      (error as { message?: string })?.message ||
      'No se pudo completar la operación.'
    );

  }

}
