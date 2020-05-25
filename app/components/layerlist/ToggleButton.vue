<i18n>
de:
  Layers: Kartenebenen
</i18n>
<template>
  <v-tooltip bottom>
    <template v-slot:activator="{ on: tooltip }">
      <v-btn icon :dark="dark" @click="toggleUi" v-on="tooltip">
        <v-icon medium>{{icon}}</v-icon>
        {{text}}
      </v-btn>
    </template>
    <span>{{ $t('Layers') }}</span>
  </v-tooltip>
</template>

<script>

import Vue from 'vue';
import LayerListPanel from './LayerListPanel'
import { WguEventBus } from '../../../src/WguEventBus'

export default {
  name: 'wgu-layerlist-btn',
  components: {
    'wgu-layerlist-panel': LayerListPanel
  },
  props: {
    icon: {type: String, required: false, default: 'layers'},
    text: {type: String, required: false, default: ''},
    dark: {type: Boolean, required: false, default: false},
    active: {type: Boolean, required: false, default: false},
    hoverText: {type: String, required: false, default: 'Layers'},
    toggleGroup: {type: String, required: false, default: undefined}
  },
  data: function () {
    return {
      moduleName: 'wgu-layerlist',
      state: this.active
    }
  },
  created () {
    // TODO move to a father class
    WguEventBus.$on('app-mounted', () => {
      this.panel = Vue.prototype.cmpLookup[this.moduleName + '-panel'];
    });
    // When member of toggle group: close if any other panel active
    if (this.toggleGroup) {
      WguEventBus.$on(this.toggleGroup, ({ moduleName, state }) => {
        // console.log(moduleName, state);
        this.state = moduleName === this.moduleName && state;
      });
    }
  },
  methods: {
    toggleUi () {
      this.state = !this.state;
      WguEventBus.$emit('toggle-layerlist-panel', this.state);

      // If part of toggleGroup, let other know we become active/visible
      if (this.toggleGroup) {
        WguEventBus.$emit(this.toggleGroup, {'moduleName': this.moduleName, 'state': this.state});
      }
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
</style>

