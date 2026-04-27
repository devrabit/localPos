import api from '../../../services/api'

export function createSalida(payload) {
  return api.post('/salidas', payload)
}

export function getSalidas(params = {}) {
  return api.get('/salidas', { params })
}
