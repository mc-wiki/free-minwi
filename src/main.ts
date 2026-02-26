import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

const targetElement = document.createElement('div')
targetElement.id = 'minwi-app'
document.body.appendChild(targetElement)
createApp(App).mount(targetElement)
