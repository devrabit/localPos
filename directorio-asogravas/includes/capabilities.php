<?php
/**
 * Solo el rol Administrador gestiona empresas.
 */

if (! defined('ABSPATH')) {
	exit;
}

/**
 * @return void
 */
function directorio_asogravas_conceder_capacidades() {
	$rol  = get_role('administrator');
	$tipo = get_post_type_object('empresa');
	if (! $rol || ! $tipo || empty($tipo->cap)) {
		return;
	}

	foreach ((array) $tipo->cap as $capacidad) {
		if ($capacidad && $capacidad !== 'read') {
			$rol->add_cap($capacidad);
		}
	}
}

/**
 * Si el plugin quedó activo sin pasar por la activación, el administrador igual recibe el permiso.
 *
 * @return void
 */
function directorio_asogravas_asegurar_capacidades() {
	$rol = get_role('administrator');
	if (! $rol || $rol->has_cap('edit_empresas')) {
		return;
	}

	directorio_asogravas_conceder_capacidades();
}
