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
        <RoutingInstructions :route="route" :dateSpecified="timeDate.isDateSpecified"/>
        <v-btn v-if="route" flat color="primary" @click="clickSaveGpx">
          <v-icon>cloud_download</v-icon>
          &nbsp;&nbsp;Save as GPX file.
        </v-btn>
      </v-form>
    </v-card>
  </v-navigation-drawer>
</template>

<script>

import axios from 'axios';
import flexpolyline from './flexpolyline';
import { WguEventBus } from '../../WguEventBus.js';
// Note: you must create this file, following the format of routingConfig.js.example
import routingConfig from './routingConfig.js';
import toGpx from 'togpx';
import { saveAs } from 'file-saver';
import RoutingTarget from './RoutingTarget';
import RoutingInstructions from './RoutingInstructions';
import DateTimePicker from './DateTimePicker.vue';

export default {
  name: 'wgu-routing-panel',
  directives: {
  },
  props: {
  },
  components: {
    RoutingTarget, // The autocomplete component with places to route to/from
    RoutingInstructions, // Shows the instructions as returned by the routing API
    DateTimePicker // Allows choosing departure/arrival time and optionally date, for public transit trips
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
        waypointsGeometry: {
          type: 'FeatureCollection',
          features: this.waypointsGeometry
        },
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
      } else /* if (this.transportMode === 'publicTransport') */{
        return this.getRouteV7();
      }
    },
    async getRouteV8 () {
      // https://developer.here.com/documentation/routing-api/api-reference-swagger.html
      // https://developer.here.com/documentation/routing/dev_guide/topics/resource-calculate-route.html
      const via = this.waypoints
        .filter(Boolean)
        .map(w => w.geometry.coordinates)
        .filter(Boolean)
        .map(flip)
        .map(c => c.join(','));
        // .join(',');
      const result = await axios.get(`https://router.hereapi.com/v8/routes`, {
        params: {
          transportMode: 'car',
          routingMode: this.transportMode.split('-')[1],
          origin: flip(this.from.geometry.coordinates).join(','),
          destination: flip(this.to.geometry.coordinates).join(','),
          ...(via ? { via } : {}),
          return: 'summary,polyline,instructions,actions',
          apiKey: routingConfig.hereApiKey
        },
        // the API wants &via=x,y&via=x,y whereas Axios by default provides &via[]=x,y&via[]=x,y
        paramsSerializer: params =>
          Object.keys(params)
            .map(key => {
              const vals = Array.isArray(params[key]) ? params[key] : [params[key]];
              return vals.map(val => `${key}=${val}`).join('&')
            }).join('&')
      });
      this.route = result.data.routes[0];

      console.log(result.data);
      this.routeGeometry = {
        type: 'FeatureCollection',
        features: this.route.sections.map(section => polylineToGeoJSON(section.polyline))
      };
    },
    async getRouteV7 () {
      const makeRequest = () => {
        let timeParam = {};
        let walkRadiusParam = {};
        if (this.transportMode.match(/publicTransport/)) {
          if (this.timeDate.time) {
            timeParam = {[this.timeDate.timeMode]: `${this.timeDate.date}T${this.timeDate.time}:00`};
          }
          walkRadiusParam = { walkRadius: 3000 }
        }
        const toGeo = point => `geo!${point.geometry.coordinates[1]},${point.geometry.coordinates[0]}`;
        const waypointParams = {
          waypoint0: toGeo(this.from)
        };
        this.waypoints.forEach((waypoint, i) => {
          waypointParams[`waypoint${i + 1}`] = toGeo(waypoint)
        });
        waypointParams[`waypoint${this.waypoints.length + 1}`] = toGeo(this.to);

        const mode = (this.transportMode === 'fastest;publicTransport' && this.timeDate.time ? 'fastest;publicTransportTimeTable' : this.transportMode);
        return axios.get(`https://route.ls.hereapi.com/routing/7.2/calculateroute.json`, {
          params: {
            apiKey: routingConfig.hereApiKey,
            ...waypointParams,
            mode,
            lineattributes: 'all',
            maneuverattributes: 'all', // TODO strip down to the ones we need.
            routeattributes: 'all',
            combineChange: true, // avoid separate "enter" and "leave" steps for interchanges
            ...timeParam,
            ...walkRadiusParam
            // language: 'de-de'
          }
        });
      }

      function stopsGeometryFromRoute (route) {
        const stops = [];
        for (const leg of route.leg) {
          const newStops = leg.maneuver
            .filter(m => ['change', 'enter', 'leave'].indexOf(m.action) >= 0);
          newStops.forEach((m, i) => { m.changeId = i + 1; });
          stops.push(...newStops);
        }

        return {
          type: 'FeatureCollection',
          features: stops.map(m => ({
            type: 'Feature',
            properties: {
              changeId: m.changeId
            },
            geometry: {
              type: 'Point',
              coordinates: [m.position.longitude, m.position.latitude]
            }
          }))
        };
      }

      function shapeToLineFeature (shape, maneuver) {
        return {
          type: 'Feature',
          properties: {
            type: maneuver._type,
            instruction: maneuver.instruction.replace(/(<([^>]+)>)/g, '')
          },
          geometry: {
            type: 'LineString',
            coordinates: shape.map(coordString => flip(coordString.split(',').map(Number)))
          }
        };
      }

      function routeGeometryFromRoute (route) {
        const fc = {
          type: 'FeatureCollection',
          features: []
        };
        for (const leg of route.leg) {
          const lineFeatures = leg.maneuver
            .filter(m => m.shape.length > 1)
            .map(m => shapeToLineFeature(m.shape, m));
          fc.features.push(...lineFeatures);
        }
        return fc;
      }

      function addCumulativeTimes (leg) {
        let total = 0;
        for (const maneuver of leg.maneuver) {
          maneuver.cumulative = `${pad2(Math.floor(total / 3600))}:${pad2(Math.floor(total / 60) % 60)}`;
          total += (maneuver.travelTime || 0);
        }
      }

      let result;
      try {
        result = await makeRequest();
      } catch (e) {
        console.log(e);
        console.log(e.response, e.response.status, e.response.responseText, e.response.data.subtype);
        if (e.response && e.response.status === 400 && e.response.data.subtype === 'NoRouteFound') {
          this.errorMessage = 'No route was found.';
        } else if (e.response && e.response.data && e.response.data.details === 'Time Table Transit Routing is only supported for two StopOver waypoints') {
          this.errorMessage = 'Sorry, you can specify a time, or multiple waypoints, but not both.';
        } else {
          this.errorMessage = 'Sorry, directions are currently unavailable.'
        }
        if (e.response && e.response.data && e.response.data.details) {
          console.log(e.response.data.details, e.response.data.additionalData);
        }
        return;
      }
      const route = result.data.response.route[0];
      route.leg.forEach(addCumulativeTimes);
      this.route = route;
      console.log(route);
      this.boundingBox = [route.boundingBox.topLeft.longitude, route.boundingBox.bottomRight.latitude, route.boundingBox.bottomRight.longitude, route.boundingBox.topLeft.latitude];
      this.routeGeometry = routeGeometryFromRoute(route);
      this.stopsGeometry = stopsGeometryFromRoute(route);
    },
    clickSaveGpx () {
      if (!this.routeGeometry) {
        return;
      }
      const geom = JSON.parse(JSON.stringify(this.routeGeometry));
      geom.features.forEach(line => {
        line.properties = {
          name: line.properties.instruction
        }
      });
      const gpx = toGpx(geom, {
        creator: 'Wegue',
        metadata: {
          name: `${this.responseTransportMode} directions`
        }
      });
      const blob = new Blob([gpx], { type: 'application/gpx+xml' });
      saveAs(blob, 'route.gpx');
    }
  }
}
const pad2 = (x) => ('0' + x).slice(-2);
const flip = ([a, b]) => [b, a];

function polylineToGeoJSON (polyline) {
  const points = flexpolyline.decode(polyline).polyline
  return {
    type: 'LineString',
    coordinates: points.map(([a, b]) => [b, a])
  }
}

</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>

</style>