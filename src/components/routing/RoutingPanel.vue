/* eslint-disable */
<i18n>
de:
  Get directions: Route berechnen
  Public transport: Öffentliche Verkehrsmittel
  Bicycle (fastest): Fahrrad (schnellste Route)
  Bicycle (shortest distance): Fahrrad (kürzeste Route)
  Pedestrian: Fußgänger
  Car (shortest distance): Auto (kürzeste Route)
  Car (fastest): Auto (schnellste Route)
  Mode: Verkehrsmittel
  From: Von
  to: nach
  via: über
  Remove stop: Zwischenstop entfernen
  Add stop: Zwischenstop hinzufügen
  Sorry, you can specify a time, or multiple waypoints, but not both.: Leider können Sie eine Zeit oder mehrere Wegpunkte angeben, aber nicht beides.
  Sorry, directions are currently unavailable.: Eine Wegbeschreibung ist derzeit leider nicht verfügbar.
  No route was found.: Es wurde keine Route gefunden.
</i18n>

<template>
  <v-navigation-drawer
      v-model="drawerOpen"
      :value="drawerOpen"
      :dark="dark"
      :right="right"
      :width="width"
      :height="height"
      hide-overlay
      disable-resize-watcher
      disable-route-watcher
      absolute
      stateless
      height="unset"
  >
    <v-card class="pa-2">
      <v-form>
        <v-select
          v-if="showDirectionsControls"
          :items="transportModes"
          v-model="transportMode"
          :label="$t('Mode')"
          outline
        ></v-select>
        <DestinationSelector
          v-show="showDirectionsControls"
          :label="$t('From')"
          @change="from = $event"
          :localSuggestions="localSuggestions"/>
        <DestinationSelector
          v-for="(waypoint, i) in waypoints"
          label="via"
          @change="$set(waypoints, i, $event)"
          :localSuggestions="localSuggestions"
          :key="i"
        />
        <v-btn color="primary" flat small
          v-if="showDirectionsControls && from && to && (waypoints.length === 0 || waypoints.length <= 8 && waypoints.slice(-1)[0])" @click="waypoints.push(undefined)">
          {{ $t('Add stop') }}
        </v-btn>
        <v-btn flat small v-if="waypoints.length" @click="waypoints.splice(-1)">{{ $t('Remove stop') }}</v-btn>
        <DestinationSelector
          :label="showDirectionsControls ? $t('to') : $t('Find place')"
          @change="toChange"
          :localSuggestions="localSuggestions"/>
        <v-btn color="primary" flat small v-if="!showDirectionsControls && to" @click="showDirectionsControls=true">Directions</v-btn>

        <div v-if="transportMode === 'fastest;publicTransport' && from && to">
          <DateTimePicker @change="timeDate=$event"/>
        </div>
        <v-container v-if="showDirectionsControls" justify-center="true">
          <v-btn class="d-block mx-auto " color="primary" @click="search" v-if="from && to && !(timeDate.time && timeDate.timeIsInvalid)">
            {{ $t('Get directions') }}
          </v-btn>
        </v-container>
        <v-alert :value="errorMessage" outline type="error" class="ma-3">
          {{ $t(errorMessage) }}
        </v-alert>
        <DownloadGPX :routeGeometry="routeGeometry" :transportMode="transportMode" />
        <RoutingInstructions v-if="route" :route="route" :dateSpecified="timeDate.isDateSpecified" :transportModeTitle="responseTransportMode"/>
      </v-form>
    </v-card>
  </v-navigation-drawer>
</template>

<script>

import axios from 'axios';
import { WguEventBus } from '../../WguEventBus.js';
import DestinationSelector from './DestinationSelector';
import RoutingInstructions from './RoutingInstructions';
import DateTimePicker from './DateTimePicker';
import DownloadGPX from './DownloadGPX'
import { getRouteV7, getRouteV8 } from './hereRoutingApi';
import { featureCollection, point } from './routingUtils';
export default {
  name: 'wgu-routing-panel',
  directives: {
  },
  props: {
    right: {type: Boolean, required: false, default: false},
    width: {type: Number, required: false, default: 360},
    height: {type: String, required: false, default: '100%'},
    dark: {type: Boolean, required: false, default: false},
    color: {type: String, required: false, default: 'red darken-3'},
    active: {type: Boolean, required: false, default: false},
    options: { type: Object, required: false, default: {} },
    toggleGroup: {type: String, required: false, default: undefined}
  },
  components: {
    DestinationSelector, // The autocomplete component with places to route to/from
    RoutingInstructions, // Shows the instructions as returned by the routing API
    DateTimePicker, // Allows choosing departure/arrival time and optionally date, for public transit trips
    DownloadGPX
  },
  data () {
    return {
      moduleName: 'wgu-routing',
      drawerOpen: this.active,
      from: undefined,
      to: undefined,
      waypoints: [],
      localSuggestions: [],
      transportMode: 'fastest;publicTransport',
      errorMessage: undefined,
      dev: location.hash.match(/dev/),
      routeGeometry: undefined,
      stopsGeometry: undefined,
      boundingBox: undefined,
      route: undefined,
      timeDate: {},
      showDirectionsControls: false
    }
  },
  async mounted () {
    this.loadLocalSuggestions()
    window.RoutingPanel = this;
    WguEventBus.$on('toggle-routing-panel', state => {
      this.drawerOpen = state === undefined ? !this.drawerOpen : state;
    });

    // When member of toggle group: close if any other panel active
    if (this.toggleGroup) {
      WguEventBus.$on(this.toggleGroup, arg => {
        this.drawerOpen = arg.moduleName === this.moduleName;
      });
    }
  },
  computed: {
    transportModes () {
      return [
        {
          text: this.$t('Car (fastest)'),
          value: 'car-fast'
        }, {
          text: this.$t('Car (shortest distance)'),
          value: 'car-short'
        }, {
          text: this.$t('Public transport'),
          value: 'fastest;publicTransport'
        }, {
          text: this.$t('Bicycle (fastest)'),
          value: 'fastest;bicycle'
        }, {
          text: this.$t('Bicycle (shortest distance)'),
          value: 'shortest;bicycle'
        }, {
          text: this.$t('Pedestrian'),
          value: 'shortest;pedestrian'
        }
      ]
    },
    // when anything changes that was used to calculate the route, we clear the route
    routeParameters () {
      return [this.from, this.to, this.waypoints.map(w => w && w.geometry.coordinates), this.transportMode, this.timeDate.timeMode, this.timeDate.time, Date.now()];
    },
    waypointsGeometry () {
      return this.waypoints.filter(w => w && w.geometry && w.geometry.coordinates);
    },
    allGeometry () {
      return [this.from && this.from.geometry.coordinates, this.waypoints.map(w => w && w.geometry.coordinates), this.to && this.to.geometry.coordinates, this.routeGeometry];
    },
    responseTransportMode () {
      if (!this.route || !this.route.mode || !this.route.mode.transportModes) {
        return 'Driving';
      } else {
        return {
          'publicTransport': 'Public transport',
          'publicTransportTimeTable': 'Public transport',
          'bicycle': 'Bicycle',
          'pedestrian': 'Walking'
        }[this.route.mode.transportModes[0]]
      }
    },
    boundingBoxForStops () {
      let bbox;
      const stops = [this.from && this.from.geometry.coordinates, ...this.waypoints.map(w => w && w.geometry.coordinates), this.to && this.to.geometry.coordinates];
      for (let stop of stops) {
        if (stop) {
          bbox = bbox || [...stop, ...stop];
          bbox[0] = Math.min(bbox[0], stop[0]);
          bbox[1] = Math.min(bbox[1], stop[1]);
          bbox[2] = Math.max(bbox[2], stop[0]);
          bbox[3] = Math.max(bbox[3], stop[1]);
        }
      }
      return bbox;
    }
  },
  watch: {
    routeParameters () {
      this.route = undefined;
      this.routeGeometry = undefined;
      this.stopsGeometry = undefined;
      this.boundingBox = undefined;
    },
    allGeometry () {
      WguEventBus.$emit('route-update', {
        routeGeometry: this.routeGeometry,
        startGeometry: this.from && this.from.geometry.coordinates ? point(this.from.geometry.coordinates) : undefined,
        waypointsGeometry: featureCollection(this.waypointsGeometry),
        endGeometry: this.to && this.to.geometry.coordinates ? point(this.to.geometry.coordinates) : undefined,
        stopsGeometry: this.stopsGeometry,
        boundingBox: this.boundingBox || this.boundingBoxForStops
      });
    },
    route () {
      if (this.route) {
        this.$nextTick(() => document.getElementById('route').scrollIntoView({ behavior: 'smooth' }));
      } else {
        this.routeGeometry = undefined;
      }
    }
  },
  methods: {
    loadLocalSuggestions () {
      WguEventBus.$on('ol-map-rendered', async () => {
        // Find layers that have been marked 'routable' in app config, and use them as routing targets
        const layerUrls = this.$map.getLayers().getArray()
          .filter(l => l.getProperties().routable)
          .map(l => l.getSource().getUrl());
        const featureCollections = await Promise.all(layerUrls.map(axios.get));
        const localSuggestions = []
        for (const { data } of featureCollections) {
          localSuggestions.push(...data.features.map(poi => ({ text: poi.properties.name, value: poi, source: 'local' })));
        }
        localSuggestions.sort((a, b) => (a.text < b.text ? -1 : 1));
        this.localSuggestions = localSuggestions;
      });
    },
    toChange (newTo) {
      this.to = newTo;
      if (!newTo && !this.from) {
        this.showDirectionsControls = false;
      }
    },
    async search () {
      this.errorMessage = undefined;
      this.route = undefined;
      if (this.transportMode.match(/^car/)) {
        return this.getRouteV8();
      } else {
        return this.getRouteV7();
      }
    },
    async getRouteV8 () {
      const response = await getRouteV8({
        from: this.from,
        waypoints: this.waypoints,
        to: this.to,
        transportMode: this.transportMode,
        locale: this.$i18n.locale
      });

      this.route = response.route;
      this.routeGeometry = response.routeGeometry;
    },
    async getRouteV7 () {
      const response = await getRouteV7({
        from: this.from,
        waypoints: this.waypoints,
        to: this.to,
        transportMode: this.transportMode,
        timeDate: this.timeDate,
        locale: this.$i18n.locale
      });
      if (response.errorMessage) {
        this.errorMessage = response.errorMessage;
      } else {
        this.route = response.route;
        this.boundingBox = response.boundingBox;
        this.routeGeometry = response.routeGeometry;
        this.stopsGeometry = response.stopsGeometry;
      }
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.v-navigation-drawer {
  max-height:100%;
}
</style>
