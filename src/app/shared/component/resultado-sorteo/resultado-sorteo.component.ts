
import {
  Component,
  inject,
  input,
  signal,
  effect
} from '@angular/core';

import { DatePipe } from '@angular/common';

import {
  RaffleDrawService
} from '../../../core/services/raffle-draw.service';

import {
  AuthService
} from '../../../core/services/auth.service';

import {
  PublicRaffleResult
} from '../../../core/models/raffle.model';


@Component({
  selector: 'app-resultado-sorteo',
  standalone: true,
  imports: [
    DatePipe
  ],
  templateUrl: './resultado-sorteo.component.html',
  styleUrl: './resultado-sorteo.component.css'
})
export class ResultadoSorteoComponent {

  private readonly drawService =
    inject(RaffleDrawService);

  private readonly authService =
    inject(AuthService);


  // ==========================================
  // INPUTS
  // ==========================================

  readonly raffleId = input.required<number>();


  // ==========================================
  // ESTADOS
  // ==========================================

  readonly resultado =
    signal<PublicRaffleResult | null>(null);

  readonly cargando = signal(true);

  readonly mensajeError = signal('');

  private versionConsulta = 0;


  // ==========================================
  // INICIALIZACION REACTIVA
  // ==========================================

  constructor() {

    effect((onCleanup) => {

      const id = this.raffleId();

      // Volver a consultar si cambia la sesion.

      const usuario = this.authService.userId();

      void this.cargarResultado(id);

      onCleanup(() => {

        this.versionConsulta++;

      });

    });

  }


  // ==========================================
  // CARGAR RESULTADO OFICIAL
  // ==========================================

  async cargarResultado(
    raffleId: number = this.raffleId()
  ): Promise<void> {

    const version = ++this.versionConsulta;

    this.cargando.set(true);

    this.mensajeError.set('');

    this.resultado.set(null);

    try {

      const resultado =
        await this.drawService.obtenerResultadoPublico(
          raffleId
        );

      if (version !== this.versionConsulta) {

        return;

      }

      this.resultado.set(resultado);

    } catch (error) {

      if (version !== this.versionConsulta) {

        return;

      }

      this.mensajeError.set(

        (error as { message?: string })?.message ||

        'No se pudo consultar el resultado oficial.'

      );

    } finally {

      if (version === this.versionConsulta) {

        this.cargando.set(false);

      }

    }

  }


  // ==========================================
  // FORMATO DEL NUMERO GANADOR
  // ==========================================

  formatearNumero(numero: number): string {

    return String(numero).padStart(3, '0');

  }

}
