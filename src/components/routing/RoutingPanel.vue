/* eslint-disable */
<template>
    <v-navigation-drawer
        v-model="drawer"
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
                  v-model="from"
                  label="From"
                  solo
                ></v-select>
                <v-select v-for="(waypoint, i) in waypoints"
                  :items="routeTargets"
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
                  v-model="to"
                  label="to"
                  solo
                ></v-select>
                <div v-if="transportMode === 'publicTransport'">
                  <v-select
                    :items="timeModes"
                    v-model="timeMode"
                    label="Select time"
                  ></v-select>
                  <v-text-field 
                    mask="time"  
                    v-model="rawTime" 
                    :label="timeMode === 'arrival' ? 'Arrival time': 'Departure time'">
                  </v-text-field>
                  <div v-if="timeIsInvalid && rawTime.length > 2">
                    <v-icon color="red lighten-1">error</v-icon>
                    Time is not valid
                  </div>
                  <!-- <v-time-picker v-model="time" v-if="timeMode"> </v-time-picker> -->

                </div>
                <!-- <v-text-field
                    v-model="start"
                    label="Start"
                />
                <v-text-field
                    v-model="end"
                    label="End"
                /> -->
                <v-container justify-center="true">
                  <v-btn class="d-block mx-auto " color="primary" @click="search" v-if="from && to && !(rawTime && timeIsInvalid) && (transportMode !== 'publicTransport' || dev || time)">
                    Get directions
                  </v-btn>
                </v-container>
                <!-- <v-simple-table v-show="instructions">
                  <template v-slot:default> -->
                    <!-- <div> {{ errorMessage }}</div> -->
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
                      <!-- <h4>Start: {{ leg.start.label }}</h4> -->
                      <tr v-for="maneuver of leg.maneuver">
                        <td class="time" v-if="responseTransportMode === 'publicTransportTimeTable' && maneuver.time"> {{ maneuver.time.slice(11, 19) }} </td>
                        <td class="time" v-if="responseTransportMode !== 'publicTransportTimeTable' && maneuver.cumulative"> {{ maneuver.cumulative }} </td>
                        <td v-html="maneuver.instruction">{{maneuver.instruction}}</td>
                      </tr>
                    </table>
                  </div>
                </div>
                
            </v-form>

        </v-card>
    </v-navigation-drawer>
</template>

<script>

// import { WguEventBus } from '../WguEventBus.js';
// import { DraggableWin } from '../directives/DraggableWin.js';

// const hereAppID = 'xHdoxVIuQwHUJuGQF47q';
const hereApiKey = 'x9SeCvwikNOtxoPoDbhI8qhRSWP1Gxmz_op6V7ovguE';
import axios from 'axios';
// import flexpolyline from 'flexpolyline/javascript';
import flexpolyline from './flexpolyline';
import { WguEventBus } from '../../WguEventBus.js';
import humanizeDuration from 'humanize-duration';

export default {
  name: 'wgu-routing-panel',
  directives: {
  },
  props: {
  },
  data () {
    return {
      drawer: undefined,
      // start: undefined,
      // end: undefined,
      actions: undefined,
      routeTargets: undefined,
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
      rawTime: '',
      time: undefined,
      errorMessage: undefined,
      dev: location.hash.match(/dev/)
    }
  },
  async mounted () {
    // var me = this;
    // TODO integrate this with layer loading
    const pois = (await axios.get('http://staging.nplh.geolicious.de/api/poi_features/1')).data;
    console.log(pois);
    this.routeTargets = pois.features.map(poi => ({ text: poi.properties.name, value: poi }));
    if (window.location.hash.match(/dev/)) {
      this.from = pois.features[4];
      console.log(this.from, pois.features);
      this.to = pois.features[5];
    }
    window.RoutingPanel = this;
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
      return this.rawTime.length <= 2 || !(Number(this.rawTime.slice(0, 2)) < 24 && Number(this.rawTime.slice(2, 4)) < 60);
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
    }

  },
  watch: {
    everything () {
      this.actions = undefined;
      this.route = undefined;
    },
    rawTime () {
      this.time = this.rawTime.slice(0, 2) + ':' + this.rawTime.slice(-2);
    }
  },
  methods: {
    async search () {
      this.actions = undefined;
      this.errorMessage = undefined;
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
          // note lat,lon
          origin: flip(this.from.geometry.coordinates).join(','), // '53.549,10', // [52.5308, 13.3847].join(','),
          destination: flip(this.to.geometry.coordinates).join(','), // [52.5323, 13.3789].join(','),
          return: ['summary', 'polyline', 'instructions', 'actions'].join(','),
          apiKey: hereApiKey
        }
      });
      const route = result.data.routes[0];
      console.log(route.sections[0].actions)
      this.actions = route.sections[0].actions

      console.log(result.data);
      console.log();
      const routeGeometry = polylineToGeoJSON(route.sections[0].polyline);
      WguEventBus.$emit('route-update', {
        routeGeometry,
        startGeometry: { type: 'Point', coordinates: routeGeometry.coordinates[0] },
        endGeometry: { type: 'Point', coordinates: routeGeometry.coordinates.slice(-1)[0] }
      });
      //   await (await fetch(lConf.url)).json()
    },
    async getRouteV7 () {
      // test: from Hamboern to Allee Timmerloh
      let result;
      try {
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
        result = await axios.get(`https://route.ls.hereapi.com/routing/7.2/calculateroute.json`, {
          params: {
            apiKey: hereApiKey,
            ...waypointParams,
            mode,
            lineattributes: 'all',
            maneuverattributes: 'all',
            routeattributes: 'all',
            combineChange: true, // avoid separate "enter" and "leave" steps for interchanges
            ...timeParam
            // language: 'de-de'
            // consider using maneuver groups (routeAttributes=group?)
          }
        });
      } catch (e) {
        console.log(e.response, e.response.status, e.response.responseText, e.response.data.subtype);
        if (e.response && e.response.status === 400 && e.response.data.subtype === 'NoRouteFound') {
          this.errorMessage = 'No route was found.';
        } else {
          this.errorMessage = 'Sorry, we can\'t provide directions at this time.'
        }
        if (e.response && e.response.data && e.response.data.details) {
          console.log(e.response.data.details, e.response.data.additionalData);
        }
        window.e = e;
        return;
      }
      const route = result.data.response.route[0];
      route.leg.forEach(leg => {
        let total = 0;
        for (const maneuver of leg.maneuver) {
          maneuver.cumulative = `${('0' + Math.floor(total / 3600)).slice(-2)}:${('0' + Math.floor(total / 60) % 60).slice(-2)}`;
          total += (maneuver.travelTime || 0);
        }
      });
      this.route = route;
      console.log(route);
      const stops = [];
      for (const line of (route.publicTransportLine || [])) {
        stops.push(...[line.stop[0], ...line.stop.slice(-1)].map(stop => ({
          type: 'Feature',
          properties: {
            name: stop.stopName
          },
          geometry: {
            type: 'Point',
            coordinates: [stop.position.longitude, stop.position.latitude]
          }
        })));
      }

      const routeGeometry = {
        type: 'LineString',
        coordinates: route.shape.map(coordString => flip(coordString.split(',').map(Number)))
      };
      WguEventBus.$emit('route-update', {
        routeGeometry,
        startGeometry: { type: 'Point', coordinates: routeGeometry.coordinates[0] },
        endGeometry: { type: 'Point', coordinates: routeGeometry.coordinates.slice(-1)[0] },
        stopsGeometry: {
          type: 'FeatureCollection',
          features: stops
        },
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

</style>