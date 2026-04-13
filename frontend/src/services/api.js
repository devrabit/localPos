import axios from 'axios'

/** Woo puede tardar mucho en listar + variaciones (escaneo); 10s cortaba antes de la respuesta. */
const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
})

export default api
