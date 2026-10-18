<?php
/**
 * Recorre el CRUD contra un WordPress ya cargado.
 * Uso: wp eval-file tests/integracion.php
 */

if (! defined('ABSPATH')) {
	fwrite(STDERR, "Este script se ejecuta con wp eval-file.\n");
	exit(1);
}

require_once ABSPATH . 'wp-admin/includes/post.php';

$fallos = 0;

function comprobar($condicion, $mensaje) {
	global $fallos;
	if ($condicion) {
		echo "ok  {$mensaje}\n";
		return;
	}

	$fallos++;
	echo "FALLO  {$mensaje}\n";
}

function limpiar_estado_guardado() {
	unset($GLOBALS['directorio_asogravas_no_guardado'], $GLOBALS['directorio_asogravas_intentos']);
}

function guardar_empresa($post_id, $campos, $boton) {
	limpiar_estado_guardado();
	$admin = get_user_by('login', 'admin');
	wp_set_current_user($admin->ID);

	$_POST = array_merge(
		array(
			'post_ID'              => $post_id,
			'post_type'            => 'empresa',
			'post_title'           => '',
			'post_status'          => 'draft',
			'original_post_status' => get_post_status($post_id),
			'post_author'          => $admin->ID,
			'user_ID'              => $admin->ID,
			'visibility'           => 'public',
			'comment_status'       => 'closed',
			'ping_status'          => 'closed',
			'empresa_datos_nonce'  => wp_create_nonce('empresa_guardar_datos'),
			'empresa_slug'         => '',
			'empresa_ciudad'       => '',
			'empresa_departamento' => '',
			'empresa_telefono'     => '',
			'empresa_email'        => '',
			'empresa_datos_extra'  => '',
			'empresa_logo_id'      => '',
			'empresa_descripcion'  => '',
			'empresa_productos'    => '',
			'empresa_servicios'    => '',
			'empresa_galeria'      => '',
			'empresa_red_facebook' => '',
			'empresa_red_x'        => '',
			'empresa_red_linkedin' => '',
			'empresa_red_instagram'=> '',
			'empresa_red_youtube'  => '',
			'empresa_red_tiktok'   => '',
			'empresa_web'          => '',
			'empresa_video'        => '',
			'empresa_catalogo_id'  => '',
			'empresa_casos_texto'  => '',
			'empresa_casos_pdf_id' => '',
			'empresa_whatsapp'     => '',
			'empresa_fecha_inicio' => '',
		),
		$campos
	);

	if ($boton === 'borrador') {
		$_POST['save'] = 'Guardar borrador';
		$_POST['post_status'] = 'draft';
	} elseif ($boton === 'publicar') {
		$_POST['publish'] = 'Publicar';
	} elseif ($boton === 'actualizar') {
		$_POST['save'] = 'Actualizar';
		if (! isset($campos['post_status'])) {
			$_POST['post_status'] = 'publish';
		}
	} elseif ($boton === 'volver') {
		$_POST['empresa_volver_borrador'] = '1';
		$_POST['post_status'] = 'publish';
	}

	edit_post();
	clean_post_cache($post_id);

	return get_post($post_id);
}

function nueva_empresa() {
	$admin = get_user_by('login', 'admin');
	return wp_insert_post(
		array(
			'post_type'   => 'empresa',
			'post_status' => 'auto-draft',
			'post_title'  => 'Auto Draft',
			'post_author' => $admin->ID,
		)
	);
}

function adjunto($mime, $nombre) {
	$admin = get_user_by('login', 'admin');
	return wp_insert_attachment(
		array(
			'post_mime_type' => $mime,
			'post_title'     => $nombre,
			'post_status'    => 'inherit',
			'post_author'    => $admin->ID,
		)
	);
}

$tipo = get_post_type_object('empresa');
comprobar($tipo instanceof WP_Post_Type, 'el tipo Empresa existe');
comprobar($tipo && ! $tipo->public && ! $tipo->publicly_queryable && false === $tipo->rewrite, 'no tiene URL pública');
comprobar($tipo && $tipo->show_ui && $tipo->cap->edit_posts === 'edit_empresas', 'el listado exige edit_empresas');
comprobar(get_object_taxonomies('empresa') === array(), 'no hay categorías ni taxonomías');

$admin = get_user_by('login', 'admin');
comprobar(user_can($admin, 'edit_empresas') && user_can($admin, 'publish_empresas') && user_can($admin, 'delete_empresas'), 'el administrador puede gestionar empresas');

$visitante = get_user_by('login', 'visitante');
if (! $visitante) {
	$suscriptor_id = wp_create_user('visitante', 'visitante-pass-123', 'visitante@example.com');
	$visitante     = get_user_by('id', $suscriptor_id);
}
$visitante->set_role('subscriber');
comprobar(! user_can($visitante, 'edit_empresas') && ! user_can($visitante, 'create_empresas') && ! user_can($visitante, 'publish_empresas'), 'un visitante sin rol de administrador no gestiona empresas');

$columnas = directorio_asogravas_columnas(array('cb' => 'cb', 'title' => 'Title', 'date' => 'Date'));
comprobar(array_keys($columnas) === array('cb', 'title', 'empresa_ciudad', 'empresa_departamento', 'empresa_destacado', 'empresa_estado'), 'el listado tiene nombre, ciudad, departamento, destacado y estado');
comprobar(! isset($columnas['taxonomy-category']) && $columnas['title'] === 'Nombre', 'no hay columna de categoría');

wp_set_current_user($admin->ID);
$viejas = get_posts(
	array(
		'post_type'      => 'empresa',
		'post_status'    => 'any',
		'posts_per_page' => -1,
		'fields'         => 'ids',
	)
);
foreach ($viejas as $vieja_id) {
	wp_delete_post($vieja_id, true);
}

$imagen_a = adjunto('image/jpeg', 'logo-a');
$imagen_b = adjunto('image/png', 'galeria-b');
$imagen_c = adjunto('image/webp', 'galeria-c');
$pdf      = adjunto('application/pdf', 'catalogo');
$pdf_casos = adjunto('application/pdf', 'casos');
$no_imagen = adjunto('application/pdf', 'no-es-imagen');
$no_pdf    = adjunto('image/jpeg', 'no-es-pdf');

$uno = nueva_empresa();
$guardado = guardar_empresa($uno, array('post_title' => 'Cantera Norte'), 'borrador');
comprobar($guardado->post_status === 'draft' && $guardado->post_title === 'Cantera Norte', 'guarda borrador solo con el nombre');
comprobar($guardado->post_name === 'cantera-norte', 'el slug se arma a partir del nombre');
comprobar(get_post_meta($uno, '_empresa_ciudad', true) === '', 'la ciudad puede quedar vacía');

$publicado = guardar_empresa($uno, array('post_title' => 'Cantera Norte'), 'publicar');
comprobar($publicado->post_status === 'publish', 'publica solo con el nombre');

$sigue = guardar_empresa(
	$uno,
	array(
		'post_title'   => 'Cantera Norte',
		'post_status'  => 'publish',
		'empresa_email'=> 'correo-malo',
	),
	'actualizar'
);
comprobar($sigue->post_status === 'publish', 'un email inválido no cambia el estado publicado');
comprobar(get_post_meta($uno, '_empresa_email', true) === '', 'el email inválido no se guarda');
$intento = get_transient(directorio_asogravas_clave_intento($uno));
comprobar(is_array($intento) && isset($intento['errores']['empresa_email']) && $intento['valores']['empresa_email'] === 'correo-malo', 'el formulario conserva el email escrito y marca el campo');

$dos = nueva_empresa();
guardar_empresa($dos, array('post_title' => 'Río Claro'), 'borrador');
$dos_guardado = guardar_empresa(
	$dos,
	array(
		'post_title'    => 'Río Claro',
		'empresa_web'   => 'asogravas.org',
		'empresa_video' => 'https://vimeo.com/123',
		'empresa_whatsapp' => 'wa.me/57300',
		'empresa_telefono' => '123',
		'empresa_logo_id'  => (string) $no_imagen,
		'empresa_galeria'  => (string) $no_imagen,
		'empresa_catalogo_id' => (string) $no_pdf,
		'empresa_descripcion' => 'Menciona Cantera en la descripción, no en el nombre.',
	),
	'publicar'
);
comprobar($dos_guardado->post_status === 'draft' && $dos_guardado->post_title === 'Río Claro', 'los formatos inválidos impiden publicar y conservan el borrador');
$intento_dos = get_transient(directorio_asogravas_clave_intento($dos));
$claves_error = is_array($intento_dos) ? array_keys($intento_dos['errores']) : array();
sort($claves_error);
$esperadas = array('empresa_catalogo_id', 'empresa_galeria', 'empresa_logo_id', 'empresa_telefono', 'empresa_video', 'empresa_web', 'empresa_whatsapp');
sort($esperadas);
comprobar($claves_error === $esperadas, 'señala teléfono, web, video, WhatsApp, logo, galería y catálogo');

$dos_ok = guardar_empresa(
	$dos,
	array(
		'post_title'         => 'Río Claro',
		'empresa_ciudad'     => 'Medellín',
		'empresa_departamento' => 'Antioquia',
		'empresa_telefono'   => '+57 300 123 4567',
		'empresa_email'      => 'rio@example.com',
		'empresa_web'        => 'https://example.com/rio',
		'empresa_video'      => 'https://youtu.be/abc123',
		'empresa_whatsapp'   => 'https://wa.me/573001234567',
		'empresa_logo_id'    => (string) $imagen_a,
		'empresa_galeria'    => $imagen_b . ',' . $imagen_c,
		'empresa_catalogo_id'=> (string) $pdf,
		'empresa_casos_texto'=> 'Obra del puente',
		'empresa_casos_pdf_id' => (string) $pdf_casos,
		'empresa_descripcion' => 'Menciona Cantera en la descripción, no en el nombre.',
		'empresa_red_facebook' => 'perfil-rio',
		'empresa_red_x'        => 'https://x.com/rio',
		'empresa_datos_extra'  => '<p>Dato <strong>extra</strong></p>',
		'empresa_descripcion'  => '<p>Descripción</p>',
		'empresa_productos'    => '<p>Arena y otros</p>',
		'empresa_servicios'    => "Transporte\nMontaje",
		'empresa_fecha_inicio' => '15/03/1998',
	),
	'publicar'
);
comprobar($dos_ok->post_status === 'publish', 'publica cuando los campos llenos tienen formato válido');
comprobar(get_post_meta($dos, '_empresa_ciudad', true) === 'Medellín', 'guarda la ciudad');
comprobar(get_post_meta($dos, '_empresa_departamento', true) === 'Antioquia', 'guarda el departamento');
$galeria = get_post_meta($dos, '_empresa_galeria', true);
comprobar(is_array($galeria) && $galeria === array($imagen_b, $imagen_c), 'la galería guarda varias imágenes');
comprobar(get_post_meta($dos, '_empresa_casos_texto', true) === "Transporte\nMontaje" || get_post_meta($dos, '_empresa_casos_texto', true) === 'Obra del puente', 'guarda el texto de casos de éxito');
comprobar(get_post_meta($dos, '_empresa_casos_texto', true) === 'Obra del puente', 'el texto de casos de éxito queda aparte del PDF');
comprobar((int) get_post_meta($dos, '_empresa_casos_pdf_id', true) === (int) $pdf_casos, 'guarda el PDF de casos de éxito');
comprobar((int) get_post_meta($dos, '_empresa_catalogo_id', true) === (int) $pdf, 'guarda el catálogo PDF');
comprobar((int) get_post_meta($dos, '_empresa_logo_id', true) === (int) $imagen_a, 'guarda el logo');
comprobar(get_post_meta($dos, '_empresa_fecha_inicio', true) === '1998-03-15', 'guarda la fecha inicio');
comprobar(get_post_meta($dos, '_empresa_red_facebook', true) === 'perfil-rio', 'una red puede ser texto');
comprobar(get_post_meta($dos, '_empresa_red_x', true) === 'https://x.com/rio', 'una red puede ser enlace');
comprobar(get_post_meta($dos, '_empresa_servicios', true) === "Transporte\nMontaje", 'servicios se guarda como texto');
comprobar(get_post_meta($dos, '_empresa_destacado', true) !== '1', 'destacado no se marca solo');

$ciudad_nueva = guardar_empresa(
	$dos,
	array(
		'post_title'           => 'Río Claro',
		'post_status'          => 'publish',
		'empresa_ciudad'       => 'Envigado',
		'empresa_departamento' => 'Antioquia',
		'empresa_telefono'     => '+57 300 123 4567',
		'empresa_email'        => 'rio@example.com',
		'empresa_web'          => 'https://example.com/rio',
		'empresa_video'        => 'https://youtu.be/abc123',
		'empresa_whatsapp'     => 'https://wa.me/573001234567',
		'empresa_logo_id'      => (string) $imagen_a,
		'empresa_galeria'      => $imagen_b . ',' . $imagen_c,
		'empresa_catalogo_id'  => (string) $pdf,
		'empresa_casos_texto'  => 'Obra del puente',
		'empresa_casos_pdf_id' => (string) $pdf_casos,
		'empresa_fecha_inicio' => '1998-03-15',
		'empresa_descripcion'  => 'Menciona Cantera en la descripción, no en el nombre.',
	),
	'actualizar'
);
comprobar($ciudad_nueva->post_status === 'publish' && get_post_meta($dos, '_empresa_ciudad', true) === 'Envigado', 'actualizar cambia la ciudad y sigue publicada');

$tres = nueva_empresa();
$destacada = guardar_empresa(
	$tres,
	array(
		'post_title'          => 'Piedra Sur',
		'empresa_destacado'   => '1',
	),
	'borrador'
);
comprobar($destacada->post_status === 'draft' && get_post_meta($tres, '_empresa_destacado', true) === '1', 'destacado se guarda y no publica la empresa');

$slug_repetido = guardar_empresa(
	$tres,
	array(
		'post_title'   => 'Piedra Sur',
		'empresa_slug' => 'cantera-norte',
		'empresa_destacado' => '1',
	),
	'publicar'
);
comprobar($slug_repetido->post_status === 'draft' && $slug_repetido->post_name !== 'cantera-norte', 'un slug repetido no se publica ni pisa a la otra empresa');
$intento_slug = get_transient(directorio_asogravas_clave_intento($tres));
comprobar(is_array($intento_slug) && isset($intento_slug['errores']['empresa_slug']), 'el slug repetido señala el campo');

$mismo_nombre = guardar_empresa(
	$tres,
	array(
		'post_title' => 'Cantera Norte',
		'empresa_destacado' => '1',
	),
	'borrador'
);
comprobar($mismo_nombre->post_status === 'draft' && $mismo_nombre->post_name !== 'cantera-norte' && $mismo_nombre->post_name !== '', 'si el nombre coincide, el slug automático sigue siendo único');

require_once ABSPATH . 'wp-admin/includes/class-wp-screen.php';
require_once ABSPATH . 'wp-admin/includes/screen.php';
set_current_screen('edit-empresa');
global $wp_the_query;
$consulta_nombre = new WP_Query();
$wp_the_query    = $consulta_nombre;
$consulta_nombre->query(
	array(
		'post_type'      => 'empresa',
		'post_status'    => array('publish', 'draft'),
		's'              => 'Cantera',
		'posts_per_page' => -1,
	)
);
$ids_busqueda = array_map('intval', wp_list_pluck($consulta_nombre->posts, 'ID'));
comprobar(in_array((int) $uno, $ids_busqueda, true) && in_array((int) $tres, $ids_busqueda, true) && ! in_array((int) $dos, $ids_busqueda, true), 'la búsqueda por nombre no usa la descripción');

wp_set_current_user($admin->ID);
$trasheada = wp_trash_post($dos);
comprobar($trasheada && get_post_status($dos) === 'trash', 'la empresa queda en la papelera');
$visibles = get_posts(
	array(
		'post_type'      => 'empresa',
		'post_status'    => array('publish', 'draft'),
		'posts_per_page' => -1,
		'fields'         => 'ids',
	)
);
comprobar(! in_array((int) $dos, array_map('intval', $visibles), true), 'la papelera saca la empresa del listado principal');

global $wpdb;
$wpdb->update($wpdb->posts, array('post_modified' => '2020-01-01 00:00:00', 'post_modified_gmt' => '2020-01-01 00:00:00'), array('ID' => $uno));
$wpdb->update($wpdb->posts, array('post_modified' => '2024-06-01 00:00:00', 'post_modified_gmt' => '2024-06-01 00:00:00'), array('ID' => $tres));
clean_post_cache($uno);
clean_post_cache($tres);
$orden = get_posts(
	array(
		'post_type'      => 'empresa',
		'post_status'    => array('publish', 'draft'),
		'posts_per_page' => -1,
		'orderby'        => 'modified',
		'order'          => 'DESC',
		'fields'         => 'ids',
	)
);
comprobar(isset($orden[0]) && (int) $orden[0] === (int) $tres, 'la modificación más reciente queda arriba');

$vuelta = guardar_empresa($uno, array('post_title' => 'Cantera Norte'), 'volver');
comprobar($vuelta->post_status === 'draft' && $vuelta->post_title === 'Cantera Norte', 'volver a borrador deja la empresa en el listado');

$bloqueo = guardar_empresa(
	$uno,
	array(
		'post_title'     => 'Cantera Norte',
		'empresa_telefono' => 'abc',
	),
	'volver'
);
comprobar(get_post_status($uno) === 'draft', 'si el formato falla al volver a borrador, el estado anterior se mantiene');

ob_start();
directorio_asogravas_aviso_cotizacion(get_post($uno));
$aviso = ob_get_clean();
comprobar(strpos($aviso, 'Solicitud de cotización: en definición.') !== false && strpos($aviso, '<input') === false && strpos($aviso, '<form') === false, 'el aviso de cotización no tiene campos ni formulario');

ob_start();
directorio_asogravas_render_caja(get_post($tres));
$formulario = ob_get_clean();
comprobar(strpos($formulario, 'name="empresa_categoria"') === false && stripos($formulario, 'Categoría') === false, 'el formulario no tiene categoría');
comprobar(strpos($formulario, 'name="empresa_nit"') === false, 'el formulario no tiene NIT');
comprobar(strpos($formulario, 'Destacado en página principal') !== false, 'la casilla de destacado está en el formulario');

wp_set_current_user($visitante->ID);
comprobar(! current_user_can('edit_empresa', $uno) && ! current_user_can('edit_empresas'), 'el visitante no abre una empresa concreta');

if ($fallos > 0) {
	fwrite(STDERR, "{$fallos} comprobaciones fallaron.\n");
	if (class_exists('WP_CLI')) {
		WP_CLI::error("{$fallos} comprobaciones fallaron.");
	}
	exit(1);
}

echo "CRUD del escritorio en orden.\n";
