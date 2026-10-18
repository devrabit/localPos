(function ($) {
	'use strict';

	function idsGaleria() {
		var valor = $('#empresa_galeria').val() || '';
		if (!valor) {
			return [];
		}
		return valor.split(',').filter(function (id) {
			return id !== '';
		});
	}

	function guardarIds(ids) {
		$('#empresa_galeria').val(ids.join(','));
	}

	function agregarImagen(adjunto) {
		var ids = idsGaleria();
		var id = String(adjunto.id);
		if (ids.indexOf(id) !== -1) {
			return;
		}
		ids.push(id);
		guardarIds(ids);

		var miniatura = adjunto.sizes && adjunto.sizes.thumbnail ? adjunto.sizes.thumbnail.url : adjunto.url;
		var $item = $('<li>', { 'data-id': id });
		$item.append($('<img>', { src: miniatura, alt: '' }));
		$item.append($('<button>', {
			type: 'button',
			class: 'button-link empresa-galeria-quitar',
			text: 'Quitar'
		}));
		$('#empresa-galeria-lista').append($item);
	}

	$(function () {
		$('#post_status option').filter(function () {
			return this.value !== 'draft' && this.value !== 'publish';
		}).remove();

		$('#empresa-volver-borrador').on('click', function () {
			$('#post_status').val('draft');
			$('#hidden_post_status').val('draft');
		});

		var marcoGaleria = null;
		$('#empresa-galeria-agregar').on('click', function (evento) {
			evento.preventDefault();
			if (!marcoGaleria) {
				marcoGaleria = wp.media({
					title: 'Agregar imágenes a la galería',
					button: { text: 'Agregar a la galería' },
					library: { type: 'image' },
					multiple: true
				});
				marcoGaleria.on('select', function () {
					marcoGaleria.state().get('selection').each(function (adjunto) {
						agregarImagen(adjunto.toJSON());
					});
				});
			}
			marcoGaleria.open();
		});

		$('#empresa-galeria-lista').on('click', '.empresa-galeria-quitar', function (evento) {
			evento.preventDefault();
			var $item = $(this).closest('li');
			var id = String($item.data('id'));
			$item.remove();
			guardarIds(idsGaleria().filter(function (actual) {
				return actual !== id;
			}));
		});

		$('.empresa-archivo').each(function () {
			var $caja = $(this);
			var tipo = $caja.data('tipo');
			var $id = $caja.find('input[type="hidden"]');
			var $vista = $caja.find('.empresa-archivo-vista');
			var $quitar = $caja.find('.empresa-archivo-quitar');
			var marco = null;
			var esImagen = tipo === 'imagen';

			$caja.find('.empresa-archivo-elegir').on('click', function (evento) {
				evento.preventDefault();
				if (!marco) {
					marco = wp.media({
						title: esImagen ? 'Seleccionar imagen' : 'Seleccionar PDF',
						button: { text: esImagen ? 'Usar esta imagen' : 'Usar este PDF' },
						library: { type: esImagen ? 'image' : 'application/pdf' },
						multiple: false
					});
					marco.on('select', function () {
						var adjunto = marco.state().get('selection').first().toJSON();
						$id.val(adjunto.id);
						$vista.empty();
						if (esImagen) {
							var miniatura = adjunto.sizes && adjunto.sizes.thumbnail ? adjunto.sizes.thumbnail.url : adjunto.url;
							$vista.append($('<img>', { src: miniatura, alt: '' }));
						} else {
							$vista.append($('<span>', {
								class: 'empresa-pdf-nombre',
								text: adjunto.filename || adjunto.title || 'PDF'
							}));
						}
						$quitar.prop('hidden', false);
					});
				}
				marco.open();
			});

			$quitar.on('click', function (evento) {
				evento.preventDefault();
				$id.val('');
				$vista.empty();
				$quitar.prop('hidden', true);
			});
		});
	});
}(jQuery));
