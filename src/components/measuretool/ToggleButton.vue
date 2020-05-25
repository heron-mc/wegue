<i18n>
de:
  Measure areas and distances: Flächen und Entfernungen messen
</i18n>
<template>
  <v-tooltip bottom>
    <template v-slot:activator="{ on: tooltip }">
      <v-btn icon :dark="dark" @click="toggleUi" v-on="tooltip">
        <v-icon medium>{{icon}}</v-icon>
        {{ text }}
      </v-btn>
    </template>
    <span>{{ $t('Measure areas and distances') }}</span>
  </v-tooltip>
</template>


<script>

import Vue from 'vue';
import MeasureWin from './MeasureWin'
import { WguEventBus } from '../../WguEventBus'

export default {
  name: 'wgu-measuretool-btn',
  components: {
    'wgu-measuretool-win': MeasureWin
  },
  props: {
    icon: {type: String, required: false, default: 'photo_size_select_small'},
    text: {type: String, required: false},
    dark: {type: Boolean, required: false, default: false}
  },
  data: function () {
    return {
      moduleName: 'wgu-measuretool'
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
