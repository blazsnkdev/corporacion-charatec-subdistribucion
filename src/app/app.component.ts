import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PopupComponent } from './shared/component/popup/popup.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    PopupComponent
  ],
  templateUrl: './app.component.html'
})
export class AppComponent {}