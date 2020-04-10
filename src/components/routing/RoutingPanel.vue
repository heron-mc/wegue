/* eslint-disable */
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
          label="Mode"
          outline
        ></v-select>
        <RoutingTarget label="From" @change="from = $event" :routeTargets="routeTargets"/>
        <RoutingTarget v-for="(waypoint, i) in waypoints" label="via" @change="$set(waypoints, i, $event)" :routeTargets="routeTargets" :key="i" />
        <v-btn color="primary" flat small
          v-if="from && to && (waypoints.length === 0 || waypoints.length <= 8 && waypoints.slice(-1)[0])" @click="waypoints.push(undefined)">
          Add stop
        </v-btn>
        <v-btn flat small v-if="waypoints.length" @click="waypoints.splice(-1)">Remove stop</v-btn>
        <RoutingTarget label="to" @change="to = $event"  :routeTargets="routeTargets"/>
        <div v-if="transportMode === 'fastest;publicTransport' && from && to">
          <DateTimePicker @change="timeDate=$event"/>
        </div>
        <v-container justify-center="true">
          <v-btn class="d-block mx-auto " color="primary" @click="search" v-if="from && to && !(timeDate.time && timeDate.timeIsInvalid)">
            Get directions
          </v-btn>
        </v-container>
        <v-alert :value="errorMessage" outline type="error" class="ma-3">
          {{ errorMessage }}
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
import RoutingTarget from './RoutingTarget';
import RoutingInstructions from './RoutingInstructions';
import DateTimePicker from './DateTimePicker';
import DownloadGPX from './DownloadGPX'
import { getRouteV7, getRouteV8 } from './hereRoutingApi';
import { featureCollection } from './routingUtils';
export default {
  name: 'wgu-routing-panel',
  directives: {
  },
  props: {
  },
  components: {
    RoutingTarget, // The autocomplete component with places to route to/from
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
      routeTargets: undefined,
      transportMode: 'fastest;publicTransport',
      transportModes: [{
        text: 'Car (fastest)',
        value: 'car-fast'
      }, {
        text: 'Car (shortest distance)',
        value: 'car-short'
      }, {
        text: 'Public transport',
        value: 'fastest;publicTransport'
      }, {
        text: 'Bicycle (fastest)',
        value: 'fastest;bicycle'
      }, {
        text: 'Bicycle (shortest distance)',
        value: 'shortest;bicycle'
      }, {
        text: 'Pedestrian (fastest)',
        value: 'fastest;pedestrian'
      }, {
        text: 'Pedestrian (shortest distance)',
        value: 'shotest;pedestrian'
      }],
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
    this.initRouteTargets()
    window.RoutingPanel = this;
    WguEventBus.$on('toggle-routing-panel', state => {
      this.drawerOpen = state === undefined ? !this.drawerOpen : state;
    });
  },
  computed: {
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
        startGeometry: this.from && this.from.geometry.coordinates ? { type: 'Point', coordinates: this.from.geometry.coordinates } : undefined,
        waypointsGeometry: featureCollection(this.waypointsGeometry),
        endGeometry: this.to && this.to.geometry.coordinates ? { type: 'Point', coordinates: this.to.geometry.coordinates } : undefined,
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
    initRouteTargets () {
      WguEventBus.$on('ol-map-rendered', async () => {
        // Find layers that have been marked 'routable' in app config, and use them as routing targets
        const layerUrls = this.$map.getLayers().getArray().filter(l => l.getProperties().routable).map(l => l.getSource().getUrl());
        const featureCollections = await Promise.all(layerUrls.map(axios.get));
        console.log(featureCollections[0].data.features[0]);
        const routeTargets = []
        for (const { data } of featureCollections) {
          routeTargets.push(...data.features.map(poi => ({ text: poi.properties.name, value: poi })));
        }
        routeTargets.sort((a, b) => (a.text < b.text ? -1 : 1));
        this.routeTargets = routeTargets;
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
        transportMode: this.transportMode
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
        timeDate: this.timeDate
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