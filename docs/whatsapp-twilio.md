# Votación por WhatsApp (Twilio) — paso a paso

Al abrir la votación, cada administrador de empresa que tenga WhatsApp registrado
y cuya empresa aún no vote recibe dos mensajes:

1. **Recordatorio** con el enlace al panel.
2. **Encuesta** con tres botones (Verde, Amarillo, Rojo). Al tocar uno, Twilio
   avisa al servidor, se registra el voto de su empresa y se le confirma en el chat.

También cuenta si escribe el color a mano («verde», «rojo», «1», «2», «3»…).

---

## Paso 1. Crear la plantilla de recordatorio en Twilio

Twilio Console → Messaging → **Content Template Builder** → *Create new*.

- **Nombre:** `fegat_recordatorio_voto`
- **Idioma:** Spanish (MEX) · **Tipo:** Text
- **Cuerpo** (Meta no acepta que empiece o termine con una variable):

```
Hola {{1}}, ya abrió la votación del semáforo de FEGAT para la jornada del {{2}}.

Registra el voto de {{3}} antes de las {{4}} h en {{5}} o responde la encuesta que te enviamos a continuación.

Gracias.
```

Valores de ejemplo para la revisión de Meta:

| Variable | Qué envía el sistema | Ejemplo |
|---|---|---|
| {{1}} | Nombre del usuario | Juan Pérez |
| {{2}} | Fecha de la jornada | lunes 19 de octubre |
| {{3}} | Empresa | Aerostat |
| {{4}} | Hora de cierre | 07:00 |
| {{5}} | Enlace al panel | https://fegat.myflight.com.mx/dashboard |

Guarda y envía a aprobación de WhatsApp con categoría **Utility**.

## Paso 2. Crear la plantilla de encuesta

- **Nombre:** `fegat_encuesta_voto`
- **Idioma:** Spanish (MEX) · **Tipo:** Quick reply
- **Cuerpo:**

```
¿Cuál es el voto de {{1}} para la jornada del {{2}}?

Verde: volamos. Amarillo: en espera. Rojo: se cancela.
```

- **Botones.** El *ID* debe ser exactamente este; es lo que identifica el voto:

| Texto del botón | ID |
|---|---|
| Verde | `vote_green` |
| Amarillo | `vote_yellow` |
| Rojo | `vote_red` |

Ejemplos para Meta: {{1}} = Aerostat, {{2}} = lunes 19 de octubre. Envía a
aprobación como **Utility**.

## Paso 2b. Crear la plantilla del resumen diario (super admin)

- **Nombre:** `fegat_resumen_diario`
- **Idioma:** Spanish (MEX) · **Tipo:** Text · **Categoría:** Utility
- **Cuerpo:**

```
Resumen del semáforo de FEGAT del {{1}}.

Resultado: {{2}}
Votaron {{3}}: {{4}}.

Detalle: {{5}}

Consulta el historial completo en el panel.
```

| Variable | Qué envía el sistema | Ejemplo para Meta |
|---|---|---|
| {{1}} | Fecha de la jornada | martes 21 de octubre |
| {{2}} | Resultado | Volamos (verde) |
| {{3}} | Participación | 6 de 8 empresas |
| {{4}} | Conteo por color | Verde 4 · Amarillo 1 · Rojo 1 |
| {{5}} | Voto de cada empresa y quién falta | Aerostat: Verde (Juan Pérez) · Volare: Rojo (Ana López) · Sin voto: Sky Balloons |

Su Content SID va en `TWILIO_TEMPLATE_DAILY_SUMMARY`.

> La aprobación suele tardar de minutos a un par de días. Mientras tanto puedes
> seguir con los pasos 3 a 6; la prueba del paso 7 fallará hasta que estén aprobadas.

## Paso 3. Variables en el `.env` del servidor

Las mismas credenciales de la cuenta de Twilio que usa SAV, más los Content SID
(`HX…`) de las dos plantillas:

```dotenv
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+52...
TWILIO_TEMPLATE_VOTE_REMINDER=HX...
TWILIO_TEMPLATE_VOTE_POLL=HX...
TWILIO_TEMPLATE_DAILY_SUMMARY=HX...
TWILIO_WEBHOOK_URL=
```

`TWILIO_WEBHOOK_URL` se deja vacío salvo que el servidor esté detrás de un proxy
y la URL que ve Laravel no sea idéntica a la del paso 5 (si Twilio recibe 403,
pon aquí esa URL exacta).

## Paso 4. Desplegar

En el servidor, después de subir el código:

```bash
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan optimize
```

Y confirma que exista el cron de Laravel (el envío corre cada minuto):

```cron
* * * * * cd /ruta/a/fegat && php artisan schedule:run >> /dev/null 2>&1
```

## Paso 5. Conectar el webhook en Twilio

Twilio Console → Messaging → Senders → **WhatsApp senders** → (el número) →
**A message comes in** → método **POST**:

```
https://fegat.myflight.com.mx/api/webhooks/twilio/whatsapp
```

La URL exacta también aparece en el panel, en **Votación → Probar mensajes de WhatsApp**.
Si el número ya tiene un webhook de SAV, usa otro número o un Messaging Service
distinto: un número solo puede mandar sus respuestas a una URL.

## Paso 6. Registrar los números

- **Usuarios:** campo *WhatsApp* de cada administrador de empresa.
- O cada quien en **Configuración → Perfil**.

Diez dígitos se toman como número de México (`55 1234 5678` → `+525512345678`).

## Paso 7. Probar

1. Panel → **Votación** → **Probar mensajes de WhatsApp**.
2. Escribe tu número y, si quieres, el nombre de una empresa → **Enviar prueba**.
3. Deben llegarte el recordatorio y la encuesta. Si Twilio rechaza el envío, el
   error aparece debajo del campo.
4. Para probar que el botón registre el voto, el número debe pertenecer a un
   **administrador de empresa activa** (por ejemplo, crea un usuario de prueba con
   tu número) y la votación debe estar abierta. Con otro número, el sistema
   contesta explicando por qué no votó, lo que también confirma que el webhook funciona.
5. El voto aparece en **Historial** con la etiqueta «WhatsApp».

Para el resumen: registra tu WhatsApp en tu usuario (super admin) y usa
**Probar resumen de hoy**. Llega el resumen real con los votos que haya hasta ese momento.

## Paso 8. Activar

Panel → **Votación** → marca **Votar por WhatsApp** → **Guardar**.

Desde la siguiente apertura, cada administrador con WhatsApp cuya empresa no haya
votado recibirá los dos mensajes una sola vez por jornada (tabla
`whatsapp_reminders`). Si un envío falla, queda con `status = failed` y el error,
y no se reintenta solo.

Para el resumen diario: marca **Resumen diario para super admin**, elige la hora
(12:00 por omisión) y guarda. Cada super admin con WhatsApp lo recibe una vez al
día a partir de esa hora (`kind = summary` en la misma tabla).

---

## Si algo no llega

- **No llega nada:** revisa Twilio Console → Monitor → Logs → Messaging. El SID de
  cada envío queda en `storage/logs/laravel.log` («WhatsApp encolado en Twilio»).
- **Llega el mensaje pero el botón no vota:** el webhook no está configurado, la
  URL no coincide (Twilio muestra 403 en el log de la petición) o el número no es de
  un administrador de empresa activa.
- **Cambio de dominio:** actualiza la URL del paso 5 y `APP_URL`; las plantillas no
  cambian porque el enlace es la variable {{5}}.
