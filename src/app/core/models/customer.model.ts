export type CustomerStatus =
  | 'active'
  | 'blocked';

export interface Customer {

  id: string;

  first_name: string;

  last_name: string;

  phone: string;

  status: CustomerStatus;

  created_at: string;

}

export interface CustomerRegisterRequest {

  first_name: string;

  last_name: string;

  phone: string;

  email: string;

  password: string;

}