import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import VueApexCharts from 'vue3-apexcharts';

import App from './App.vue';
import router from './app/router';
import './shared/styles/theme.css';
import 'primeicons/primeicons.css';
import 'primevue/resources/themes/lara-light-blue/theme.css';
import 'primevue/resources/primevue.min.css';

const app = createApp(App);

app.use(router);
app.use(PrimeVue, { ripple: true });
app.component('ApexChart', VueApexCharts);

app.mount('#app');