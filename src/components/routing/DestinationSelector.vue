<i18n>
de:
  Click on the map to choose a location.: Klicken Sie auf die Karte, um einen Ort auszuwählen.
  Point on map: Punkt auf der Karte
</i18n>
<template>
<div :class="{ 'routing-target': true, [target && target.properties.source + '-source']: true }">
  <v-autocomplete
    :items=items
    v-model="target"
    :label="label"
    solo
    clearable
    @change="changeRouteTarget"
    @click:clear="clearCustomTarget"
    :search-input.sync="searchQuery"
  >
    <template v-slot:item="data">
        <v-icon class="nav-icon" v-if="data.item.value.properties.source === 'custom'" >location_searching</v-icon>
        <span  :class="{ local: data.item.source === 'local', geocode: data.item.source === 'geocode', custom: data.item.value.properties.source === 'custom' }">{{ data.item.text }}</span>
    </template>
  </v-autocomplete>
  <v-alert color="info" outline :value="choosingPoint">
    <v-icon>location_searching</v-icon>
    {{ $t('Click on the map to choose a location.') }}
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
  props: {
    label: String,
    localSuggestions: Array
  },
  data: () => ({
    target: undefined,
    geocodeSuggestions: [],
    searchQuery: undefined
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
        source: 'geocode',
        value: feature({}, point([item.position.lng, item.position.lat]))
      }));
      this.geocodeSuggestions = results;
    }
  },
  computed: {
    items () {
      return [
        this.customPoint,
        ...this.localSuggestions.map(s => { s.value.properties.source = 'local'; return s; }),
        ...this.geocodeSuggestions.map(s => { s.value.properties.source = 'geocode'; return s })
      ];
    },
    choosingPoint () {
      return this.target && this.target.properties.source === 'custom' && this.target.geometry.coordinates === null;
    },
    customPoint () {
      return {
        text: this.$t('Point on map'),
        value: feature({ name: 'Point on map', source: 'custom' }, point(null))
      }
    }
  },
  methods: {
    toEpsg4326 (coord) {
      return transform(coord, this.$map.getView().getProjection(), 'EPSG:4326');
    },
    changeRouteTarget () {
      console.log(this.target);
      if (this.target && this.target.properties.source === 'custom') {
        this.$map.wguDefaultCursor = 'crosshair';
        this.$map.once('click', e => {
          // just checking we're still in the same state
          if (this.target.properties.source === 'custom') {
            const coords = this.toEpsg4326(e.coordinate);
            this.$map.wguDefaultCursor = '';
            this.target.geometry.coordinates = coords;
          }
        });
      }
    },
    clearCustomTarget () {
      if (this.target.properties.source === 'custom') {
        this.target.geometry.coordinates = null;
      }
    },
    setTargetById (id) {
      this.target = this.localSuggestions.find(s => s.value.properties.id === id).value
    }
  }
}
</script>

<style scoped>
span.local {
  color: rgb(226, 0, 122) !important;
  font-weight:bold !important;
}
.nav-icon {
  margin-left:-6px;
  margin-right: 10px;
}

</style>
<style>
.local-source input {
  color: rgb(226, 0, 122) !important;
  font-weight:bold !important;
}
</style>
