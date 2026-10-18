<?php
/**
 * Formulario único de alta y de edición.
 */

if (! defined('ABSPATH')) {
	exit;
}

/**
 * @param string $gancho
 * @return void
 */
function directorio_asogravas_recursos($gancho) {
	if (! in_array($gancho, array('post.php', 'post-new.php', 'edit.php'), true)) {
		return;
	}

	$pantalla = get_current_screen();
	if (! $pantalla || $pantalla->post_type !== 'empresa') {
		return;
	}

	wp_enqueue_style(
		'directorio-asogravas-admin',
		plugins_url('assets/admin.css', DIRECTORIO_ASOGRAVAS_FILE),
		array(),
		DIRECTORIO_ASOGRAVAS_VERSION
	);

	if ($gancho === 'edit.php') {
		return;
	}

	wp_dequeue_script('autosave');
	wp_enqueue_media();
	wp_enqueue_script(
		'directorio-asogravas-admin',
		plugins_url('assets/admin.js', DIRECTORIO_ASOGRAVAS_FILE),
		array('jquery', 'media-editor'),
		DIRECTORIO_ASOGRAVAS_VERSION,
		true
	);
}

/**
 * @param WP_Post $post
 * @return void
 */
function directorio_asogravas_etiqueta_nombre($post) {
	if ($post->post_type !== 'empresa') {
		return;
	}

	$intento = directorio_asogravas_obtener_intento($post->ID);
	if ($intento && isset($intento['valores']['post_title'])) {
		$post->post_title = (string) $intento['valores']['post_title'];
	}

	echo '<div class="empresa-campo empresa-nombre"><label for="title"><strong>Nombre de la empresa</strong></label>';
	echo '<p class="description">Obligatorio para guardar y para publicar.</p></div>';
}

/**
 * @param WP_Post $post
 * @return void
 */
function directorio_asogravas_despues_del_titulo($post) {
	if ($post->post_type !== 'empresa') {
		return;
	}

	directorio_asogravas_mostrar_error($post->ID, 'post_title');

	$intento = directorio_asogravas_obtener_intento($post->ID);
	if ($intento && isset($intento['valores']['empresa_slug'])) {
		$slug = (string) $intento['valores']['empresa_slug'];
	} else {
		$slug = (string) $post->post_name;
		if ($post->post_status === 'auto-draft') {
			$slug = '';
		}
	}

	$error = directorio_asogravas_tiene_error($post->ID, 'empresa_slug');
	echo '<div class="empresa-campo empresa-slug' . ($error ? ' empresa-campo-error' : '') . '">';
	echo '<label for="empresa_slug"><strong>Identificador (slug)</strong></label>';
	echo '<p class="description">Se arma a partir del nombre. Puedes corregirlo. Letras minúsculas, números y guiones. Único entre empresas.</p>';
	echo '<input type="text" class="widefat" id="empresa_slug" name="empresa_slug" value="' . esc_attr($slug) . '" autocomplete="off"';
	if ($error) {
		echo ' aria-invalid="true" aria-describedby="error-empresa_slug"';
	}
	echo ' />';
	directorio_asogravas_mostrar_error($post->ID, 'empresa_slug');
	echo '</div>';
}

/**
 * @param string $texto
 * @param WP_Post $post
 * @return string
 */
function directorio_asogravas_placeholder_titulo($texto, $post) {
	if ($post->post_type === 'empresa') {
		return 'Nombre de la empresa';
	}

	return $texto;
}

/**
 * @return void
 */
function directorio_asogravas_caja() {
	add_meta_box(
		'directorio_asogravas_datos',
		'Datos de la empresa',
		'directorio_asogravas_render_caja',
		'empresa',
		'normal',
		'high'
	);

	remove_meta_box('slugdiv', 'empresa', 'normal');
}

/**
 * @param WP_Post $post
 * @return void
 */
function directorio_asogravas_render_caja($post) {
	wp_nonce_field('empresa_guardar_datos', 'empresa_datos_nonce');

	$valor = function ($clave, $meta) use ($post) {
		return directorio_asogravas_valor_campo($post->ID, $clave, $meta);
	};

	directorio_asogravas_input($post->ID, 'empresa_ciudad', 'Ciudad', $valor('empresa_ciudad', '_empresa_ciudad'), 'Texto libre.');
	directorio_asogravas_input($post->ID, 'empresa_departamento', 'Departamento', $valor('empresa_departamento', '_empresa_departamento'), 'Texto libre. No es una lista de departamentos.');
	directorio_asogravas_input($post->ID, 'empresa_telefono', 'Teléfono', $valor('empresa_telefono', '_empresa_telefono'), 'Opcional. Si lo completas: entre 7 y 15 dígitos, espacios y un signo + al inicio.');
	directorio_asogravas_input($post->ID, 'empresa_email', 'Email', $valor('empresa_email', '_empresa_email'), 'Opcional. Si lo completas, debe tener forma de correo.');

	directorio_asogravas_editor($post->ID, 'empresa_datos_extra', 'Datos extra', $valor('empresa_datos_extra', '_empresa_datos_extra'));
	directorio_asogravas_selector_archivo($post->ID, 'empresa_logo_id', 'Logo', $valor('empresa_logo_id', '_empresa_logo_id'), 'imagen', 'Seleccionar logo', 'Quitar logo');
	directorio_asogravas_editor($post->ID, 'empresa_descripcion', 'Descripción de la empresa', $valor('empresa_descripcion', '_empresa_descripcion'));
	directorio_asogravas_editor($post->ID, 'empresa_productos', 'Productos', $valor('empresa_productos', '_empresa_productos'));
	directorio_asogravas_area($post->ID, 'empresa_servicios', 'Servicios', $valor('empresa_servicios', '_empresa_servicios'), 'Texto sin formato.');

	directorio_asogravas_galeria($post->ID, $valor('empresa_galeria', '_empresa_galeria'));

	echo '<fieldset class="empresa-redes"><legend><strong>Redes sociales</strong></legend>';
	echo '<p class="description">Cada red es independiente y puede quedar vacía. Si empieza por http, tiene que ser un enlace http o https.</p>';
	foreach (directorio_asogravas_redes() as $clave => $etiqueta) {
		$meta = '_' . $clave;
		directorio_asogravas_input($post->ID, $clave, $etiqueta, $valor($clave, $meta), '');
	}
	echo '</fieldset>';

	directorio_asogravas_input($post->ID, 'empresa_web', 'Página web', $valor('empresa_web', '_empresa_web'), 'Opcional. Si la completas, debe empezar por http:// o https://.');
	directorio_asogravas_input($post->ID, 'empresa_video', 'Video corporativo', $valor('empresa_video', '_empresa_video'), 'Opcional. Si lo completas, un enlace de YouTube.');
	directorio_asogravas_selector_archivo($post->ID, 'empresa_catalogo_id', 'Catálogo descargable', $valor('empresa_catalogo_id', '_empresa_catalogo_id'), 'pdf', 'Seleccionar PDF', 'Quitar PDF');

	echo '<fieldset class="empresa-casos"><legend><strong>Casos de éxito</strong></legend>';
	echo '<p class="description">El texto y el PDF existen por separado. Cada uno puede quedar vacío.</p>';
	directorio_asogravas_area($post->ID, 'empresa_casos_texto', 'Texto de casos de éxito', $valor('empresa_casos_texto', '_empresa_casos_texto'), '');
	directorio_asogravas_selector_archivo($post->ID, 'empresa_casos_pdf_id', 'PDF de casos de éxito', $valor('empresa_casos_pdf_id', '_empresa_casos_pdf_id'), 'pdf', 'Seleccionar PDF', 'Quitar PDF');
	echo '</fieldset>';

	directorio_asogravas_input($post->ID, 'empresa_whatsapp', 'WhatsApp', $valor('empresa_whatsapp', '_empresa_whatsapp'), 'Opcional. Si lo completas, un enlace http o https.');

	$fecha = $valor('empresa_fecha_inicio', '_empresa_fecha_inicio');
	$fecha_error = directorio_asogravas_tiene_error($post->ID, 'empresa_fecha_inicio');
	$tipo_fecha  = ($fecha === '' || preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) ? 'date' : 'text';
	echo '<div class="empresa-campo' . ($fecha_error ? ' empresa-campo-error' : '') . '">';
	echo '<label for="empresa_fecha_inicio"><strong>Fecha inicio</strong></label>';
	echo '<p class="description">Opcional. Si la completas, una fecha válida.</p>';
	echo '<input type="' . esc_attr($tipo_fecha) . '" id="empresa_fecha_inicio" name="empresa_fecha_inicio" value="' . esc_attr($fecha) . '"';
	if ($fecha_error) {
		echo ' aria-invalid="true" aria-describedby="error-empresa_fecha_inicio"';
	}
	echo ' />';
	directorio_asogravas_mostrar_error($post->ID, 'empresa_fecha_inicio');
	echo '</div>';

	$destacado = $valor('empresa_destacado', '_empresa_destacado') === '1';
	echo '<div class="empresa-campo empresa-destacado">';
	echo '<label for="empresa_destacado"><input type="checkbox" id="empresa_destacado" name="empresa_destacado" value="1" ' . checked($destacado, true, false) . ' /> ';
	echo '<strong>Destacado en página principal</strong></label>';
	echo '</div>';
}

/**
 * El aviso va al final del formulario, sin campos.
 *
 * @param WP_Post $post
 * @return void
 */
function directorio_asogravas_aviso_cotizacion($post) {
	if ($post->post_type !== 'empresa') {
		return;
	}

	echo '<div class="empresa-cotizacion"><p>Solicitud de cotización: en definición.</p></div>';
}

/**
 * @param WP_Post $post
 * @return void
 */
function directorio_asogravas_boton_borrador($post) {
	if (! $post || $post->post_type !== 'empresa' || $post->post_status !== 'publish') {
		return;
	}

	echo '<div class="empresa-volver-borrador"><button type="submit" name="empresa_volver_borrador" id="empresa-volver-borrador" class="button" value="1">Volver a borrador</button></div>';
}

/**
 * @return void
 */
function directorio_asogravas_aviso_error() {
	if (empty($_GET['empresa_error'])) {
		return;
	}

	$pantalla = function_exists('get_current_screen') ? get_current_screen() : null;
	if (! $pantalla || $pantalla->base !== 'post' || $pantalla->post_type !== 'empresa') {
		return;
	}

	$post_id = isset($_GET['post']) ? (int) $_GET['post'] : 0;
	$intento = directorio_asogravas_obtener_intento($post_id);

	echo '<div class="notice notice-error"><p>No se guardó la empresa.</p>';
	if ($intento && ! empty($intento['errores']) && is_array($intento['errores'])) {
		echo '<ul class="empresa-errores-resumen">';
		foreach ($intento['errores'] as $mensaje) {
			echo '<li>' . esc_html((string) $mensaje) . '</li>';
		}
		echo '</ul>';
	}
	echo '</div>';
}

/**
 * @param int    $post_id
 * @param string $clave
 * @param string $meta
 * @return string
 */
function directorio_asogravas_valor_campo($post_id, $clave, $meta) {
	$intento = directorio_asogravas_obtener_intento($post_id);
	if ($intento && array_key_exists($clave, $intento['valores'])) {
		return (string) $intento['valores'][ $clave ];
	}

	if ($clave === 'empresa_galeria') {
		$guardado = get_post_meta($post_id, '_empresa_galeria', true);
		if (! is_array($guardado)) {
			return '';
		}

		return implode(',', array_map('absint', $guardado));
	}

	$guardado = get_post_meta($post_id, $meta, true);
	if (is_array($guardado)) {
		return '';
	}

	return (string) $guardado;
}

/**
 * @param int    $post_id
 * @param string $clave
 * @return bool
 */
function directorio_asogravas_tiene_error($post_id, $clave) {
	$intento = directorio_asogravas_obtener_intento($post_id);
	return $intento && ! empty($intento['errores'][ $clave ]);
}

/**
 * @param int    $post_id
 * @param string $clave
 * @return void
 */
function directorio_asogravas_mostrar_error($post_id, $clave) {
	$intento = directorio_asogravas_obtener_intento($post_id);
	if (! $intento || empty($intento['errores'][ $clave ])) {
		return;
	}

	echo '<p class="empresa-error" id="error-' . esc_attr($clave) . '">' . esc_html((string) $intento['errores'][ $clave ]) . '</p>';
}

/**
 * @param int    $post_id
 * @param string $clave
 * @param string $etiqueta
 * @param string $valor
 * @param string $ayuda
 * @return void
 */
function directorio_asogravas_input($post_id, $clave, $etiqueta, $valor, $ayuda) {
	$error = directorio_asogravas_tiene_error($post_id, $clave);
	echo '<div class="empresa-campo' . ($error ? ' empresa-campo-error' : '') . '">';
	echo '<label for="' . esc_attr($clave) . '"><strong>' . esc_html($etiqueta) . '</strong></label>';
	if ($ayuda !== '') {
		echo '<p class="description">' . esc_html($ayuda) . '</p>';
	}
	echo '<input type="text" class="widefat" id="' . esc_attr($clave) . '" name="' . esc_attr($clave) . '" value="' . esc_attr($valor) . '"';
	if ($error) {
		echo ' aria-invalid="true" aria-describedby="error-' . esc_attr($clave) . '"';
	}
	echo ' />';
	directorio_asogravas_mostrar_error($post_id, $clave);
	echo '</div>';
}

/**
 * @param int    $post_id
 * @param string $clave
 * @param string $etiqueta
 * @param string $valor
 * @param string $ayuda
 * @return void
 */
function directorio_asogravas_area($post_id, $clave, $etiqueta, $valor, $ayuda) {
	$error = directorio_asogravas_tiene_error($post_id, $clave);
	echo '<div class="empresa-campo' . ($error ? ' empresa-campo-error' : '') . '">';
	echo '<label for="' . esc_attr($clave) . '"><strong>' . esc_html($etiqueta) . '</strong></label>';
	if ($ayuda !== '') {
		echo '<p class="description">' . esc_html($ayuda) . '</p>';
	}
	echo '<textarea class="widefat" rows="6" id="' . esc_attr($clave) . '" name="' . esc_attr($clave) . '"';
	if ($error) {
		echo ' aria-invalid="true" aria-describedby="error-' . esc_attr($clave) . '"';
	}
	echo '>' . esc_textarea($valor) . '</textarea>';
	directorio_asogravas_mostrar_error($post_id, $clave);
	echo '</div>';
}

/**
 * @param int    $post_id
 * @param string $clave
 * @param string $etiqueta
 * @param string $valor
 * @return void
 */
function directorio_asogravas_editor($post_id, $clave, $etiqueta, $valor) {
	echo '<div class="empresa-campo">';
	echo '<label for="' . esc_attr($clave) . '"><strong>' . esc_html($etiqueta) . '</strong></label>';
	wp_editor(
		$valor,
		$clave,
		array(
			'textarea_name' => $clave,
			'textarea_rows' => 8,
			'media_buttons' => false,
			'teeny'         => false,
		)
	);
	echo '</div>';
}

/**
 * @param int    $post_id
 * @param string $clave
 * @param string $etiqueta
 * @param string $valor
 * @param string $tipo imagen|pdf
 * @param string $texto_boton
 * @param string $texto_quitar
 * @return void
 */
function directorio_asogravas_selector_archivo($post_id, $clave, $etiqueta, $valor, $tipo, $texto_boton, $texto_quitar) {
	$id    = absint($valor);
	$error = directorio_asogravas_tiene_error($post_id, $clave);
	echo '<div class="empresa-campo empresa-archivo' . ($error ? ' empresa-campo-error' : '') . '" data-tipo="' . esc_attr($tipo) . '">';
	echo '<label for="' . esc_attr($clave) . '"><strong>' . esc_html($etiqueta) . '</strong></label>';
	echo '<input type="hidden" id="' . esc_attr($clave) . '" name="' . esc_attr($clave) . '" value="' . esc_attr($id > 0 ? (string) $id : '') . '" />';
	echo '<div class="empresa-archivo-vista" id="' . esc_attr($clave) . '-vista">';
	if ($id > 0) {
		directorio_asogravas_vista_archivo($id, $tipo);
	}
	echo '</div>';
	echo '<p class="empresa-archivo-acciones">';
	echo '<button type="button" class="button empresa-archivo-elegir">' . esc_html($texto_boton) . '</button> ';
	echo '<button type="button" class="button-link empresa-archivo-quitar"' . ($id > 0 ? '' : ' hidden') . '>' . esc_html($texto_quitar) . '</button>';
	echo '</p>';
	directorio_asogravas_mostrar_error($post_id, $clave);
	echo '</div>';
}

/**
 * @param int    $id
 * @param string $tipo
 * @return void
 */
function directorio_asogravas_vista_archivo($id, $tipo) {
	if ($tipo === 'imagen' && directorio_asogravas_es_imagen_adjunta($id)) {
		echo wp_get_attachment_image($id, 'thumbnail', false, array('alt' => ''));
		return;
	}

	if ($tipo === 'pdf' && directorio_asogravas_es_pdf_adjunto($id)) {
		$titulo = get_the_title($id);
		echo '<span class="empresa-pdf-nombre">' . esc_html($titulo !== '' ? $titulo : 'PDF') . '</span>';
		return;
	}

	echo '<span class="empresa-archivo-desconocido">Archivo #' . esc_html((string) $id) . '</span>';
}

/**
 * @param int    $post_id
 * @param string $valor
 * @return void
 */
function directorio_asogravas_galeria($post_id, $valor) {
	$ids   = directorio_asogravas_ids_desde_texto($valor);
	$error = directorio_asogravas_tiene_error($post_id, 'empresa_galeria');

	echo '<div class="empresa-campo empresa-galeria' . ($error ? ' empresa-campo-error' : '') . '">';
	echo '<label for="empresa_galeria"><strong>Galería</strong></label>';
	echo '<p class="description">Puedes dejarla vacía o agregar una o varias imágenes.</p>';
	echo '<input type="hidden" id="empresa_galeria" name="empresa_galeria" value="' . esc_attr(implode(',', $ids)) . '" />';
	echo '<ul class="empresa-galeria-lista" id="empresa-galeria-lista">';
	foreach ($ids as $id) {
		echo '<li data-id="' . esc_attr((string) $id) . '">';
		if (directorio_asogravas_es_imagen_adjunta($id)) {
			echo wp_get_attachment_image($id, 'thumbnail', false, array('alt' => ''));
		} else {
			echo '<span class="empresa-archivo-desconocido">Archivo #' . esc_html((string) $id) . '</span>';
		}
		echo '<button type="button" class="button-link empresa-galeria-quitar">Quitar</button>';
		echo '</li>';
	}
	echo '</ul>';
	echo '<p><button type="button" class="button" id="empresa-galeria-agregar">Agregar imágenes</button></p>';
	directorio_asogravas_mostrar_error($post_id, 'empresa_galeria');
	echo '</div>';
}
