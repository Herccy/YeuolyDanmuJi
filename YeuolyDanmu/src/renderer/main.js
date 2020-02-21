import Vue from 'vue'
import axios from 'axios'

axios.defaults.withCredentials = true;

import App from './App'
import router from './router'
import store from './store'

//安装颜色选择器
import vcolorpicker from 'vcolorpicker';
Vue.use(vcolorpicker);

//多窗口初始化
import Win from 'electron-vue-windows';
Win.init(router,{
  freeWindowNum: 2,
  port : 9080
});
Vue.prototype.$Win = Win;

import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';

Vue.use(ElementUI);

if (!process.env.IS_WEB) Vue.use(require('vue-electron'))
Vue.http = Vue.prototype.$http = axios
Vue.config.productionTip = false

//初始化设置
import('../init');

/* eslint-disable no-new */
new Vue({
  components: { App },
  router,
  store,
  template: '<App/>'
}).$mount('#app')
