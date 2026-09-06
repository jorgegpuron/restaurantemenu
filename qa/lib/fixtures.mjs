/* Las imágenes de prueba se FABRICAN, no se guardan.
 *
 * Dos razones. Una: el repositorio no engorda con binarios de QA. Dos: una imagen «corrupta»
 * guardada como fichero acaba pareciendo un fichero roto por accidente, y alguien la arregla; si
 * se genera aquí, con su comentario al lado, se ve que la corrupción es el propósito.
 *
 * El PNG se escribe a mano con zlib, que viene en Node. El JPEG y el WebP los pide a GD cuando
 * está: no son formatos que merezca la pena implementar a mano para una prueba.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { PHP } from './entorno.mjs';
import { correr } from './proc.mjs';
import { capacidadesPhp } from './servidor.mjs';

function crc32(buf) {
  let c, tabla = crc32.tabla;
  if (!tabla) {
    tabla = crc32.tabla = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      tabla[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ tabla[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function trozo(tipo, datos) {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length, 0);
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'latin1'), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo), 0);
  return Buffer.concat([largo, cuerpo, crc]);
}

/* PNG RGB de un color liso con un degradado suave, para que comprima como una foto de verdad y
   no como un cuadrado de un solo píxel. */
export function pngBuffer(ancho, alto, base = [200, 120, 40]) {
  const filas = [];
  for (let y = 0; y < alto; y++) {
    const fila = Buffer.alloc(1 + ancho * 3);
    fila[0] = 0;
    for (let x = 0; x < ancho; x++) {
      const i = 1 + x * 3;
      fila[i] = (base[0] + ((x * 7 + y * 3) % 56)) & 0xff;
      fila[i + 1] = (base[1] + ((x * 3 + y * 5) % 56)) & 0xff;
      fila[i + 2] = (base[2] + ((x * 5 + y * 7) % 56)) & 0xff;
    }
    filas.push(fila);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ancho, 0);
  ihdr.writeUInt32BE(alto, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', ihdr),
    trozo('IDAT', deflateSync(Buffer.concat(filas), { level: 6 })),
    trozo('IEND', Buffer.alloc(0)),
  ]);
}

/* Como el de arriba pero con ruido: cada pixel sale de una secuencia congruencial sembrada, asi
 * que el fichero es incompresible y a la vez identico en cada ejecucion. */
export function pngRuido(ancho, alto) {
  /* El ruido sale de SHA-256 sobre un contador: es determinista —el mismo fichero en cada
     ejecución— y de entropía alta, así que deflate no puede con él. Una congruencial sencilla
     comprimía a un tercio y la imagen se quedaba por debajo del tope que se quería probar. */
  let resto = Buffer.alloc(0);
  let bloque = 0;
  const bytes = (n) => {
    while (resto.length < n) {
      resto = Buffer.concat([resto, createHash('sha256').update('qa-ruido-' + (bloque++)).digest()]);
    }
    const salida = resto.subarray(0, n);
    resto = resto.subarray(n);
    return salida;
  };
  const filas = [];
  for (let y = 0; y < alto; y++) {
    const fila = Buffer.alloc(1 + ancho * 3);
    fila[0] = 0;
    bytes(ancho * 3).copy(fila, 1);
    filas.push(fila);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ancho, 0); ihdr.writeUInt32BE(alto, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', ihdr),
    trozo('IDAT', deflateSync(Buffer.concat(filas), { level: 1 })),
    trozo('IEND', Buffer.alloc(0)),
  ]);
}

/* Todas las fixtures que usa la suite, en una carpeta temporal. Devuelve un mapa nombre -> ruta.
 * Cada una existe para una prueba concreta, y así está anotada. */
export function fabricarFixtures(dir) {
  mkdirSync(dir, { recursive: true });
  const f = {};
  const pon = (nombre, buf) => { const p = path.join(dir, nombre); writeFileSync(p, buf); f[nombre] = p; return p; };

  // Portada válida: pasa el ancho mínimo de 800 px.
  pon('portada-1200x800.png', pngBuffer(1200, 800));
  // Banner válido.
  pon('banner-1120x480.png', pngBuffer(1120, 480, [40, 90, 160]));
  // Foto de plato.
  pon('plato-600x600.png', pngBuffer(600, 600, [90, 160, 90]));
  // Demasiado estrecha: el panel exige 800 px de ancho.
  pon('estrecha-400x300.png', pngBuffer(400, 300));
  // Nombre con acentos y paréntesis, para el mensaje de error recortado (lote 4 / E2).
  pon('portada pequeña ñ & (400px).png', pngBuffer(400, 300));
  // Lado enorme: por encima de IMG_LADO_MAX (8000).
  pon('ancha-9000x300.png', pngBuffer(9000, 300));
  // Cabecera válida y cuerpo truncado: getimagesize la acepta, el decodificador no.
  const entera = pngBuffer(900, 700);
  pon('truncada.png', entera.subarray(0, 900));
  // Extensión mentirosa: es un PNG, se llama .jpg.
  pon('extension-falsa.jpg', pngBuffer(1200, 800));
  // Ni siquiera es una imagen.
  pon('no-es-imagen.txt', Buffer.from('esto no es una imagen, es texto plano\n', 'utf8'));
  /* Pesada de verdad, para el tope de subida del servidor. Un degradado comprime demasiado bien y
     se quedaba en unos pocos KB: la prueba del tope pasaba de largo sin tocar el tope. Con ruido
     pseudoaleatorio (determinista, para que dos ejecuciones den el mismo fichero) el PNG no puede
     comprimir y pesa lo que tiene que pesar. */
  pon('pesada-3mb.png', pngRuido(1400, 900));

  /* JPEG y WebP: los dibuja GD si está. Si no, se quedan fuera y la prueba que los necesite se
     marca BLOCKED — nunca se sustituyen por un PNG renombrado, que es justo lo que otra prueba
     considera un fallo. */
  const caps = capacidadesPhp();
  if (PHP && caps.gd) {
    const args = (codigo) => {
      const a = ['-n'];
      if (caps.dir) a.push('-d', `extension_dir=${caps.dir}`);
      a.push('-d', 'extension=gd', '-r', codigo);
      return a;
    };
    const jpg = path.join(dir, 'portada-1200x800.jpg');
    const r1 = correr(PHP, args(
      `$im=imagecreatetruecolor(1200,800);for($y=0;$y<800;$y+=8){for($x=0;$x<1200;$x+=8){`
      + `imagefilledrectangle($im,$x,$y,$x+8,$y+8,imagecolorallocate($im,($x+$y)%255,($x*2)%255,($y*3)%255));}}`
      + `imagejpeg($im,${JSON.stringify(jpg)},85);`));
    if (r1.ok) f['portada-1200x800.jpg'] = jpg;
    const webp = path.join(dir, 'portada-1200x800.webp');
    const r2 = correr(PHP, args(
      `if(!function_exists('imagewebp'))exit(1);$im=imagecreatetruecolor(1200,800);`
      + `imagefilledrectangle($im,0,0,1200,800,imagecolorallocate($im,30,140,90));`
      + `imagewebp($im,${JSON.stringify(webp)},80);`));
    if (r2.ok) f['portada-1200x800.webp'] = webp;
  }
  return f;
}
