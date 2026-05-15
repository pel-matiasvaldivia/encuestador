# SatisfApp

Sistema web multitenant de encuestas de satisfacción al cliente.

## Requisitos
- Docker y Docker Compose

## Instalación y Ejecución

1. Clonar el repositorio.
2. Configurar las variables de entorno. Puedes usar el archivo `.env` provisto en la raíz. Asegúrate de configurar los datos reales de SMTP si deseas enviar correos:
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASS`
3. Construir y levantar los contenedores:
   ```bash
   docker-compose up --build
   ```
4. Aplicar migraciones y crear los tenants iniciales (esto se hace desde el contenedor del backend):
   ```bash
   docker-compose exec backend python seed.py
   ```

## Acceso

- **Frontend**: http://localhost
- **Backend API**: http://localhost/api
- **Documentación API (Swagger)**: http://localhost/api/docs

## Creación de Primer Tenant

El script `seed.py` (ejecutado en el paso 4) se encarga de crear dos tenants de prueba y aplicar las migraciones correspondientes a cada uno.
- **Tenant 1**: Empresa Alpha (Usuario: admin@alpha.com / Password: password123)
- **Tenant 2**: Empresa Beta (Usuario: admin@beta.com / Password: password123)

## Archivo de Contactos de Ejemplo

Puedes utilizar el archivo `contactos_ejemplo.csv` incluido en la raíz para probar la carga masiva de contactos desde el panel de campañas.
