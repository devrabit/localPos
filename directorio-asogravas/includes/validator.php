<?php
/**
 * Validación de formato, sin dependencia de WordPress.
 * Un valor vacío es válido. Si trae texto, debe cumplir el formato.
 */

if (! defined('ABSPATH') && PHP_SAPI !== 'cli') {
	exit;
}

/**
 * @param string $valor
 * @return string|null Mensaje de error, o null si es válido.
 */
function directorio_asogravas_validar_telefono($valor) {
	$valor = trim((string) $valor);
	if ($valor === '') {
		return null;
	}

	if (! preg_match('/^\+?[0-9 ]+$/', $valor)) {
		return 'El teléfono debe tener entre 7 y 15 dígitos. Se permiten espacios y un signo + al inicio.';
	}

	$digitos = preg_replace('/\D/', '', $valor);
	$cantidad = strlen((string) $digitos);
	if ($cantidad < 7 || $cantidad > 15) {
		return 'El teléfono debe tener entre 7 y 15 dígitos. Se permiten espacios y un signo + al inicio.';
	}

	return null;
}

/**
 * @param string $valor
 * @return string|null
 */
function directorio_asogravas_validar_email($valor) {
	$valor = trim((string) $valor);
	if ($valor === '') {
		return null;
	}

	if (filter_var($valor, FILTER_VALIDATE_EMAIL) === false) {
		return 'El email no tiene forma de correo.';
	}

	return null;
}

/**
 * @param string $valor
 * @return bool
 */
function directorio_asogravas_es_url_http($valor) {
	$valor = trim((string) $valor);
	if (! preg_match('#^https?://#i', $valor)) {
		return false;
	}

	if (filter_var($valor, FILTER_VALIDATE_URL) === false) {
		return false;
	}

	$esquema = strtolower((string) parse_url($valor, PHP_URL_SCHEME));
	return $esquema === 'http' || $esquema === 'https';
}

/**
 * @param string $valor
 * @return string|null
 */
function directorio_asogravas_validar_pagina_web($valor) {
	$valor = trim((string) $valor);
	if ($valor === '') {
		return null;
	}

	if (! directorio_asogravas_es_url_http($valor)) {
		return 'La página web debe empezar por http:// o https://.';
	}

	return null;
}

/**
 * @param string $valor
 * @return string|null
 */
function directorio_asogravas_validar_whatsapp($valor) {
	$valor = trim((string) $valor);
	if ($valor === '') {
		return null;
	}

	if (! directorio_asogravas_es_url_http($valor)) {
		return 'WhatsApp debe ser un enlace http o https.';
	}

	return null;
}

/**
 * Si empieza por http, tiene que ser un enlace http o https. Cualquier otro texto vale.
 *
 * @param string $valor
 * @return string|null
 */
function directorio_asogravas_validar_red($valor) {
	$valor = trim((string) $valor);
	if ($valor === '') {
		return null;
	}

	if (preg_match('/^http/i', $valor) && ! directorio_asogravas_es_url_http($valor)) {
		return 'Si la red empieza por http, debe ser un enlace http o https.';
	}

	return null;
}

/**
 * @param string $host
 * @param string $raiz
 * @return bool
 */
function directorio_asogravas_host_es($host, $raiz) {
	$host = strtolower((string) $host);
	$raiz = strtolower((string) $raiz);
	if ($host === $raiz) {
		return true;
	}

	$sufijo = '.' . $raiz;
	$largo  = strlen($sufijo);
	return strlen($host) > $largo && substr($host, -$largo) === $sufijo;
}

/**
 * @param string $valor
 * @return string|null
 */
function directorio_asogravas_validar_youtube($valor) {
	$valor = trim((string) $valor);
	if ($valor === '') {
		return null;
	}

	if (! directorio_asogravas_es_url_http($valor)) {
		return 'El video corporativo debe ser un enlace de YouTube.';
	}

	$host = strtolower((string) parse_url($valor, PHP_URL_HOST));
	if (strpos($host, 'www.') === 0) {
		$host = substr($host, 4);
	}

	$es_youtube = directorio_asogravas_host_es($host, 'youtube.com')
		|| directorio_asogravas_host_es($host, 'youtube-nocookie.com')
		|| $host === 'youtu.be';

	if (! $es_youtube) {
		return 'El video corporativo debe ser un enlace de YouTube.';
	}

	return null;
}

/**
 * @param string $valor
 * @return string|null
 */
function directorio_asogravas_validar_fecha($valor) {
	$valor = trim((string) $valor);
	if ($valor === '') {
		return null;
	}

	$formatos = array('Y-m-d', 'd/m/Y', 'd-m-Y');
	foreach ($formatos as $formato) {
		$fecha = DateTime::createFromFormat('!' . $formato, $valor);
		if (! $fecha) {
			continue;
		}

		$errores = DateTime::getLastErrors();
		if (is_array($errores) && ($errores['warning_count'] > 0 || $errores['error_count'] > 0)) {
			continue;
		}

		if ($fecha->format($formato) === $valor) {
			return null;
		}
	}

	return 'La fecha inicio no es una fecha válida.';
}

/**
 * Normaliza una fecha ya validada a Y-m-d.
 *
 * @param string $valor
 * @return string
 */
function directorio_asogravas_normalizar_fecha($valor) {
	$valor = trim((string) $valor);
	if ($valor === '' || directorio_asogravas_validar_fecha($valor) !== null) {
		return '';
	}

	foreach (array('Y-m-d', 'd/m/Y', 'd-m-Y') as $formato) {
		$fecha = DateTime::createFromFormat('!' . $formato, $valor);
		if ($fecha && $fecha->format($formato) === $valor) {
			return $fecha->format('Y-m-d');
		}
	}

	return '';
}

/**
 * @param string $slug
 * @return bool
 */
function directorio_asogravas_slug_formato_valido($slug) {
	return is_string($slug) && preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug) === 1;
}
