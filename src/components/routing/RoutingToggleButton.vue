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
    hoverText: {type: String, required: false, default: 'Get directions'},
    toggleGroup: {type: String, required: false, default: undefined}
  },
  data: function () {
    return {
      moduleName: 'wgu-routing',
      state: this.active
    }
  },
  created () {
    window.RoutingToggleButton = this;
    // When member of toggle group: close if any other panel active
    if (this.toggleGroup) {
      WguEventBus.$on(this.toggleGroup, moduleName => {
        this.state = moduleName === this.moduleName;
      });
    }
  },
  methods: {
    toggleUi () {
      this.state = !this.state;
      WguEventBus.$emit('toggle-routing-panel', this.state);

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
