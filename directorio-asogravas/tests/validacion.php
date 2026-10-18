<?php
/**
 * Comprueba el formato de los campos sin levantar WordPress.
 * Uso: php tests/validacion.php
 */

if (PHP_SAPI !== 'cli') {
	exit;
}

require dirname(__DIR__) . '/includes/validator.php';

$fallos = 0;

function afirmar($condicion, $mensaje) {
	global $fallos;
	if ($condicion) {
		echo "ok  {$mensaje}\n";
		return;
	}

	$fallos++;
	echo "FALLO  {$mensaje}\n";
}

afirmar(directorio_asogravas_validar_telefono('') === null, 'teléfono vacío');
afirmar(directorio_asogravas_validar_telefono('+57 300 123 4567') === null, 'teléfono internacional');
afirmar(directorio_asogravas_validar_telefono('1234567') === null, 'teléfono de 7 dígitos');
afirmar(directorio_asogravas_validar_telefono('123456') !== null, 'teléfono corto');
afirmar(directorio_asogravas_validar_telefono('+1234567890123456') !== null, 'teléfono de 16 dígitos');
afirmar(directorio_asogravas_validar_telefono('++1234567') !== null, 'teléfono con dos signos +');
afirmar(directorio_asogravas_validar_telefono('300-123') !== null, 'teléfono con guiones');

afirmar(directorio_asogravas_validar_email('') === null, 'email vacío');
afirmar(directorio_asogravas_validar_email('ana@example.com') === null, 'email válido');
afirmar(directorio_asogravas_validar_email('ana@') !== null, 'email inválido');

afirmar(directorio_asogravas_validar_pagina_web('') === null, 'web vacía');
afirmar(directorio_asogravas_validar_pagina_web('https://asogravas.org') === null, 'web https');
afirmar(directorio_asogravas_validar_pagina_web('http://asogravas.org/directorio') === null, 'web http');
afirmar(directorio_asogravas_validar_pagina_web('asogravas.org') !== null, 'web sin esquema');
afirmar(directorio_asogravas_validar_pagina_web('ftp://asogravas.org') !== null, 'web ftp');

afirmar(directorio_asogravas_validar_whatsapp('https://wa.me/573001112233') === null, 'whatsapp https');
afirmar(directorio_asogravas_validar_whatsapp('wa.me/57300') !== null, 'whatsapp sin esquema');

afirmar(directorio_asogravas_validar_red('') === null, 'red vacía');
afirmar(directorio_asogravas_validar_red('acme') === null, 'red como texto');
afirmar(directorio_asogravas_validar_red('https://x.com/acme') === null, 'red https');
afirmar(directorio_asogravas_validar_red('http://') !== null, 'red http incompleta');
afirmar(directorio_asogravas_validar_red('nota interna') === null, 'red que no es enlace');

afirmar(directorio_asogravas_validar_youtube('https://www.youtube.com/watch?v=abc') === null, 'youtube watch');
afirmar(directorio_asogravas_validar_youtube('https://youtu.be/abc') === null, 'youtu.be');
afirmar(directorio_asogravas_validar_youtube('https://m.youtube.com/shorts/abc') === null, 'youtube móvil');
afirmar(directorio_asogravas_validar_youtube('https://vimeo.com/123') !== null, 'video que no es YouTube');
afirmar(directorio_asogravas_validar_youtube('https://notyoutube.com/watch?v=abc') !== null, 'dominio parecido a YouTube');

afirmar(directorio_asogravas_validar_fecha('') === null, 'fecha vacía');
afirmar(directorio_asogravas_validar_fecha('2024-01-15') === null, 'fecha ISO');
afirmar(directorio_asogravas_validar_fecha('15/01/2024') === null, 'fecha día/mes/año');
afirmar(directorio_asogravas_validar_fecha('2020-02-31') !== null, 'fecha imposible');
afirmar(directorio_asogravas_normalizar_fecha('15/01/2024') === '2024-01-15', 'normaliza la fecha');

afirmar(directorio_asogravas_slug_formato_valido('acme'), 'slug simple');
afirmar(directorio_asogravas_slug_formato_valido('acme-2'), 'slug con número');
afirmar(! directorio_asogravas_slug_formato_valido('Acme'), 'slug con mayúscula');
afirmar(! directorio_asogravas_slug_formato_valido('acme--norte'), 'slug con guion doble');
afirmar(! directorio_asogravas_slug_formato_valido('-acme'), 'slug que empieza con guion');
afirmar(! directorio_asogravas_slug_formato_valido(''), 'slug vacío');

if ($fallos > 0) {
	fwrite(STDERR, "{$fallos} comprobaciones fallaron.\n");
	exit(1);
}

echo "Formato de campos en orden.\n";
exit(0);
