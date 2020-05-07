/* eslint-disable */
<i18n>
de:
  Get directions: Anweisungen bekommen
  Public transport: Öffentlicher Verkehr
  Bicycle (fastest): Fahrrad (am schnellsten)
  Bicycle (shortest distance): Fahrrad (kürzeste Strecke)
  Pedestrian: Fußgänger
  Car (shortest distance): Auto (kürzeste Entfernung)
  Car (fastest): Auto (am schnellsten)
  Mode: Transportmodus
  From: Von
  to: nach
  via: über
  Remove stop: Anschlag entfernen
  Add stop: Stop hinzufügen
  Sorry, you can specify a time, or multiple waypoints, but not both.: Leider können Sie eine Zeit oder mehrere Wegpunkte angeben, aber nicht beide.
  Sorry, directions are currently unavailable.: Eine Wegbeschreibung ist derzeit leider nicht verfügbar.
  No route was found.: Es wurde keine Route gefunden.
</i18n>

<template>
  <v-navigation-drawer
      v-model="drawerOpen"
      hide-overlay
      absolute
  >
    <v-card class="pa-2">
      <v-form>
        <v-select
          :items="transportModes"
          v-model="transportMode"
          :label="$t('Mode')"
          outline
        ></v-select>
        <DestinationSelector :label="$t('From')" @change="from = $event" :localSuggestions="localSuggestions"/>
        <DestinationSelector v-for="(waypoint, i) in waypoints" label="via" @change="$set(waypoints, i, $event)" :localSuggestions="localSuggestions" :key="i" />
        <v-btn color="primary" flat small
          v-if="from && to && (waypoints.length === 0 || waypoints.length <= 8 && waypoints.slice(-1)[0])" @click="waypoints.push(undefined)">
          {{ $t('Add stop') }}
        </v-btn>
        <v-btn flat small v-if="waypoints.length" @click="waypoints.splice(-1)">{{ $t('Remove stop') }}</v-btn>
        <DestinationSelector :label="$t('to')" @change="to = $event"  :localSuggestions="localSuggestions"/>
        <div v-if="transportMode === 'fastest;publicTransport' && from && to">
          <DateTimePicker @change="timeDate=$event"/>
        </div>
        <v-container justify-center="true">
          <v-btn class="d-block mx-auto " color="primary" @click="search" v-if="from && to && !(timeDate.time && timeDate.timeIsInvalid)">
            {{ $t('Get directions') }}
          </v-btn>
        </v-container>
        <v-alert :value="errorMessage" outline type="error" class="ma-3">
          {{ $t(errorMessage) }}
        </v-alert>
        <RoutingInstructions v-if="route" :route="route" :dateSpecified="timeDate.isDateSpecified" :transportModeTitle="responseTransportMode"/>
        <DownloadGPX :routeGeometry="routeGeometry" :transportMode="transportMode" />
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
  },
  components: {
    DestinationSelector, // The autocomplete component with places to route to/from
    RoutingInstructions, // Shows the instructions as returned by the routing API
    DateTimePicker, // Allows choosing departure/arrival time and optionally date, for public transit trips
    DownloadGPX
  },
  data () {
    return {
      drawerOpen: undefined,
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
      timeDate: {}
    }
  },
  async mounted () {
    this.loadLocalSuggestions()
    window.RoutingPanel = this;
    WguEventBus.$on('toggle-routing-panel', state => {
      this.drawerOpen = state === undefined ? !this.drawerOpen : state;
    });
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
      if (!this.route.mode || !this.route.mode.transportModes) {
        return 'Driving';
      } else {
        return {
          'publicTransport': 'Public transport',
          'publicTransportTimeTable': 'Public transport',
          'bicycle': 'Bicycle',
          'pedestrian': 'Walking'
        }[this.route.mode.transportModes[0]]
      }
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
        boundingBox: this.boundingBox
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
<style>

</style>