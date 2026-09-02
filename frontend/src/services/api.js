import axios from 'axios'

/** Margen para la carga inicial del catalogo completo; el escaneo usa su propio timeout corto. */
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').trim() || '/api'

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 60000,
})

/** El escaneo se resuelve por lookup de SKU: si tarda mas, el cajero necesita el aviso ya. */
export const SCAN_TIMEOUT_MS = 15000

export default api
