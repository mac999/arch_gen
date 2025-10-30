import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// 앱 시작 시 스토어 로드
import { useProjectStore } from './stores/project'
const projectStore = useProjectStore()
projectStore.loadFromStorage()

app.mount('#app')
