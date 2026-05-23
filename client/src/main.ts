import { createApp } from 'vue';
import VueKonva from 'vue-konva';
import App from './App.vue';
import { router } from './router';
import './style.css';

createApp(App).use(router).use(VueKonva).mount('#app');
