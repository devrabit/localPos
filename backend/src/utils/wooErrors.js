function formatWooError(error) {
  if (!error?.response) {
    return error?.message || 'Error de conexion con WooCommerce'
  }
  const { data, status } = error.response
  if (typeof data === 'string' && data.trim()) {
    return data
  }
  if (data?.message) {
    return typeof data.message === 'string' ? data.message : JSON.stringify(data.message)
  }
  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors
      .map((e) => (typeof e === 'string' ? e : e?.message || JSON.stringify(e)))
      .join('; ')
  }
  if (data?.code && data?.message) {
    return `${data.code}: ${data.message}`
  }
  return `WooCommerce respondio con estado ${status}`
}

module.exports = { formatWooError }
