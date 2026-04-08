import { describe, it, expect } from 'vitest'
import api from './api'

describe('api', () => {
  it('usa baseURL /api', () => {
    expect(api.defaults.baseURL).toBe('/api')
  })
})
