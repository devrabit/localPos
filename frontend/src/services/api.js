import axios from 'axios'

/** Woo puede tardar mucho en listar + variaciones (escaneo); 10s cortaba antes de la respuesta. */
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 120000,
})

export default api
