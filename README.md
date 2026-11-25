# Corporación Charatec B2B
Angular 20 / Supabase. Node 22. Catálogo privado de seis fichas por página. No hay autenticación simulada ni precios accesibles a usuarios anónimos.

## Configuración
1. Crear un proyecto nuevo en Supabase. Ejecutar `supabase.sql` en SQL Editor una sola vez.
2. Authentication > Users > Add user: crear administrador con correo confirmado y contraseña robusta. Copiar UUID y ejecutar `insert into public.admins values ('UUID_REAL');`.
3. Project Settings / API Keys: copiar Project URL y publishable key en `src/config.ts`. Nunca usar service_role ni secret key.
4. Authentication > URL Configuration: Site URL con dominio de producción; agregar `http://localhost:4200` como redirect permitido. Mantener confirmación de correo habilitada. El envío de correos integrado tiene límites; para usuarios reales configurar SMTP propio si es necesario.
5. `npm install`, `npm start`, abrir http://localhost:4200. Ingresar administrador. En Productos, importar ejemplos ocultos si se desea; revisar especificaciones, stock y precios antes de publicar. Las fotos de ejemplo son recortes del catálogo anterior y se sirven como activos públicos; las nuevas fotos se almacenan en bucket privado con URLs firmadas de una hora.
6. Registrar cuenta de prueba con RUC real, confirmar correo, ingresar; verificar que quede pendiente. Administrador verifica RUC en SUNAT y aprueba. Probar bloqueo y acceso con nueva carga.

## Git / despliegue
`git init`, `git add .`, `git commit -m "Initial B2B catalog"`, `git branch -M main`, `git remote add origin https://github.com/TU-USUARIO/TU-REPO.git`, `git push -u origin main`.
Importar repo en Vercel, Angular, Node 22, build `npm run build`, output `dist/catalogo/browser`. El archivo vercel.json está incluido. Vercel Hobby es solo uso personal no comercial; para operación comercial usar plan compatible o hosting existente. En Hostinger se puede subir el contenido de dist/catalogo/browser a un subdominio, configurando fallback a index.html. Supabase Free sujeto a cuotas y condiciones.
Cada push a main despliega el código si Git integration está habilitada. Los cambios de datos no necesitan git push; se guardan en Supabase y se reflejan al recargar/Actualizar. El tipo de cambio inicial 3.75 es ilustrativo, ajustar antes de publicar. Precio base USD o PEN, conversión usando tipo de cambio manual; el +12% es cálculo interno, no precio anterior ficticio. Solo ingresar precio referencial real verificable para tachado público.

## Límites
RUC: formato y dígito verificador, no consulta automatizada SUNAT. Login por correo/contraseña vinculado a RUC único. No carrito, pagos ni facturación: consultas vía WhatsApp. Al bloquear, consultas a BD quedan denegadas por RLS; datos ya descargados y enlaces firmados pueden persistir temporalmente. Borrar/reemplazar producto no limpia automáticamente la foto anterior: limpiar archivos sin uso desde Storage. No se ha probado contra un proyecto real ni compilado en este entorno si no hay dependencias npm disponibles.
