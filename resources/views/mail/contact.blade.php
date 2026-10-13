<!DOCTYPE html>
<html lang="es">
    <body style="font-family: Arial, sans-serif; color: #444444; line-height: 1.5;">
        <h2 style="color: #6c0ea3;">Nuevo mensaje desde fegat.mx</h2>
        <p>
            <strong>Nombre:</strong> {{ $senderName }}<br>
            <strong>Correo:</strong> {{ $senderEmail }}<br>
            <strong>Asunto:</strong> {{ $subjectLine }}
        </p>
        <p>{!! nl2br(e($body)) !!}</p>
        <p style="color: #888888; font-size: 12px;">Responde a este correo para contestarle directamente a {{ $senderName }}.</p>
    </body>
</html>
