<template>
<div class="routing-target">
  <v-autocomplete
    :items="localSuggestions"
    :disabled="!localSuggestions"
    v-model="target"
    :label="label"
    solo
    clearable
    @change="changeRouteTarget"
    @click:clear="clearCustomTarget"
  >
  </v-autocomplete>
  <v-alert color="info" outline :value="choosingPoint">
    <v-icon>location_searching</v-icon>
    Click on the map to choose a location.
  </v-alert>
</div>
</template>

<script>
// import { WguEventBus } from '../../WguEventBus.js';
import { transform } from 'ol/proj';
import { flip, feature, point } from './routingUtils';
export default {
  name: 'RoutingTarget',
  props: ['label', 'routeTargets'],
  data: () => ({
    target: undefined,
    localSuggestions: []
  }),
  watch: {
    target () {
      this.$emit('change', this.target);
    },
    routeTargets: {
      handler () {
        const customPoint = {
          text: 'Point on map',
          value: feature({ name: 'Point on map' }, point(null))
        };
        if (this.routeTargets) {
          this.localSuggestions = [customPoint, ...this.routeTargets];
        }
      },
      immediate: true
    }
  },
  computed: {
    choosingPoint () {
      return this.target && this.target.properties.name === 'Point on map' && this.target.geometry.coordinates === null;
    }
  },
  methods: {
    toEpsg4326 (coord) {
      return transform(coord, this.$map.getView().getProjection(), 'EPSG:4326');
    },
    changeRouteTarget () {
      if (this.target && this.target.geometry.coordinates === null) {
        this.$map.getViewport().style.cursor = 'crosshair';
        this.$map.once('click', e => {
          // just checking we're still in the same state
          if (this.target.geometry.coordinates === null) {
            const coords = this.toEpsg4326(e.coordinate);
            console.log(coords);
            this.$map.getViewport().style.cursor = '';
            this.target.geometry.coordinates = coords;
          }
        });
      }
    },
    clearCustomTarget () {
      this.target.geometry.coordinates = null;
    }
  }
}
</script>

<style scoped>

</style>