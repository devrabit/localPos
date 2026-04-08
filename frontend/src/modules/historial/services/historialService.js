import api from '../../../services/api'

export function getVentas(params) {
  return api.get('/ordenes', { params })
}

export function getVentaById(id) {
  return api.get(`/ordenes/${id}`)
}
