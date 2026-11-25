
export function validarRuc(ruc: string): boolean {

  if (!/^(10|20)\d{9}$/.test(ruc)) {
    return false;
  }

  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

  const suma = pesos.reduce(
    (total, peso, index) =>
      total + peso * Number(ruc[index]),
    0
  );

  const digito = (11 - (suma % 11)) % 10;

  return digito === Number(ruc[10]);
}
