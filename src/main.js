// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue';
import Vuetify from 'vuetify';
import WguApp from '../app/WguApp';
import UrlUtil from './util/Url';
import 'vuetify/dist/vuetify.min.css';
import VueI18n from 'vue-i18n';

Vue.use(Vuetify);
Vue.use(VueI18n);

require('../node_modules/ol/ol.css');

require('./assets/css/wegue.css');

// try to load an optional app specific CSS file (set project-specific styles)
try {
  require('../app/css/app.css');
} catch (e) {}

Vue.config.productionTip = false;

// Detect isEmbedded state by attribute embedded and
// make accessible for all components
// recommended by https://vuejs.org/v2/cookbook/adding-instance-properties.html
const appEl = document.querySelector('#app');
Vue.prototype.$isEmbedded = appEl.hasAttribute('embedded');

// Detect an URL parameter for a custom app context
const appCtx = UrlUtil.getQueryParam('appCtx');
let appCtxFile = '';
if (appCtx) {
  // simple aproach to avoid path traversal
  appCtxFile = '-' + appCtx.replace(/(\.\.[/])+/g, '');
}
const lang = (navigator.languages || [])[0] || navigator.userLanguage || navigator.language || navigator.browserLanguage || 'en';
const locale = lang.match(/^de/i) ? 'de' : 'en';

const createApp = function (appConfig) {
  // make app config accessible for all components
  Vue.prototype.$appConfig = appConfig;
  /* eslint-disable no-new */
  new Vue({
    el: '#app',
    template: '<wgu-app/>',
    components: { WguApp },
    i18n: new VueI18n({ locale })
  });
};

fetch('app/static/app-conf' + appCtxFile + '.json')
  .then(function (response) {
    return response.json().then(function (appConfig) {
      // console.log('app', appConfig);
      createApp(appConfig);
    })
  }).catch(function () {
    fetch('static/app-conf' + appCtxFile + '.json').then(function (response) {
      return response.json().then(function (appConfig) {
        // console.log('static', appConfig);
        createApp(appConfig);
      })
    })
  });
