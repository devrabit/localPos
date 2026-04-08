import { createRouter, createWebHistory } from 'vue-router'

const PosView = () => import('../views/PosView.vue')
const HistorialView = () => import('../modules/historial/views/HistorialView.vue')
const DetalleVentaView = () => import('../modules/historial/views/DetalleVentaView.vue')
const BarcodeView = () => import('../views/BarcodeView.vue')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'pos',
      component: PosView,
    },
    {
      path: '/historial',
      name: 'historial',
      component: HistorialView,
    },
    {
      path: '/historial/:id',
      name: 'historial-detalle',
      component: DetalleVentaView,
    },
    {
      path: '/codigos-barras',
      name: 'codigos-barras',
      component: BarcodeView,
    },
  ],
})

export default router
