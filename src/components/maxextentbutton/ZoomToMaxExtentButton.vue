<i18n>
de:
  Reset map: Karte zurücksetzen
</i18n>
<template>
  <v-tooltip bottom>
    <template v-slot:activator="{ on: tooltip }">
      <v-btn icon :dark="dark" @click="onClick" v-on="tooltip">
        <v-icon medium>{{icon}}</v-icon>
        {{ text }}
      </v-btn>
    </template>
    <span>{{ $t('Reset map') }}</span>
  </v-tooltip>
</template>

<script>

import { WguEventBus } from '../../WguEventBus.js';

export default {
  name: 'wgu-zoomtomaxextent-btn',
  props: {
    icon: {type: String, required: false, default: 'zoom_out_map'},
    text: {type: String, required: false, default: ''},
    dark: {type: Boolean, required: false, default: false}
  },
  methods: {
    onClick () {
      WguEventBus.$emit('reset-bounds');
    }
  }
}

</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
</style>
