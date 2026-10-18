<?php
/**
 * Guardado del formulario. Si el formato falla, el estado anterior se mantiene.
 */

if (! defined('ABSPATH')) {
	exit;
}

/**
 * @return string[]
 */
function directorio_asogravas_claves_formulario() {
	return array(
		'post_title',
		'empresa_slug',
		'empresa_ciudad',
		'empresa_departamento',
		'empresa_telefono',
		'empresa_email',
		'empresa_datos_extra',
		'empresa_logo_id',
		'empresa_descripcion',
		'empresa_productos',
		'empresa_servicios',
		'empresa_galeria',
		'empresa_red_facebook',
		'empresa_red_x',
		'empresa_red_linkedin',
		'empresa_red_instagram',
		'empresa_red_youtube',
		'empresa_red_tiktok',
		'empresa_web',
		'empresa_video',
		'empresa_catalogo_id',
		'empresa_casos_texto',
		'empresa_casos_pdf_id',
		'empresa_whatsapp',
		'empresa_fecha_inicio',
		'empresa_destacado',
	);
}

/**
 * @return array<string, string>
 */
function directorio_asogravas_redes() {
	return array(
		'empresa_red_facebook'  => 'Facebook',
		'empresa_red_x'         => 'X',
		'empresa_red_linkedin'  => 'LinkedIn',
		'empresa_red_instagram' => 'Instagram',
		'empresa_red_youtube'   => 'YouTube',
		'empresa_red_tiktok'    => 'TikTok',
	);
}

/**
 * @param int $post_id
 * @return string
 */
function directorio_asogravas_clave_intento($post_id) {
	return 'dasog_int_' . get_current_user_id() . '_' . (int) $post_id;
}

/**
 * @param array<string, mixed> $envio
 * @return array<string, string>
 */
function directorio_asogravas_valores_envio($envio) {
	$valores = array();

	foreach (directorio_asogravas_claves_formulario() as $clave) {
		if (! isset($envio[ $clave ]) || is_array($envio[ $clave ])) {
			$valores[ $clave ] = '';
			continue;
		}

		$valores[ $clave ] = (string) wp_unslash($envio[ $clave ]);
	}

	$valores['empresa_destacado'] = empty($envio['empresa_destacado']) ? '' : '1';

	return $valores;
}

/**
 * @param int                  $post_id
 * @param array<string, mixed> $envio
 * @param array<string, string> $errores
 * @return void
 */
function directorio_asogravas_guardar_intento($post_id, $envio, $errores) {
	$dato = array(
		'errores' => $errores,
		'valores' => directorio_asogravas_valores_envio($envio),
	);

	set_transient(directorio_asogravas_clave_intento($post_id), $dato, 15 * MINUTE_IN_SECONDS);

	if (! isset($GLOBALS['directorio_asogravas_intentos']) || ! is_array($GLOBALS['directorio_asogravas_intentos'])) {
		$GLOBALS['directorio_asogravas_intentos'] = array();
	}

	$GLOBALS['directorio_asogravas_intentos'][ (int) $post_id ] = $dato;
}

/**
 * @param int $post_id
 * @return void
 */
function directorio_asogravas_borrar_intento($post_id) {
	delete_transient(directorio_asogravas_clave_intento($post_id));

	if (isset($GLOBALS['directorio_asogravas_intentos']) && is_array($GLOBALS['directorio_asogravas_intentos'])) {
		$GLOBALS['directorio_asogravas_intentos'][ (int) $post_id ] = null;
	}
}

/**
 * @param int $post_id
 * @return array<string, mixed>|null
 */
function directorio_asogravas_obtener_intento($post_id) {
	$post_id = (int) $post_id;

	if (! isset($GLOBALS['directorio_asogravas_intentos']) || ! is_array($GLOBALS['directorio_asogravas_intentos'])) {
		$GLOBALS['directorio_asogravas_intentos'] = array();
	}

	if (array_key_exists($post_id, $GLOBALS['directorio_asogravas_intentos'])) {
		$cache = $GLOBALS['directorio_asogravas_intentos'][ $post_id ];
		return is_array($cache) ? $cache : null;
	}

	if (empty($_GET['empresa_error'])) {
		$GLOBALS['directorio_asogravas_intentos'][ $post_id ] = null;
		return null;
	}

	$dato = get_transient(directorio_asogravas_clave_intento($post_id));
	if (! is_array($dato) || ! isset($dato['valores']) || ! is_array($dato['valores'])) {
		$dato = null;
	}

	$GLOBALS['directorio_asogravas_intentos'][ $post_id ] = $dato;

	return $dato;
}

/**
 * @param string $texto
 * @return string
 */
function directorio_asogravas_texto_envio($texto) {
	return trim((string) wp_unslash($texto));
}

/**
 * @param string $nombre
 * @return string
 */
function directorio_asogravas_slug_desde_nombre($nombre) {
	$slug = sanitize_title($nombre);
	if (strlen($slug) > 180) {
		$slug = rtrim(substr($slug, 0, 180), '-');
	}

	return $slug;
}

/**
 * @param string $slug
 * @param int    $post_id
 * @return bool
 */
function directorio_asogravas_slug_ocupado($slug, $post_id) {
	global $wpdb;

	$otro = $wpdb->get_var(
		$wpdb->prepare(
			"SELECT ID FROM {$wpdb->posts} WHERE post_name = %s AND post_type = %s AND ID != %d AND post_status != %s LIMIT 1",
			$slug,
			'empresa',
			(int) $post_id,
			'auto-draft'
		)
	);

	return (bool) $otro;
}

/**
 * @param string $base
 * @param int    $post_id
 * @return string
 */
function directorio_asogravas_slug_unico($base, $post_id) {
	$base = trim((string) $base, '-');
	if ($base === '' || ! directorio_asogravas_slug_formato_valido($base)) {
		return '';
	}

	$candidato = $base;
	$numero    = 2;

	while (directorio_asogravas_slug_ocupado($candidato, $post_id)) {
		$candidato = $base . '-' . $numero;
		++$numero;
		if ($numero > 200) {
			break;
		}
	}

	return $candidato;
}

/**
 * @param int $adjunto_id
 * @return string
 */
function directorio_asogravas_mime_adjunto($adjunto_id) {
	$adjunto_id = (int) $adjunto_id;
	if ($adjunto_id <= 0) {
		return '';
	}

	$adjunto = get_post($adjunto_id);
	if (! $adjunto || $adjunto->post_type !== 'attachment') {
		return '';
	}

	return (string) get_post_mime_type($adjunto);
}

/**
 * @param int $adjunto_id
 * @return bool
 */
function directorio_asogravas_es_imagen_adjunta($adjunto_id) {
	$mime = directorio_asogravas_mime_adjunto($adjunto_id);
	return $mime !== '' && strpos($mime, 'image/') === 0;
}

/**
 * @param int $adjunto_id
 * @return bool
 */
function directorio_asogravas_es_pdf_adjunto($adjunto_id) {
	$mime = directorio_asogravas_mime_adjunto($adjunto_id);
	return $mime === 'application/pdf' || $mime === 'application/x-pdf';
}

/**
 * @param string $texto
 * @return int[]
 */
function directorio_asogravas_ids_desde_texto($texto) {
	$ids = array();

	foreach (preg_split('/\s*,\s*/', (string) $texto) as $parte) {
		$id = absint($parte);
		if ($id > 0) {
			$ids[] = $id;
		}
	}

	return array_values(array_unique($ids));
}

/**
 * @param array<string, mixed> $envio
 * @param int                  $post_id
 * @return array<string, string>
 */
function directorio_asogravas_validar_envio($envio, $post_id) {
	$errores = array();
	$nombre  = isset($envio['post_title']) ? directorio_asogravas_texto_envio($envio['post_title']) : '';

	if ($nombre === '') {
		$errores['post_title'] = 'El nombre de la empresa es obligatorio.';
	}

	$slug     = isset($envio['empresa_slug']) ? strtolower(directorio_asogravas_texto_envio($envio['empresa_slug'])) : '';
	$generado = $nombre !== '' ? directorio_asogravas_slug_desde_nombre($nombre) : '';
	$automatico = ($slug === '' || $slug === $generado);

	if (! $automatico) {
		if (! directorio_asogravas_slug_formato_valido($slug)) {
			$errores['empresa_slug'] = 'El identificador debe usar letras minúsculas, números y guiones.';
		} elseif (directorio_asogravas_slug_ocupado($slug, $post_id)) {
			$errores['empresa_slug'] = 'Ese identificador ya lo usa otra empresa.';
		}
	} elseif ($nombre !== '' && $generado === '') {
		$errores['empresa_slug'] = 'No se pudo armar el identificador a partir del nombre. Escríbelo con letras minúsculas, números y guiones.';
	}

	$telefono = isset($envio['empresa_telefono']) ? directorio_asogravas_texto_envio($envio['empresa_telefono']) : '';
	$error    = directorio_asogravas_validar_telefono($telefono);
	if ($error) {
		$errores['empresa_telefono'] = $error;
	}

	$email = isset($envio['empresa_email']) ? directorio_asogravas_texto_envio($envio['empresa_email']) : '';
	$error = directorio_asogravas_validar_email($email);
	if ($error) {
		$errores['empresa_email'] = $error;
	}

	foreach (array_keys(directorio_asogravas_redes()) as $clave) {
		$red   = isset($envio[ $clave ]) ? directorio_asogravas_texto_envio($envio[ $clave ]) : '';
		$error = directorio_asogravas_validar_red($red);
		if ($error) {
			$errores[ $clave ] = $error;
		}
	}

	$web   = isset($envio['empresa_web']) ? directorio_asogravas_texto_envio($envio['empresa_web']) : '';
	$error = directorio_asogravas_validar_pagina_web($web);
	if ($error) {
		$errores['empresa_web'] = $error;
	}

	$video = isset($envio['empresa_video']) ? directorio_asogravas_texto_envio($envio['empresa_video']) : '';
	$error = directorio_asogravas_validar_youtube($video);
	if ($error) {
		$errores['empresa_video'] = $error;
	}

	$whatsapp = isset($envio['empresa_whatsapp']) ? directorio_asogravas_texto_envio($envio['empresa_whatsapp']) : '';
	$error    = directorio_asogravas_validar_whatsapp($whatsapp);
	if ($error) {
		$errores['empresa_whatsapp'] = $error;
	}

	$fecha = isset($envio['empresa_fecha_inicio']) ? directorio_asogravas_texto_envio($envio['empresa_fecha_inicio']) : '';
	$error = directorio_asogravas_validar_fecha($fecha);
	if ($error) {
		$errores['empresa_fecha_inicio'] = $error;
	}

	$logo = isset($envio['empresa_logo_id']) ? absint($envio['empresa_logo_id']) : 0;
	if ($logo > 0 && ! directorio_asogravas_es_imagen_adjunta($logo)) {
		$errores['empresa_logo_id'] = 'El logo debe ser una imagen.';
	}

	$galeria = directorio_asogravas_ids_desde_texto(isset($envio['empresa_galeria']) ? directorio_asogravas_texto_envio($envio['empresa_galeria']) : '');
	foreach ($galeria as $imagen_id) {
		if (! directorio_asogravas_es_imagen_adjunta($imagen_id)) {
			$errores['empresa_galeria'] = 'Cada imagen de la galería debe ser un archivo de imagen.';
			break;
		}
	}

	$catalogo = isset($envio['empresa_catalogo_id']) ? absint($envio['empresa_catalogo_id']) : 0;
	if ($catalogo > 0 && ! directorio_asogravas_es_pdf_adjunto($catalogo)) {
		$errores['empresa_catalogo_id'] = 'El catálogo debe ser un PDF.';
	}

	$casos_pdf = isset($envio['empresa_casos_pdf_id']) ? absint($envio['empresa_casos_pdf_id']) : 0;
	if ($casos_pdf > 0 && ! directorio_asogravas_es_pdf_adjunto($casos_pdf)) {
		$errores['empresa_casos_pdf_id'] = 'El archivo de casos de éxito debe ser un PDF.';
	}

	return $errores;
}

/**
 * @param array<string, mixed> $envio
 * @param string               $nombre
 * @param int                  $post_id
 * @return string
 */
function directorio_asogravas_resolver_slug($envio, $nombre, $post_id) {
	$ingresado = isset($envio['empresa_slug']) ? strtolower(directorio_asogravas_texto_envio($envio['empresa_slug'])) : '';
	$generado  = directorio_asogravas_slug_desde_nombre($nombre);

	if ($ingresado === '' || $ingresado === $generado) {
		return directorio_asogravas_slug_unico($generado, $post_id);
	}

	return $ingresado;
}

/**
 * @return string draft|publish
 */
function directorio_asogravas_estado_pedido() {
	if (! empty($_POST['empresa_volver_borrador'])) {
		return 'draft';
	}

	if (! empty($_POST['publish'])) {
		return 'publish';
	}

	$estado = isset($_POST['post_status']) ? sanitize_key(wp_unslash($_POST['post_status'])) : '';
	if ($estado === 'publish') {
		return 'publish';
	}

	return 'draft';
}

/**
 * @param array<string, mixed> $data
 * @param WP_Post              $post
 * @return array<string, mixed>
 */
function directorio_asogravas_restaurar_entrada($data, $post) {
	$campos = array(
		'post_author',
		'post_date',
		'post_date_gmt',
		'post_content',
		'post_content_filtered',
		'post_title',
		'post_excerpt',
		'post_status',
		'post_password',
		'post_name',
		'post_modified',
		'post_modified_gmt',
		'post_parent',
		'menu_order',
		'post_mime_type',
		'guid',
		'comment_status',
		'ping_status',
		'to_ping',
		'pinged',
	);

	foreach ($campos as $campo) {
		$data[ $campo ] = wp_slash($post->$campo);
	}

	return $data;
}

/**
 * @param array<string, mixed> $data
 * @param array<string, mixed> $postarr
 * @return array<string, mixed>
 */
function directorio_asogravas_filtrar_datos($data, $postarr) {
	if (! isset($data['post_type']) || $data['post_type'] !== 'empresa') {
		return $data;
	}

	$post_id   = isset($postarr['ID']) ? (int) $postarr['ID'] : 0;
	$existente = $post_id ? get_post($post_id) : null;
	$es_empresa = $existente && $existente->post_type === 'empresa';

	if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
		return $es_empresa ? directorio_asogravas_restaurar_entrada($data, $existente) : $data;
	}

	if (! isset($_POST['empresa_datos_nonce'])) {
		return $data;
	}

	$formulario_id = isset($_POST['post_ID']) ? (int) $_POST['post_ID'] : 0;
	if ($formulario_id <= 0 || $post_id !== $formulario_id) {
		return $data;
	}

	if (isset($_REQUEST['action']) && in_array($_REQUEST['action'], array('trash', 'untrash', 'delete'), true)) {
		return $data;
	}

	$nonce = wp_unslash($_POST['empresa_datos_nonce']);
	if (! is_string($nonce) || ! wp_verify_nonce($nonce, 'empresa_guardar_datos')) {
		$GLOBALS['directorio_asogravas_no_guardado'] = true;
		return $es_empresa ? directorio_asogravas_restaurar_entrada($data, $existente) : $data;
	}

	if (! current_user_can('edit_empresa', $post_id)) {
		$GLOBALS['directorio_asogravas_no_guardado'] = true;
		return $es_empresa ? directorio_asogravas_restaurar_entrada($data, $existente) : $data;
	}

	$errores = directorio_asogravas_validar_envio($_POST, $post_id);
	if ($errores) {
		directorio_asogravas_guardar_intento($post_id, $_POST, $errores);
		$GLOBALS['directorio_asogravas_no_guardado'] = true;
		return $es_empresa ? directorio_asogravas_restaurar_entrada($data, $existente) : $data;
	}

	$nombre = isset($_POST['post_title']) ? directorio_asogravas_texto_envio($_POST['post_title']) : '';
	$slug   = directorio_asogravas_resolver_slug($_POST, $nombre, $post_id);

	$data['post_title']   = wp_slash($nombre);
	$data['post_name']    = wp_slash($slug);
	$data['post_status']  = directorio_asogravas_estado_pedido();
	$data['post_content'] = '';
	$data['post_excerpt'] = '';

	return $data;
}

/**
 * @param int     $post_id
 * @param WP_Post $post
 * @return void
 */
function directorio_asogravas_guardar_meta($post_id, $post) {
	if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
		return;
	}

	if (! isset($_POST['empresa_datos_nonce'])) {
		return;
	}

	$formulario_id = isset($_POST['post_ID']) ? (int) $_POST['post_ID'] : 0;
	if ($formulario_id !== (int) $post_id) {
		return;
	}

	if (isset($_REQUEST['action']) && in_array($_REQUEST['action'], array('trash', 'untrash', 'delete'), true)) {
		return;
	}

	$nonce = wp_unslash($_POST['empresa_datos_nonce']);
	if (! is_string($nonce) || ! wp_verify_nonce($nonce, 'empresa_guardar_datos')) {
		return;
	}

	if (! current_user_can('edit_empresa', $post_id)) {
		return;
	}

	if (! empty($GLOBALS['directorio_asogravas_no_guardado'])) {
		return;
	}

	if ($post->post_type !== 'empresa') {
		return;
	}

	$texto = array(
		'empresa_ciudad'         => '_empresa_ciudad',
		'empresa_departamento'   => '_empresa_departamento',
		'empresa_telefono'       => '_empresa_telefono',
		'empresa_email'          => '_empresa_email',
		'empresa_red_facebook'   => '_empresa_red_facebook',
		'empresa_red_x'          => '_empresa_red_x',
		'empresa_red_linkedin'   => '_empresa_red_linkedin',
		'empresa_red_instagram'  => '_empresa_red_instagram',
		'empresa_red_youtube'    => '_empresa_red_youtube',
		'empresa_red_tiktok'     => '_empresa_red_tiktok',
	);

	foreach ($texto as $clave => $meta) {
		$valor = isset($_POST[ $clave ]) ? directorio_asogravas_texto_envio($_POST[ $clave ]) : '';
		update_post_meta($post_id, $meta, wp_slash(sanitize_text_field($valor)));
	}

	$enlaces = array(
		'empresa_web'      => '_empresa_web',
		'empresa_video'    => '_empresa_video',
		'empresa_whatsapp' => '_empresa_whatsapp',
	);

	foreach ($enlaces as $clave => $meta) {
		$valor = isset($_POST[ $clave ]) ? directorio_asogravas_texto_envio($_POST[ $clave ]) : '';
		update_post_meta($post_id, $meta, wp_slash(esc_url_raw($valor)));
	}

	$editores = array(
		'empresa_datos_extra' => '_empresa_datos_extra',
		'empresa_descripcion' => '_empresa_descripcion',
		'empresa_productos'   => '_empresa_productos',
	);

	foreach ($editores as $clave => $meta) {
		$valor = isset($_POST[ $clave ]) ? wp_kses_post(wp_unslash($_POST[ $clave ])) : '';
		update_post_meta($post_id, $meta, wp_slash($valor));
	}

	$areas = array(
		'empresa_servicios'    => '_empresa_servicios',
		'empresa_casos_texto'  => '_empresa_casos_texto',
	);

	foreach ($areas as $clave => $meta) {
		$valor = isset($_POST[ $clave ]) ? sanitize_textarea_field(wp_unslash($_POST[ $clave ])) : '';
		update_post_meta($post_id, $meta, wp_slash($valor));
	}

	$fecha = isset($_POST['empresa_fecha_inicio']) ? directorio_asogravas_texto_envio($_POST['empresa_fecha_inicio']) : '';
	update_post_meta($post_id, '_empresa_fecha_inicio', directorio_asogravas_normalizar_fecha($fecha));

	$destacado = empty($_POST['empresa_destacado']) ? '' : '1';
	update_post_meta($post_id, '_empresa_destacado', $destacado);

	$logo = isset($_POST['empresa_logo_id']) ? absint($_POST['empresa_logo_id']) : 0;
	if ($logo > 0) {
		update_post_meta($post_id, '_empresa_logo_id', $logo);
	} else {
		delete_post_meta($post_id, '_empresa_logo_id');
	}

	$catalogo = isset($_POST['empresa_catalogo_id']) ? absint($_POST['empresa_catalogo_id']) : 0;
	if ($catalogo > 0) {
		update_post_meta($post_id, '_empresa_catalogo_id', $catalogo);
	} else {
		delete_post_meta($post_id, '_empresa_catalogo_id');
	}

	$casos_pdf = isset($_POST['empresa_casos_pdf_id']) ? absint($_POST['empresa_casos_pdf_id']) : 0;
	if ($casos_pdf > 0) {
		update_post_meta($post_id, '_empresa_casos_pdf_id', $casos_pdf);
	} else {
		delete_post_meta($post_id, '_empresa_casos_pdf_id');
	}

	$galeria = directorio_asogravas_ids_desde_texto(
		isset($_POST['empresa_galeria']) ? directorio_asogravas_texto_envio($_POST['empresa_galeria']) : ''
	);
	update_post_meta($post_id, '_empresa_galeria', $galeria);

	directorio_asogravas_borrar_intento($post_id);
}

/**
 * @param string $ubicacion
 * @param int    $post_id
 * @return string
 */
function directorio_asogravas_redirect($ubicacion, $post_id) {
	if (get_post_type($post_id) !== 'empresa') {
		return $ubicacion;
	}

	if (! empty($GLOBALS['directorio_asogravas_no_guardado'])) {
		$ubicacion = remove_query_arg('message', $ubicacion);
		return add_query_arg('empresa_error', '1', $ubicacion);
	}

	return $ubicacion;
}
