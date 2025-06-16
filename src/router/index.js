import { createRouter, createWebHistory } from 'vue-router'
import BuildView from '../views/BuildView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'build',
      component: BuildView,
    },
    // {
    //   path: '/output',
    //   name: 'output',
    //   // route level code-splitting
    //   // this generates a separate chunk (About.[hash].js) for this route
    //   // which is lazy-loaded when the route is visited.
    //   component: () => import('../views/GuidedView.vue'),
    // },
  ],
})

export default router
