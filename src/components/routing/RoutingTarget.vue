<template>
<div class="routing-target">
  <v-autocomplete
    :items="[...localSuggestions, ...geocodeSuggestions]"
    :disabled="!localSuggestions"
    v-model="target"
    :label="label"
    solo
    clearable
    @change="changeRouteTarget"
    @click:clear="clearCustomTarget"
    :search-input.sync="searchQuery"
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
import routingConfig from './routingConfig';
import { transform } from 'ol/proj';
import axios from 'axios';
import { flip, feature, point } from './routingUtils';
export default {
  name: 'RoutingTarget',
  props: ['label', 'routeTargets'],
  data: () => ({
    target: undefined,
    localSuggestions: [],
    geocodeSuggestions: [],
    searchQuery: undefined
  }),
  watch: {
    target () {
      console.log({ target: this.target });
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
    },
    async searchQuery () {
      this.geocodeSuggestions = [];
      if (!this.searchQuery || !this.searchQuery.trim()) {
        return;
      }
      const { data: result } = await axios.get('https://autosuggest.search.hereapi.com/v1/autosuggest', {
        params: {
          at: flip(this.toEpsg4326(this.$map.getView().getCenter())).join(','),
          limit: 5,
          q: this.searchQuery,
          apiKey: routingConfig.hereApiKey
        }
      });
      const results = result.items.map(item => ({
        text: item.title,
        value: feature({}, point([item.position.lng, item.position.lat]))
      }));
      this.geocodeSuggestions = results;
      console.log(results);
      // console.log(this.searchQuery);
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