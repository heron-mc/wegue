<i18n>
de:
  Get directions: Route berechnen
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
import { WguEventBus } from '../../WguEventBus'

export default {
  name: 'wgu-routing-btn',
  props: {
    active: {type: Boolean, required: false, default: false},
    dark: {type: Boolean, required: false, default: false},
    icon: {type: String, required: false, default: 'navigation'},
    hoverText: {type: String, required: false, default: 'Get directions'}
  },
  data: function () {
    return {
      state: this.active
    }
  },
  created () {
    window.RoutingToggleButton = this;
  },
  methods: {
    toggleUi () {
      this.state = !this.state;
      WguEventBus.$emit('toggle-routing-panel', this.state);
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
</style>
