<template>

  <v-btn icon :dark="dark" @click="toggleUi">
    <v-icon medium>explore</v-icon>
  </v-btn>

</template>

<script>
import { WguEventBus } from '../../WguEventBus'

export default {
  name: 'wgu-routing-btn',
  props: {
    dark: {type: Boolean, required: false, default: false}
  },
  data: function () {
    return {
      state: false
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
