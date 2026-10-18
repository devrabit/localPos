<?php
/**
 * Plugin Name: Directorio Asogravas
 * Description: CRUD de empresas del directorio de Asogravas en el escritorio. Esta fase no publica grilla, ficha ni formulario de cotización.
 * Version: 1.0.0
 * Author: Asogravas
 * Text Domain: directorio-asogravas
 * Requires at least: 6.0
 * Requires PHP: 7.4
 *
 * @package Directorio_Asogravas
 */

if (! defined('ABSPATH')) {
	exit;
}

define('DIRECTORIO_ASOGRAVAS_VERSION', '1.0.0');
define('DIRECTORIO_ASOGRAVAS_FILE', __FILE__);

require_once __DIR__ . '/includes/validator.php';
require_once __DIR__ . '/includes/capabilities.php';
require_once __DIR__ . '/includes/post-type.php';
require_once __DIR__ . '/includes/admin-list.php';
require_once __DIR__ . '/includes/guardado.php';
require_once __DIR__ . '/includes/admin-form.php';

/**
 * @return void
 */
function directorio_asogravas_activar() {
	directorio_asogravas_registrar_tipo();
	directorio_asogravas_conceder_capacidades();
	flush_rewrite_rules();
}

/**
 * @return void
 */
function directorio_asogravas_desactivar() {
	flush_rewrite_rules();
}

register_activation_hook(__FILE__, 'directorio_asogravas_activar');
register_deactivation_hook(__FILE__, 'directorio_asogravas_desactivar');

add_action('init', 'directorio_asogravas_registrar_tipo', 0);
add_action('init', 'directorio_asogravas_asegurar_capacidades', 1);
add_filter('use_block_editor_for_post_type', 'directorio_asogravas_sin_editor_bloques', 10, 2);
add_action('pre_get_posts', 'directorio_asogravas_orden_por_modificacion');

add_filter('manage_empresa_posts_columns', 'directorio_asogravas_columnas');
add_action('manage_empresa_posts_custom_column', 'directorio_asogravas_columna', 10, 2);
add_filter('views_edit-empresa', 'directorio_asogravas_vistas');
add_filter('bulk_actions-edit-empresa', 'directorio_asogravas_acciones_masivas');
add_filter('post_row_actions', 'directorio_asogravas_acciones_fila', 10, 2);
add_filter('display_post_states', 'directorio_asogravas_sin_estado_en_titulo', 10, 2);
add_filter('posts_search', 'directorio_asogravas_buscar_por_nombre', 10, 2);
add_filter('post_updated_messages', 'directorio_asogravas_mensajes_guardado');
add_action('current_screen', 'directorio_asogravas_marcar_pantalla');
add_filter('admin_body_class', 'directorio_asogravas_clase_body');
add_filter('gettext', 'directorio_asogravas_gettext', 10, 3);

add_action('admin_enqueue_scripts', 'directorio_asogravas_recursos');
add_action('edit_form_top', 'directorio_asogravas_etiqueta_nombre');
add_action('edit_form_after_title', 'directorio_asogravas_despues_del_titulo');
add_filter('enter_title_here', 'directorio_asogravas_placeholder_titulo', 10, 2);
add_action('add_meta_boxes_empresa', 'directorio_asogravas_caja');
add_action('edit_form_advanced', 'directorio_asogravas_aviso_cotizacion');
add_action('post_submitbox_start', 'directorio_asogravas_boton_borrador');
add_action('admin_notices', 'directorio_asogravas_aviso_error');

add_filter('wp_insert_post_data', 'directorio_asogravas_filtrar_datos', 99, 2);
add_action('save_post_empresa', 'directorio_asogravas_guardar_meta', 10, 2);
add_filter('redirect_post_location', 'directorio_asogravas_redirect', 10, 2);
