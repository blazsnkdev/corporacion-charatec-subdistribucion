
import {
  Component,
  inject
} from '@angular/core';

import {
  AuthService
} from '../../core/services/auth.service';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  templateUrl: './catalogo.component.html',
  styleUrl: './catalogo.component.css'
})
export class CatalogoComponent {

  readonly authService = inject(AuthService);

}
