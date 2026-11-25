
import { Injectable, signal } from '@angular/core';

export type PopupType =
  | 'confirm'
  | 'success'
  | 'error'
  | 'warning'
  | 'info';

export interface PopupOptions {
  title: string;
  message: string;
  type: PopupType;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PopupService {

  private readonly _popup =
    signal<PopupOptions | null>(null);

  readonly popup = this._popup.asReadonly();

  private resolver:
    ((value: boolean) => void) | null = null;

  open(options: PopupOptions): Promise<boolean> {

    if (this.resolver) {
      this.close(false);
    }

    return new Promise<boolean>(resolve => {

      this.resolver = resolve;

      this._popup.set(options);

    });

  }

  confirm(
    title: string,
    message: string,
    confirmText = 'Confirmar'
  ): Promise<boolean> {

    return this.open({
      title,
      message,
      type: 'confirm',
      confirmText,
      cancelText: 'Cancelar',
      showCancel: true
    });

  }

  success(
    title: string,
    message: string
  ): Promise<boolean> {

    return this.open({
      title,
      message,
      type: 'success',
      confirmText: 'Aceptar'
    });

  }

  error(
    title: string,
    message: string
  ): Promise<boolean> {

    return this.open({
      title,
      message,
      type: 'error',
      confirmText: 'Aceptar'
    });

  }

  warning(
    title: string,
    message: string
  ): Promise<boolean> {

    return this.open({
      title,
      message,
      type: 'warning',
      confirmText: 'Entendido'
    });

  }

  close(result: boolean): void {

    const resolver = this.resolver;

    this.resolver = null;
    this._popup.set(null);

    resolver?.(result);

  }

}
