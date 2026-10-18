<?php
/**
 * Tipo de entrada Empresa. No tiene URL pública en esta fase.
 */

if (! defined('ABSPATH')) {
	exit;
}

/**
 * @return void
 */
function directorio_asogravas_registrar_tipo() {
	$buscando = is_admin() && isset($_GET['s']) && trim(wp_unslash($_GET['s'])) !== '';

	register_post_type(
		'empresa',
		array(
			'labels'              => array(
				'name'               => 'Empresas',
				'singular_name'      => 'Empresa',
				'menu_name'          => 'Empresas',
				'name_admin_bar'     => 'Empresa',
				'add_new'            => 'Agregar empresa',
				'add_new_item'       => 'Agregar empresa',
				'edit_item'          => 'Editar empresa',
				'new_item'           => 'Nueva empresa',
				'view_item'          => 'Ver empresa',
				'search_items'       => 'Buscar empresas',
				'not_found'          => $buscando ? 'Ninguna empresa coincide.' : 'Aún no hay empresas.',
				'not_found_in_trash' => 'No hay empresas en la papelera.',
				'all_items'          => 'Empresas',
				'items_list'         => 'Lista de empresas',
			),
			'public'              => false,
			'show_ui'             => true,
			'show_in_menu'        => true,
			'show_in_admin_bar'   => false,
			'show_in_nav_menus'   => false,
			'show_in_rest'        => false,
			'exclude_from_search' => true,
			'publicly_queryable'  => false,
			'has_archive'         => false,
			'rewrite'             => false,
			'query_var'           => false,
			'capability_type'     => array('empresa', 'empresas'),
			'map_meta_cap'        => true,
			'capabilities'        => array(
				'create_posts' => 'create_empresas',
			),
			'supports'            => array('title'),
			'delete_with_user'    => false,
			'menu_icon'           => 'dashicons-building',
			'menu_position'       => 26,
		)
	);
}

/**
 * Esta fase no abre el editor de bloques ni una ficha pública.
 *
 * @param bool   $usar
 * @param string $tipo
 * @return bool
 */
function directorio_asogravas_sin_editor_bloques($usar, $tipo) {
	if ($tipo === 'empresa') {
		return false;
	}

	return $usar;
}

/**
 * @param WP_Query $consulta
 * @return void
 */
function directorio_asogravas_orden_por_modificacion($consulta) {
	if (! is_admin() || ! $consulta->is_main_query()) {
		return;
	}

	if ($consulta->get('post_type') !== 'empresa') {
		return;
	}

	if (isset($_GET['orderby']) && $_GET['orderby'] !== '') {
		return;
	}

	$consulta->set('orderby', 'modified');
	$consulta->set('order', 'DESC');
}
