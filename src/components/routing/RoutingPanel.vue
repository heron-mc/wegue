/* eslint-disable */
<template>
    <v-navigation-drawer
        v-model="drawerOpen"
        hide-overlay
        absolute
    >
        <v-card class="pa-2">
            <v-form v-if="routeTargets">
                <v-select
                  :items="transportModes"
                  v-model="transportMode"
                  label="Mode"
                  outline
                ></v-select>                
                <v-select
                  :items="routeTargets"
                  :disabled="routeTargets.length < 1"
                  v-model="from"
                  label="From"
                  solo
                ></v-select>
                <v-select v-for="(waypoint, i) in waypoints"
                  :key="i"
                  :items="routeTargets"
                  :disabled="routeTargets.length < 1"
                  clearable
                  v-model="waypoints[i]"
                  label="via"
                  @click:clear="clearWaypoint(i)"
                  solo
                ></v-select>
                <v-btn color="primary" flat small 
                  v-if="from && to && (waypoints.length === 0 || waypoints.slice(-1)[0])" @click="waypoints.push(undefined)">
                  Add stop
                </v-btn>
                <v-btn flat small v-if="waypoints.length" @click="waypoints.splice(-1)">Remove stop</v-btn>
                <v-select
                  :items="routeTargets"
                  :disabled="routeTargets.length < 1"
                  v-model="to"
                  label="to"
                  solo
                ></v-select>
                <div v-if="transportMode === 'publicTransport' && from && to">
                  <v-select
                    :items="timeModes"
                    v-model="timeMode"
                    label="Select arrival or departure"
                  ></v-select>
                  <v-layout row v-if="timeMode">
                    <v-flex col xs3>
                      <v-select
                        id="hour"
                        style="text-align: right"
                        v-model="hour"
                        label="Hour"
                        :items="hourItems"
                      ></v-select>
                    </v-flex>
                    <v-flex col xs1 class="colon">
                    :
                    </v-flex>
                    <v-flex col xs3>
                      <v-select
                        v-model="minute"
                        label="Minute"
                        :items="minuteItems"
                      ></v-select>
                    </v-flex>
                  </v-layout>

                </div>
                <v-container justify-center="true">
                  <v-btn class="d-block mx-auto " color="primary" @click="search" v-if="from && to && !(time && timeIsInvalid)">
                    Get directions
                  </v-btn>
                </v-container>
                <v-alert :value="errorMessage" outline type="error" class="ma-3">
                  {{ errorMessage }}
                </v-alert>
                <div v-if="actions" id="actions">
                  <h2>Driving directions</h2>

                  <table v-if="actions">
                    <tr v-for="action of actions">
                      <td> {{ action.instruction }}</td>
                    </tr>
                  </table>
                </div>
                <div v-if="routeLegs">
                  <h2>{{ responseTransportMode }} directions</h2>
                    <table class="route-summary">
                      <tr>
                        <th>Time:</th>
                        <td>{{ routeDuration }}</td>
                      </tr>
                      <tr v-if="routeStartTime">
                        <th>Start:</th>
                        <td>{{ routeStartTime }}</td>
                      </tr>
                      <tr>
                        <th>Distance:</th>
                        <td>{{ routeDistance }}</td>
                      </tr>
                      <tr v-if="route.publicTransportLine">
                        <th>Routes:</th>
                        <td>{{ route.publicTransportLine.map(l => l.lineName).join(',  ') }}</td>
                      </tr>
                    </table>
                          
                  <h3>Instructions</h3>
                  <div v-for="leg of routeLegs">
                    <table id="maneuvers">
                      <tr v-for="maneuver of leg.maneuver">
                        <td class="time" v-if="responseTransportMode === 'publicTransportTimeTable' && maneuver.time"> {{ maneuver.time.slice(11, 19) }} </td>
                        <td class="time" v-if="responseTransportMode !== 'publicTransportTimeTable' && maneuver.cumulative"> {{ maneuver.cumulative }} </td>
                        <td v-html="maneuver.instruction">{{maneuver.instruction}}</td>
                        <td class="changeId" v-if="hasChangeIds"> <span v-if="maneuver.changeId !== undefined">{{ maneuver.changeId }}</span> </td>
                      </tr>
                    </table>
                  </div>
                </div>
                
            </v-form>

        </v-card>
    </v-navigation-drawer>
</template>

<script>

import axios from 'axios';
import flexpolyline from './flexpolyline';
import { WguEventBus } from '../../WguEventBus.js';
import humanizeDuration from 'humanize-duration';
// Note: you must create this file, following the format of routingConfig.js.example
import routingConfig from './routingConfig.js';

export default {
  name: 'wgu-routing-panel',
  directives: {
  },
  props: {
  },
  data () {
    return {
      drawerOpen: undefined,
      actions: undefined,
      routeTargets: [],
      from: undefined,
      to: undefined,
      waypoints: [],
      route: undefined,
      transportMode: 'bicycle',
      transportModes: [{
        text: 'Car',
        value: 'car'
      }, {
        text: 'Public transport',
        value: 'publicTransport'
      }, {
        text: 'Bicycle',
        value: 'bicycle'
      }],
      timeMode: undefined,
      timeModes: [{ text: 'Arrive by', value: 'arrival' }, { text: 'Depart at', value: 'departure' }],
      errorMessage: undefined,
      dev: location.hash.match(/dev/),
      hourItems: [],
      minuteItems: [],
      hour: undefined,
      minute: undefined
    }
  },
  created () {
    for (let i = 0; i < 24; i++) {
      this.hourItems.push(i);
    }
    for (let i = 0; i < 60; i++) {
      this.minuteItems.push(('0' + i).slice(-2));
    }
  },
  async mounted () {
    this.initRoutingTargets()
    window.RoutingPanel = this;
    WguEventBus.$on('toggle-routing-panel', state => {
      this.drawerOpen = state === undefined ? !this.drawerOpen : state;
    });
  },
  computed: {
    everything () {
      return this.from + this.to + this.transportMode + this.timeMode + this.time + Date.now();
    },
    routeDuration () {
      return this.route && humanizeDuration(this.route.summary.baseTime * 1000, { round: true, units: ['h', 'm'] });
    },
    routeDistance () {
      return this.route && `${Math.round(this.route.summary.distance * 10 / 1000) / 10} km`;
    },
    routeStartTime () {
      return this.route && this.route.summary.departure && this.route.summary.departure.slice(11, 19);
    },
    timeIsInvalid () {
      return this.hour !== undefined && this.minute === undefined;
    },
    responseTransportMode () {
      return this.route && {
        'publicTransport': 'Public transport',
        'publicTransportTimeTable': 'Public transport',
        'bicycle': 'Bicycle'
      }[this.route.mode.transportModes[0]]
    },
    routeLegs () {
      return this.route && this.route.leg;
    },
    hasChangeIds () {
      return this.route && this.routeLegs.find(l => l.maneuver.find(m => m.changeId));
    },
    time () {
      return ('0' + this.hour).slice(-2) + ':' + ('0' + this.minute).slice(-2);
    }

  },
  watch: {
    everything () {
      this.actions = undefined;
      this.route = undefined;
    }
  },
  methods: {
    initRoutingTargets () {
      WguEventBus.$on('ol-map-rendered', async () => {
        // Find layers that have been marked 'routable' in app config, and use them as routing targets
        const layerUrls = this.$map.getLayers().getArray().filter(l => l.getProperties().routable).map(l => l.getSource().getUrl());
        const featureCollections = await Promise.all(layerUrls.map(axios.get));
        for (const { data } of featureCollections) {
          this.routeTargets.push(...data.features.map(poi => ({ text: poi.properties.name, value: poi })));
        }
      });
    },
    async search () {
      this.actions = undefined;
      this.errorMessage = undefined;
      this.route = undefined;
      if (this.transportMode === 'car') {
        return this.getRouteV8();
      } else /* if (this.transportMode === 'publicTransport') */{
        return this.getRouteV7();
      }
    },
    async getRouteV8 () {
      // https://developer.here.com/documentation/routing-api/api-reference-swagger.html
      // https://developer.here.com/documentation/routing/dev_guide/topics/resource-calculate-route.html
      const result = await axios.get(`https://router.hereapi.com/v8/routes`, {
        params: {
          transportMode: 'car',
          origin: flip(this.from.geometry.coordinates).join(','),
          destination: flip(this.to.geometry.coordinates).join(','),
          return: ['summary', 'polyline', 'instructions', 'actions'].join(','),
          apiKey: routingConfig.hereApiKey
        }
      });
      const route = result.data.routes[0];
      console.log(route.sections[0].actions)
      this.actions = route.sections[0].actions

      console.log(result.data);
      const routeGeometry = polylineToGeoJSON(route.sections[0].polyline);
      WguEventBus.$emit('route-update', {
        routeGeometry,
        startGeometry: { type: 'Point', coordinates: routeGeometry.coordinates[0] },
        endGeometry: { type: 'Point', coordinates: routeGeometry.coordinates.slice(-1)[0] }
      });
    },
    async getRouteV7 () {
      const makeRequest = () => {
        let timeParam = {};
        if (this.time) {
          const now = (new Date());
          const date = `${now.getFullYear()}-${('0' + (now.getMonth() + 1)).slice(-2)}-${('0' + (now.getDay() + 1)).slice([-2])}`;
          timeParam = {[this.timeMode]: `${date}T${this.time}:00`};
        }
        const toGeo = point => `geo!${point.geometry.coordinates[1]},${point.geometry.coordinates[0]}`;
        const waypointParams = {
          waypoint0: toGeo(this.from)
        };
        this.waypoints.forEach((waypoint, i) => {
          waypointParams[`waypoint${i + 1}`] = toGeo(waypoint)
        });
        waypointParams[`waypoint${this.waypoints.length + 1}`] = toGeo(this.to);

        const mode = 'fastest;' + (this.transportMode === 'publicTransport' && this.time ? 'publicTransportTimeTable' : this.transportMode);
        return axios.get(`https://route.ls.hereapi.com/routing/7.2/calculateroute.json`, {
          params: {
            apiKey: routingConfig.hereApiKey,
            ...waypointParams,
            mode,
            lineattributes: 'all',
            maneuverattributes: 'all', // TODO strip down to the ones we need.
            routeattributes: 'all',
            combineChange: true, // avoid separate "enter" and "leave" steps for interchanges
            ...timeParam
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

      function routeGeometryFromRoute (route) {
        return {
          type: 'LineString',
          coordinates: route.shape.map(coordString => flip(coordString.split(',').map(Number)))
        };
      }

      function addCumulativeTimes (leg) {
        let total = 0;
        for (const maneuver of leg.maneuver) {
          maneuver.cumulative = `${('0' + Math.floor(total / 3600)).slice(-2)}:${('0' + Math.floor(total / 60) % 60).slice(-2)}`;
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
      const routeGeometry = routeGeometryFromRoute(route);
      WguEventBus.$emit('route-update', {
        routeGeometry,
        stopsGeometry: stopsGeometryFromRoute(route),
        startGeometry: { type: 'Point', coordinates: routeGeometry.coordinates[0] },
        endGeometry: { type: 'Point', coordinates: routeGeometry.coordinates.slice(-1)[0] },
        boundingBox: [route.boundingBox.topLeft.longitude, route.boundingBox.bottomRight.latitude, route.boundingBox.bottomRight.longitude, route.boundingBox.topLeft.latitude]
      });
    },
    clearWaypoint (index) {
      this.$nextTick(() => this.waypoints.splice(index, 1));
    }
  }

}
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
#maneuvers td, #actions td {
  padding: 0.5em 0.5em;
}

#maneuvers .station,
#maneuvers .transit,
#maneuvers .line {
  font-weight:bold;
}

.bold {
  font-weight: bold;
}

.route-summary {
  margin-bottom:1em;
}

.route-summary th {
  text-align: right;
}
.route-summary th {
  /* padding: 0.5em 0; */
}
.route-summary td {
  padding:0 0.25em;
}

.time {
  color: #555;
  vertical-align: top;
  font-style:italic;
}

.selected-time {
  font-size:16px;
  padding:6px 10px;
}

.changeId {
  vertical-align: top;
  padding: 0;
  margin: 0;
}

.changeId span {
  border: 1px solid black;
  padding: 0px 6px;
  border-radius:40px;
}

#hour {
  text-align: right;
}

.colon {
  text-align: center;
  vertical-align: bottom;
  margin-top:auto;
  margin-bottom:auto;
  font-size:20px;
}


</style>