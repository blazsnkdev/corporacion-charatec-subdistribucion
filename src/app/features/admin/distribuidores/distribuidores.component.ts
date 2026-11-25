
import {
  Component,
  OnInit,
  inject,
  signal,
  computed
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  DistribuidoresService
} from '../../../core/services/distribuidores.service';

import {
  AuthService
} from '../../../core/services/auth.service';

import {
  Distributor
} from '../../../core/models/distributor.model';

type DistributorStatus =
  | 'pending'
  | 'approved'
  | 'blocked';

@Component({
  selector: 'app-distribuidores',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './distribuidores.component.html',
  styleUrl: './distribuidores.component.css'
})
export class DistribuidoresComponent implements OnInit {

  private readonly distribuidoresService =
    inject(DistribuidoresService);

  private readonly authService =
    inject(AuthService);

  readonly distribuidores = signal<Distributor[]>([]);

  readonly cargando = signal(true);
  readonly busy = signal(false);

  readonly mensaje = signal('');
  readonly error = signal(false);

  readonly busqueda = signal('');
  readonly filtro = signal('');

  readonly total = computed(
    () => this.distribuidores().length
  );

  readonly pendientes = computed(
    () => this.distribuidores()
      .filter(d => d.status === 'pending').length
  );

  readonly aprobados = computed(
    () => this.distribuidores()
      .filter(d => d.status === 'approved').length
  );

  readonly bloqueados = computed(
    () => this.distribuidores()
      .filter(d => d.status === 'blocked').length
  );

  readonly filtrados = computed(() => {

    const texto =
      this.busqueda().trim().toLowerCase();

    const estado = this.filtro();

    return this.distribuidores().filter(d => {

      const coincide =
        `${d.company} ${d.ruc} ${d.phone}`
          .toLowerCase()
          .includes(texto);

      return coincide &&
        (!estado || d.status === estado);

    });

  });

  async ngOnInit(): Promise<void> {

    await this.cargarDistribuidores();

  }

  async cargarDistribuidores(): Promise<void> {

    if (!this.authService.admin()) {
      return;
    }

    this.cargando.set(true);

    try {

      const data =
        await this.distribuidoresService.listar();

      this.distribuidores.set(data);

    } catch (error) {

      this.mostrarError(error);

    } finally {

      this.cargando.set(false);

    }

  }

  nombreEstado(status: string): string {

    switch (status) {

      case 'approved':
        return 'Aprobado';

      case 'blocked':
        return 'Bloqueado';

      case 'pending':
        return 'Pendiente';

      default:
        return status;

    }

  }

  async cambiarEstado(
    distribuidor: Distributor,
    status: DistributorStatus
  ): Promise<void> {

    if (
      this.busy() ||
      !this.authService.admin() ||
      distribuidor.status === status
    ) {
      return;
    }

    const accion =
      status === 'approved'
        ? 'aprobar'
        : status === 'blocked'
          ? 'bloquear'
          : 'devolver a pendiente';

    const confirmar = window.confirm(

      `¿Deseas ${accion} a ${distribuidor.company}?`

    );

    if (!confirmar) {
      return;
    }

    this.busy.set(true);
    this.mensaje.set('');
    this.error.set(false);

    try {

      await this.distribuidoresService
        .actualizarEstado(
          distribuidor.id,
          status
        );

      this.distribuidores.update(lista =>

        lista.map(d =>

          d.id === distribuidor.id
            ? { ...d, status }
            : d

        )

      );

      this.mensaje.set(
        `Estado actualizado: ${this.nombreEstado(status)}.`
      );

    } catch (error) {

      this.mostrarError(error);

    } finally {

      this.busy.set(false);

    }

  }

  whatsapp(distribuidor: Distributor): string {

    const numero =
      distribuidor.phone.replace(/\D/g, '');

    const telefono =
      numero.length === 9
        ? `51${numero}`
        : numero;

    const mensaje = encodeURIComponent(

      `Hola ${distribuidor.company}, ` +
      `te contactamos de Corporación Charatec ` +
      `respecto a tu cuenta de distribuidor.`

    );

    return `https://wa.me/${telefono}?text=${mensaje}`;

  }

  private mostrarError(error: unknown): void {

    this.error.set(true);

    this.mensaje.set(
      (error as { message?: string })?.message ||
      'No se pudo completar la operación.'
    );

  }

}
