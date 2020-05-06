<i18n>
de:
  Layers: Kartenebenen
</i18n>
<template>
  <v-tooltip bottom>
    <template #activator="{ on: tooltip }">
      <v-btn icon :dark="dark"  v-on="{ ...tooltip }" @click="toggleUi">
        <v-icon medium>{{ icon }}</v-icon>
      </v-btn>
    </template>
    <span>{{ $t(hoverText) }}</span>
  </v-tooltip>
</template>

<script>

import Vue from 'vue';
import LayerListWin from './LayerListWin'
import { WguEventBus } from '../../../src/WguEventBus'

export default {
  name: 'wgu-layerlist-btn',
  components: {
    'wgu-layerlist-win': LayerListWin
  },
  props: {
    icon: {type: String, required: false, default: 'layers'},
    text: {type: String, required: false, default: ''},
    dark: {type: Boolean, required: false, default: false},
    hoverText: {type: String, required: false, default: 'Layers'}
  },
  data: function () {
    return {
      moduleName: 'wgu-layerlist'
    }
  },
  created () {
    var me = this;
    // TODO move to a father class
    WguEventBus.$on('app-mounted', () => {
      me.win = Vue.prototype.cmpLookup[me.moduleName + '-win'];
    });
  },
  methods: {
    toggleUi () {
      // TODO move to a father class
      this.win.show = !this.win.show;
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
</style>
