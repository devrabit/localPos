import api from '../../../services/api'

export async function listPedidos({ page = 1, limit = 20 } = {}) {
  const { data } = await api.get('/pedidos', { params: { page, limit } })
  return data
}

export async function getPedido(id) {
  const { data } = await api.get(`/pedidos/${id}`)
  return data
}

export async function createPedido(payload) {
  const { data } = await api.post('/pedidos', payload)
  return data
}

export async function updatePedidoEstado(id, estado) {
  const { data } = await api.patch(`/pedidos/${id}`, { estado })
  return data
}
