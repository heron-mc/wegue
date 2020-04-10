<template>
<div class="routing-target">
  <v-autocomplete
    :items="[customPoint, ...localSuggestions, ...geocodeSuggestions]"
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
import routingConfig from './routingConfig';
import { transform } from 'ol/proj';
import axios from 'axios';
import { flip, feature, point } from './routingUtils';
export default {
  name: 'DestinationSelector',
  props: ['label', 'localSuggestions'],
  data: () => ({
    target: undefined,
    geocodeSuggestions: [],
    searchQuery: undefined,
    customPoint: {
      text: 'Point on map',
      value: feature({ name: 'Point on map', _customPoint: true }, point(null))
    }
  }),
  watch: {
    target () {
      this.$emit('change', this.target);
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
        value: feature({ source: 'geocode' }, point([item.position.lng, item.position.lat]))
      }));
      this.geocodeSuggestions = results;
    }
  },
  computed: {
    choosingPoint () {
      return this.target && this.target.properties._customPoint && this.target.geometry.coordinates === null;
    }
  },
  methods: {
    toEpsg4326 (coord) {
      return transform(coord, this.$map.getView().getProjection(), 'EPSG:4326');
    },
    changeRouteTarget () {
      if (this.target && this.target.properties._customPoint) {
        this.$map.getViewport().style.cursor = 'crosshair';
        this.$map.once('click', e => {
          // just checking we're still in the same state
          if (this.target.properties._customPoint) {
            const coords = this.toEpsg4326(e.coordinate);
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