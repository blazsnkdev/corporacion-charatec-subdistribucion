import {
  Component,
  inject,
  effect,
  viewChild,
  ElementRef
} from '@angular/core';

import {
  PopupService
} from '../../../core/services/popup.service';

@Component({
  selector: 'app-popup',
  standalone: true,
  templateUrl: './popup.component.html',
  styleUrl: './popup.component.css'
})
export class PopupComponent {

  readonly popupService = inject(PopupService);

  readonly dialog =
    viewChild<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {

    effect(() => {

      const popup = this.popupService.popup();
      const element = this.dialog()?.nativeElement;

      if (!element) return;

      if (popup && !element.open) {
        element.showModal();
      }

      if (!popup && element.open) {
        element.close();
      }

    });

  }

  confirmar(): void {
    this.popupService.close(true);
  }

  cancelar(): void {
    this.popupService.close(false);
  }

  cancelarEvento(event: Event): void {
    event.preventDefault();
    this.cancelar();
  }

}