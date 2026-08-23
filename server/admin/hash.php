<?php
declare(strict_types=1);
/**
 * Generador de hash para la contraseña del SUPERADMINISTRADOR.
 *
 * No funciona por defecto. Para usarlo:
 *   1. Crea por FTP un archivo vacío llamado  permitir-hash.txt  junto a este.
 *   2. Abre  admin/hash.php  en el navegador, escribe la contraseña y copia el hash.
 *   3. Pega el hash donde toque:
 *        - en admin/superclave.php:   <?php define('SUPERADMIN_HASH', 'EL_HASH');
 *        - o en la variable de entorno SUPERADMIN_PASSWORD_HASH del hosting.
 *   4. BORRA permitir-hash.txt (y, si quieres, este mismo archivo).
 *
 * El cerrojo es deliberado: sólo quien tiene FTP —es decir, el propietario— puede
 * habilitarlo, y la contraseña nunca se guarda: entra por POST, sale como hash y se olvida.
 */

header('X-Robots-Tag: noindex, nofollow');
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store');

$abierto = is_file(__DIR__ . '/permitir-hash.txt');
$hash = null;
$error = null;

if ($abierto && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && isset($_POST['clave'])) {
  $clave = (string) $_POST['clave'];
  if (strlen($clave) < 12) {
    $error = 'Para el superadministrador usa al menos 12 caracteres.';
  } else {
    $hash = password_hash($clave, PASSWORD_DEFAULT);
  }
}
?>
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Generar hash — superadministrador</title>
<style>
  body{margin:0;background:#021b31;color:#faf5e8;font:16px/1.5 system-ui,sans-serif;
       display:grid;place-items:center;min-height:100dvh;padding:16px}
  .caja{background:#faf5e8;color:#021b31;border-radius:21px;padding:34px;max-width:560px;width:100%}
  h1{margin:0 0 8px;font-size:22px}
  p{margin:0 0 13px;font-size:14px;color:#475864}
  input,button{width:100%;min-height:52px;border-radius:999px;font-size:16px;box-sizing:border-box}
  input{border:1px solid #dcdcd6;padding:0 21px;background:#fff;color:#021b31;margin-bottom:13px}
  button{border:0;background:#021b31;color:#faf5e8;font-weight:600;cursor:pointer}
  textarea{width:100%;box-sizing:border-box;margin-top:13px;padding:13px;border-radius:13px;
           border:1px solid #dcdcd6;font:13px/1.5 ui-monospace,monospace;background:#fff;color:#021b31}
  .mal{background:rgba(198,40,40,.1);color:#8e1b14;border-radius:13px;padding:13px;margin-bottom:13px;font-size:14px}
</style>
</head>
<body>
<div class="caja">
  <h1>Hash de superadministrador</h1>
  <?php if (!$abierto): ?>
    <p><strong>Cerrado.</strong> Para habilitar este generador, crea por FTP un archivo vacío
       llamado <code>permitir-hash.txt</code> en esta misma carpeta y recarga. Al terminar,
       bórralo: mientras exista, cualquiera con la URL puede usar esta página (sólo genera
       hashes, no los guarda, pero no tiene por qué quedarse abierta).</p>
  <?php elseif ($hash !== null): ?>
    <p>Hecho. La contraseña no se ha guardado en ningún sitio. Copia el hash y pégalo
       <strong>o bien</strong> en <code>admin/superclave.php</code> con este contenido exacto:</p>
    <textarea readonly rows="3" onfocus="this.select()">&lt;?php
define('SUPERADMIN_HASH', '<?= htmlspecialchars($hash, ENT_QUOTES, 'UTF-8') ?>');</textarea>
    <p style="margin-top:13px"><strong>o bien</strong> en la variable de entorno
       <code>SUPERADMIN_PASSWORD_HASH</code> del hosting. Después
       <strong>borra <code>permitir-hash.txt</code></strong>.</p>
  <?php else: ?>
    <?php if ($error): ?><div class="mal"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div><?php endif; ?>
    <p>Escribe la contraseña de superadministrador (mínimo 12 caracteres; una frase larga vale
       más que ocho símbolos). Se convierte en hash aquí mismo y no se guarda.</p>
    <form method="post" autocomplete="off">
      <input type="password" name="clave" placeholder="Contraseña de superadministrador" required autofocus>
      <button type="submit">Generar hash</button>
    </form>
  <?php endif; ?>
</div>
</body>
</html>
