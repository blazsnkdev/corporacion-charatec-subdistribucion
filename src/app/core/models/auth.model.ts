
export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthState {
  ready: boolean;
  user: string;
  admin: boolean;
  status: string;
}

export type UserRole =
  | 'Administrador'
  | 'Distribuidor'
  | 'Invitado';
