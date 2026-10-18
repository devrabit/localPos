<?php
/**
 * Listado del administrador: nombre, ciudad, departamento, destacado y estado.
 */

if (! defined('ABSPATH')) {
	exit;
}

/**
 * @param array<string, string> $columnas
 * @return array<string, string>
 */
function directorio_asogravas_columnas($columnas) {
	$casilla = isset($columnas['cb']) ? $columnas['cb'] : '<input type="checkbox" />';

	return array(
		'cb'                    => $casilla,
		'title'                 => 'Nombre',
		'empresa_ciudad'        => 'Ciudad',
		'empresa_departamento'  => 'Departamento',
		'empresa_destacado'     => 'Destacado',
		'empresa_estado'        => 'Estado',
	);
}

/**
 * @param string $columna
 * @param int    $post_id
 * @return void
 */
function directorio_asogravas_columna($columna, $post_id) {
	if ($columna === 'empresa_ciudad') {
		echo esc_html((string) get_post_meta($post_id, '_empresa_ciudad', true));
		return;
	}

	if ($columna === 'empresa_departamento') {
		echo esc_html((string) get_post_meta($post_id, '_empresa_departamento', true));
		return;
	}

	if ($columna === 'empresa_destacado') {
		$marcado = get_post_meta($post_id, '_empresa_destacado', true) === '1';
		echo esc_html($marcado ? 'sí' : 'no');
		return;
	}

	if ($columna === 'empresa_estado') {
		$estado = get_post_status($post_id);
		echo esc_html(directorio_asogravas_etiqueta_estado($estado));
	}
}

/**
 * @param string $estado
 * @return string
 */
function directorio_asogravas_etiqueta_estado($estado) {
	if ($estado === 'publish') {
		return 'Publicado';
	}

	if ($estado === 'trash') {
		return 'Papelera';
	}

	return 'Borrador';
}

/**
 * @param array<string, string> $vistas
 * @return array<string, string>
 */
function directorio_asogravas_vistas($vistas) {
	$nombres = array(
		'all'     => 'Todas',
		'publish' => 'Publicadas',
		'draft'   => 'Borradores',
		'trash'   => 'Papelera',
	);
	$base    = admin_url('edit.php?post_type=empresa');
	$enlaces = array(
		'all'     => $base,
		'publish' => add_query_arg('post_status', 'publish', $base),
		'draft'   => add_query_arg('post_status', 'draft', $base),
	);

	foreach ($enlaces as $clave => $url) {
		if (! isset($vistas[ $clave ])) {
			$vistas[ $clave ] = '<a href="' . esc_url($url) . '">' . $nombres[ $clave ] . ' <span class="count">(0)</span></a>';
		}
	}

	foreach ($nombres as $clave => $nombre) {
		if (! isset($vistas[ $clave ])) {
			continue;
		}

		$vistas[ $clave ] = preg_replace('/>[^<]+</', '>' . $nombre . ' <', $vistas[ $clave ], 1);
	}

	unset($vistas['mine'], $vistas['sticky'], $vistas['pending'], $vistas['private'], $vistas['future']);

	$ordenadas = array();
	foreach (array('all', 'publish', 'draft', 'trash') as $clave) {
		if (isset($vistas[ $clave ])) {
			$ordenadas[ $clave ] = $vistas[ $clave ];
		}
	}

	return $ordenadas;
}

/**
 * @param array<string, string> $acciones
 * @return array<string, string>
 */
function directorio_asogravas_acciones_masivas($acciones) {
	unset($acciones['edit']);

	if (isset($acciones['trash'])) {
		$acciones['trash'] = 'Enviar a la papelera';
	}

	if (isset($acciones['untrash'])) {
		$acciones['untrash'] = 'Restaurar';
	}

	if (isset($acciones['delete'])) {
		$acciones['delete'] = 'Eliminar permanentemente';
	}

	return $acciones;
}

/**
 * @param array<string, string> $acciones
 * @param WP_Post               $post
 * @return array<string, string>
 */
function directorio_asogravas_acciones_fila($acciones, $post) {
	if ($post->post_type !== 'empresa') {
		return $acciones;
	}

	unset($acciones['inline hide-if-no-js'], $acciones['view'], $acciones['preview']);

	if (isset($acciones['edit'])) {
		$acciones['edit'] = '<a href="' . esc_url(get_edit_post_link($post->ID, 'raw')) . '">Editar</a>';
	}

	if (isset($acciones['trash'])) {
		$acciones['trash'] = '<a href="' . esc_url(get_delete_post_link($post->ID)) . '" class="submitdelete">Enviar a la papelera</a>';
	}

	if (isset($acciones['untrash'])) {
		$url = wp_nonce_url(admin_url('post.php?post=' . $post->ID . '&action=untrash'), 'untrash-post_' . $post->ID);
		$acciones['untrash'] = '<a href="' . esc_url($url) . '">Restaurar</a>';
	}

	if (isset($acciones['delete'])) {
		$acciones['delete'] = '<a href="' . esc_url(get_delete_post_link($post->ID, '', true)) . '" class="submitdelete">Eliminar permanentemente</a>';
	}

	return $acciones;
}

/**
 * El estado ya tiene su columna. No se repite junto al nombre.
 *
 * @param array<string, string> $estados
 * @param WP_Post               $post
 * @return array<string, string>
 */
function directorio_asogravas_sin_estado_en_titulo($estados, $post) {
	if ($post->post_type !== 'empresa') {
		return $estados;
	}

	unset($estados['draft'], $estados['pending'], $estados['private'], $estados['protected']);

	return $estados;
}

/**
 * La búsqueda del listado mira el nombre, que es el título de la entrada.
 *
 * @param string   $busqueda
 * @param WP_Query $consulta
 * @return string
 */
function directorio_asogravas_buscar_por_nombre($busqueda, $consulta) {
	global $wpdb;

	if (! is_admin() || ! $consulta->is_main_query() || $consulta->get('post_type') !== 'empresa') {
		return $busqueda;
	}

	$termino = $consulta->get('s');
	if (! is_string($termino) || $termino === '') {
		return $busqueda;
	}

	$como = '%' . $wpdb->esc_like($termino) . '%';

	return $wpdb->prepare(" AND ({$wpdb->posts}.post_title LIKE %s) ", $como);
}

/**
 * @param array<string, array<int, string>> $mensajes
 * @return array<string, array<int, string>>
 */
function directorio_asogravas_mensajes_guardado($mensajes) {
	$mensajes['empresa'] = array(
		0  => '',
		1  => 'Empresa actualizada.',
		2  => 'Empresa actualizada.',
		3  => 'Empresa actualizada.',
		4  => 'Empresa actualizada.',
		5  => false,
		6  => 'Empresa publicada.',
		7  => 'Empresa guardada.',
		8  => 'Empresa guardada.',
		9  => 'Empresa guardada.',
		10 => 'Borrador de la empresa guardado.',
	);

	return $mensajes;
}

/**
 * No consulta la entrada: gettext no puede volver a cargar el post.
 *
 * @return bool
 */
function directorio_asogravas_es_pantalla_empresa() {
	if (! is_admin()) {
		return false;
	}

	if (! empty($GLOBALS['directorio_asogravas_pantalla'])) {
		return true;
	}

	if (isset($_REQUEST['post_type']) && $_REQUEST['post_type'] === 'empresa') {
		return true;
	}

	if (function_exists('get_current_screen')) {
		$pantalla = get_current_screen();
		if ($pantalla && isset($pantalla->post_type) && $pantalla->post_type === 'empresa') {
			return true;
		}
	}

	return false;
}

/**
 * @param WP_Screen $pantalla
 * @return void
 */
function directorio_asogravas_marcar_pantalla($pantalla) {
	if ($pantalla && isset($pantalla->post_type) && $pantalla->post_type === 'empresa') {
		$GLOBALS['directorio_asogravas_pantalla'] = true;
	}
}

/**
 * @param string $clases
 * @return string
 */
function directorio_asogravas_clase_body($clases) {
	if (directorio_asogravas_es_pantalla_empresa()) {
		return $clases . ' directorio-asogravas';
	}

	return $clases;
}

/**
 * Los textos de esta pantalla quedan en español aunque el sitio esté en otro idioma.
 *
 * @param string $traduccion
 * @param string $texto
 * @param string $dominio
 * @return string
 */
function directorio_asogravas_gettext($traduccion, $texto, $dominio) {
	if ($dominio !== 'default' || ! directorio_asogravas_es_pantalla_empresa()) {
		return $traduccion;
	}

	$mapa = array(
		'Publish'                                      => 'Publicar',
		'Update'                                       => 'Actualizar',
		'Save Draft'                                   => 'Guardar borrador',
		'Save as Pending'                              => 'Guardar borrador',
		'Move to Trash'                                => 'Mover a la papelera',
		'Draft'                                        => 'Borrador',
		'Published'                                    => 'Publicado',
		'Status:'                                      => 'Estado:',
		'Edit'                                         => 'Editar',
		'Edit status'                                  => 'Editar estado',
		'Preview'                                      => 'Vista previa',
		'Preview Changes'                              => 'Vista previa',
		'Sorry, you are not allowed to access this page.' => 'No tienes permiso para ver las empresas.',
		'Sorry, you are not allowed to edit posts in this post type.' => 'No tienes permiso para ver las empresas.',
		'Sorry, you are not allowed to edit this post.' => 'No tienes permiso para ver las empresas.',
		'Sorry, you are not allowed to edit this item.' => 'No tienes permiso para ver las empresas.',
		'Sorry, you are not allowed to create posts as this user.' => 'No tienes permiso para ver las empresas.',
		'Sorry, you are not allowed to edit posts as this user.' => 'No tienes permiso para ver las empresas.',
	);

	if (isset($mapa[ $texto ])) {
		return $mapa[ $texto ];
	}

	return $traduccion;
}
