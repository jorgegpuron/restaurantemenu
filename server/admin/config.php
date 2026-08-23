<?php
/**
 * Tinge of Turmeric — configuración del panel.
 *
 * La contraseña NO vive en este archivo. Vive en clave.php, que el panel escribe solo la
 * primera vez y cada vez que se cambia la contraseña. Por eso config.php se puede volver a
 * subir con cada actualización de la carta sin dejar a nadie fuera.
 *
 * La contraseña en claro no se guarda en ningún sitio: sólo su hash.
 */

/* ------------------------------------------------------------------ MODO DEMO
 * En true el panel se abre sin contraseña. Es para enseñarlo, no para dejarlo puesto:
 * mientras esté activo, cualquiera que dé con la URL puede marcar platos agotados y
 * publicar el plato del día. La carta pública no corre otro riesgo — aquí no hay datos
 * de nadie — pero el contenido queda a la vista de quien pase.
 *
 * PARA SALIR DEL MODO DEMO NO HACE FALTA TOCAR ESTE ARCHIVO. En el aviso rojo del panel hay
 * un botón «Poner contraseña y salir del modo demo»: escribes una contraseña, el panel crea
 * clave.php, y en cuanto ese archivo existe el modo demo se apaga solo aunque aquí siga
 * poniendo true. Es la misma regla en una frase: si hay contraseña, no hay demo.
 *
 * Volver a demo es borrar clave.php del servidor. Nada más.
 *
 * El panel enseña un aviso rojo permanente mientras el demo esté activo.
 *
 * POR DEFECTO VA APAGADO. Un archivo que sale de fábrica con el panel abierto acaba
 * desplegado así en algún servidor: si hace falta enseñarlo a un prospecto, se pone true
 * a mano para esa demo y se vuelve a false al terminar. */
define('DEMO_SIN_CLAVE', false);

// La contraseña, si ya está configurada. Si el archivo no existe todavía, el panel muestra
// la pantalla de configuración y no deja entrar ni guardar nada.
if (is_file(__DIR__ . '/clave.php')) require __DIR__ . '/clave.php';
if (!defined('ADMIN_HASH')) define('ADMIN_HASH', '');

/* ------------------------------------------------------------ SUPERADMINISTRADOR
 * Acceso del propietario técnico, independiente del restaurante: entra aunque el cliente
 * cambie, olvide o bloquee su contraseña. Aquí no vive la contraseña ni su hash.
 *
 * El hash se busca en dos sitios, por este orden:
 *   1. La variable de entorno SUPERADMIN_PASSWORD_HASH (SetEnv en un .htaccess privado,
 *      o el gestor de variables del hosting, si lo tiene).
 *   2. El archivo admin/superclave.php, que NO forma parte del build: se crea una vez con
 *      hash.php (léelo) o a mano, y ninguna subida de la carta lo pisa. El panel del
 *      restaurante no tiene ninguna acción que lo lea, lo escriba ni lo borre.
 *
 * Si ninguno existe, el rol simplemente no está disponible: nada se inventa. */
$__sh = getenv('SUPERADMIN_PASSWORD_HASH');
if (is_string($__sh) && $__sh !== '') {
  define('SUPERADMIN_HASH', $__sh);
} elseif (is_file(__DIR__ . '/superclave.php')) {
  require __DIR__ . '/superclave.php';
}
if (!defined('SUPERADMIN_HASH')) define('SUPERADMIN_HASH', '');
unset($__sh);

/* Los códigos del juego ya canjeados hoy. Antes iban dentro de estado.json, que es público:
 * cualquiera podía listar cuántos premios se dan y a qué hora. Aquí no los sirve nadie. */
define('CANJES_PATH', __DIR__ . '/canjes.json');

/* Fuerza bruta: tras MAX_FALLOS contraseñas mal seguidas desde una misma IP, esa IP espera
 * BLOQUEO_MINUTOS. El registro vive en un JSON que el .htaccess no sirve. */
define('INTENTOS_PATH', __DIR__ . '/intentos.json');
define('MAX_FALLOS', 8);
define('BLOQUEO_MINUTOS', 15);

/* Registro de accesos administrativos: quién entró (rol), desde qué IP y qué tocó.
 * Nunca se apuntan contraseñas ni hashes. El .htaccess tampoco lo sirve. */
define('LOG_PATH', __DIR__ . '/accesos.log');

// Dónde vive el estado que lee la carta. Por defecto, la carpeta de arriba.
define('ESTADO_PATH', __DIR__ . '/../estado.json');

/* Historial del estado. El panel lo reconstruye entero en cada guardado, así que sin esto un
 * clic devuelve los precios a los de la carta y no hay forma de recuperarlos. Va dentro de
 * admin/ porque estado.json es público —lo lee la carta— pero su historial no tiene por qué.
 * La carpeta la crea el panel sola la primera vez que guarda algo. */
define('COPIAS_DIR', __DIR__ . '/copias');

/* Cuántos días de historial se guardan. Uno por fecha de servicio, más anterior.json, que es
 * aparte y no caduca. A 30 días, unos 31 ficheros de pocos KB: nada para el hosting y
 * suficiente para cubrir 'esto se rompió la semana pasada y nadie lo dijo'. */
define('COPIAS_DIAS', 30);

// Catálogo de platos que genera gen.mjs. Se regenera con la carta; no se edita a mano.
define('PLATOS_PATH', __DIR__ . '/platos.json');

// Juegos de color de marca, también generados por gen.mjs: cada uno con sus doce valores ya
// derivados y ya verificados en contraste. El panel sólo elige uno; no inventa colores.
define('TEMAS_PATH', __DIR__ . '/temas.json');

// Carpeta donde el panel deja las fotos del carrusel de cabecera. Tiene que existir y tiene
// que poder escribir PHP dentro. Lleva su propio .htaccess apagando la ejecución: ahí sólo
// hay imágenes subidas desde fuera, y una carpeta que acepta archivos y además los ejecuta
// es la forma clásica de entrar en un servidor.
define('HERO_DIR', __DIR__ . '/../assets/hero');

// Peso máximo por foto, en bytes. Uno mega. Por encima de eso una foto de portada no mejora
// nada y sí penaliza a quien la abre con datos móviles en una terraza.
define('HERO_MAX_BYTES', 1024 * 1024);

// Cuántas fotos admite el carrusel.
define('HERO_MAX', 5);

// Zona horaria del restaurante. Manda esta, no la del servidor ni la del móvil.
define('TZ', 'Atlantic/Canary');

// Hora a la que se limpian los agotados del día anterior.
define('CORTE_HORA', 6);

/* ------------------------------------------------------------------- OCULTOS
 * Función «Ocultos»: pestañas enteras y platos sueltos que desaparecen de la carta y del
 * panel hasta que se desmarcan (no caducan, a diferencia de «Agotados hoy»). Está escrita y
 * probada, pero APAGADA de momento por decisión del cliente hasta tenerla clara. Con false:
 * la pestaña no aparece, su guardado se ignora y nada se filtra. Para encenderla: true aquí,
 * OCULTOS_ACTIVO = true en gen.mjs y regenerar la carta. */
define('OCULTOS_ACTIVO', false);

// Minutos de inactividad tras los que se cierra la sesión del panel.
// 30 es el equilibrio razonable: no molesta durante un servicio y no deja la tablet
// de cocina abierta toda la tarde si alguien se olvida de salir.
define('SESION_MINUTOS', 30);
