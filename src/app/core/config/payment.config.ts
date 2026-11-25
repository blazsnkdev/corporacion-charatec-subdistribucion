export type PaymentMethod = 'bcp' | 'yape' | 'plin';

export const PAYMENT_CONFIG = {

  bcp: {
    titular: 'CORPORACIÓN CHARATEC',

    cuentas: [
      {
        label: 'Cuenta en soles',
        number: '1916825279010'
      },
      {
        label: 'CCI en soles',
        number: '00219100682527901057'
      },
      {
        label: 'Cuenta en dólares',
        number: ''
      },
      {
        label: 'CCI en dólares',
        number: ''
      }
    ]
  },

  yape: {
    titular: 'ROY YAGUNO LAYME',
    telefono: '928922089',
    qr: '/payments/yape-qr.png'
  },

  plin: {
    titular: 'ROY YAGUNO LAYME',
    telefono: '928922089',
    qr: '/payments/plin-qr.png'
  }

};