import { createRouter, createWebHistory } from 'vue-router'

const PosView = () => import('../views/PosView.vue')
const HistorialView = () => import('../modules/historial/views/HistorialView.vue')
const DetalleVentaView = () => import('../modules/historial/views/DetalleVentaView.vue')
const BarcodeView = () => import('../views/BarcodeView.vue')
const HistorialSalidasView = () => import('../modules/salidas/views/HistorialSalidasView.vue')
const SalidasView = () => import('../modules/salidas/views/SalidasView.vue')
const AgotadosView = () => import('../modules/agotados/views/AgotadosView.vue')
const AnotacionesListView = () => import('../modules/anotaciones/views/AnotacionesListView.vue')
const AnotacionNuevaView = () => import('../modules/anotaciones/views/AnotacionNuevaView.vue')
const AnotacionDetalleView = () => import('../modules/anotaciones/views/AnotacionDetalleView.vue')

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
    {
      path: '/salidas',
      name: 'salidas',
      component: HistorialSalidasView,
    },
    {
      path: '/salidas/nueva',
      name: 'salidas-nueva',
      component: SalidasView,
    },
    {
      path: '/agotados',
      name: 'agotados',
      component: AgotadosView,
    },
    {
      path: '/anotaciones',
      name: 'anotaciones',
      component: AnotacionesListView,
    },
    {
      path: '/anotaciones/nueva',
      name: 'anotaciones-nueva',
      component: AnotacionNuevaView,
    },
    {
      path: '/anotaciones/:id',
      name: 'anotaciones-detalle',
      component: AnotacionDetalleView,
    },
  ],
})

export default router
