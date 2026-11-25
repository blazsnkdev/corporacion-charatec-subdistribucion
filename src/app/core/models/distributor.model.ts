
export interface Distributor {
  id: string;
  ruc: string;
  company: string;
  phone: string;
  status: string;
}

export interface DistributorRegistration {
  email: string;
  password: string;
  ruc: string;
  company: string;
  phone: string;
}
