import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/views/Dashboard.vue'
import MassDesign from '@/views/MassDesign.vue'
import FloorDesign from '@/views/FloorDesign.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: Dashboard
    },
    {
      path: '/project/:id/mass',
      name: 'mass-design',
      component: MassDesign
    },
    {
      path: '/project/:id/floor',
      name: 'floor-design',
      component: FloorDesign
    }
  ]
})

export default router
