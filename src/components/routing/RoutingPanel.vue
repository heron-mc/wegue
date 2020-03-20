/* eslint-disable */
<template>
    <v-navigation-drawer
        v-model="drawer"
        absolute
    >
        <v-card>
            
            <v-form v-if="routeTargets">
                <v-select
                  :items="transportModes"
                  v-model="transportMode"
                  label="Mode"
                ></v-select>
                <v-select
                  :items="routeTargets"
                  v-model="from"
                  label="From"
                ></v-select>
                <v-select
                  :items="routeTargets"
                  v-model="to"
                  label="to"
                ></v-select>
                <div v-if="transportMode === 'publicTransport'">
                  <v-select
                    :items="[{ label: 'Arrive by', value:'arrive' }, { label: 'Depart at', value: 'depart' }]"
                    v-model="timeMode"
                    label="Select time"
                  ></v-select>
                  <v-time-picker v-model="time" v-if="timeMode">
                  </v-time-picker>

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
                  <v-btn class="d-block mx-auto " color="primary" @click="search" v-if="from && to && (transportMode === 'car' || true || time)">
                    Get directions
                  </v-btn>
                </v-container>
                <!-- <v-simple-table v-show="instructions">
                  <template v-slot:default> -->
                    <!-- <div> {{ errorMessage }}</div> -->
                <v-alert :value="errorMessage" outline type="error" >
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
                <div v-if="publicTransportLegs">
                  <h2>Public transport directions</h2>
                    <v-list>
                      <v-list-tile>
                        <v-list-tile-content class="bold">Time:</v-list-tile-content>
                        <v-list-tile-content class="align-end">{{ publicTransportDuration }}</v-list-tile-content>
                      </v-list-tile>
                      <v-list-tile>
                        <v-list-tile-content class="bold">Distance:</v-list-tile-content>
                        <v-list-tile-content class="align-end">{{ publicTransportDistance }}</v-list-tile-content>
                      </v-list-tile>
                      <v-list-tile>
                        <v-list-tile-content class="bold" style="min-width:4em">Routes:</v-list-tile-content>
                        <v-list-tile-content class="">
                          <!-- <v-card> -->
                          <div style="padding:1em; text-align:right">
                            <span v-for="line of publicTransportRoute.publicTransportLine">
                            <!-- <v-chip label outline v-for="line of publicTransportRoute.publicTransportLine"> -->
                              {{ line.lineName }} 
                            </span>                           
                          </div>
                          <!-- </v-card> -->
                        </v-list-tile-content>
                      </v-list-tile>
                    </v-list>
                  <h3>Instructions</h3>
                  <div v-for="leg of publicTransportLegs">
                    <table id="maneuvers">
                      <!-- <h4>Start: {{ leg.start.label }}</h4> -->
                      <tr v-for="maneuver of leg.maneuver">
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
      publicTransportLegs: undefined,
      publicTransportRoute: undefined,
      transportMode: 'car',
      transportModes: [{
        text: 'Car',
        value: 'car'
      }, {
        text: 'Public transport',
        value: 'publicTransport'
      }],
      timeMode: undefined,
      time: undefined,
      errorMessage: undefined
    }
  },
  async mounted () {
    // var me = this;
    // TODO integrate this with layer loading
    const pois = (await axios.get('http://staging.nplh.geolicious.de/api/poi_features/1')).data;
    console.log(pois);
    this.routeTargets = pois.features.map(poi => ({ text: poi.properties.name, value: poi }));
    window.RoutingPanel = this;
  },
  computed: {
    everything () {
      return this.from + this.to + this.transportMode + this.timeMode + this.time + Date.now();
    },
    publicTransportDuration () {
      return this.publicTransportRoute && humanizeDuration(this.publicTransportRoute.summary.baseTime * 1000, { round: true, units: ['h', 'm'] });
    },
    publicTransportDistance () {
      return this.publicTransportRoute && `${Math.round(this.publicTransportRoute.summary.distance * 10 / 1000) / 10} km`;
    }
  },
  watch: {
    everything () {
      this.actions = undefined;
      this.publicTransportLegs = undefined;
      this.publicTransportRoute = undefined;
    }
  },
  methods: {
    async search () {
      this.publicTransportLegs = undefined;
      this.actions = undefined;
      this.errorMessage = undefined;
      if (this.transportMode === 'car') {
        return this.getCarDirections();
      } else if (this.transportMode === 'publicTransport') {
        return this.getPublicTransportDirections();
      }
    },
    async getCarDirections () {
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
    async getPublicTransportDirections () {
      // test: from Hamboern to Allee Timmerloh
      let result;
      try {
        let timeParam = {};
        if (this.time) {
          const now = (new Date());
          const date = `${now.getYear() + 1900}-${now.getMonth() + 1}-${now.getDay() + 1}`;
          timeParam = {[this.timeMode]: `${date}T${this.time}`};
        }
        result = await axios.get(`https://route.ls.hereapi.com/routing/7.2/calculateroute.json`, {
          params: {
            apiKey: hereApiKey,
            waypoint0: `geo!${this.from.geometry.coordinates[1]},${this.from.geometry.coordinates[0]}`,
            waypoint1: `geo!${this.to.geometry.coordinates[1]},${this.to.geometry.coordinates[0]}`,
            mode: 'fastest;publicTransport',
            lineattributes: 'all',
            maneuverattributes: 'all',
            routeattributes: 'all',
            combineChange: true, // avoid separate "enter" and "leave" steps for interchanges
            ...timeParam,
            language: 'de-de'
            // consider using maneuver groups (routeAttributes=group?)
          }
        });
      } catch (e) {
        console.log(e.response, e.response.status, e.response.responseText, e.response.data.subtype);
        if (e.response && e.response.status === 400 && e.response.data.subtype === 'NoRouteFound') {
          this.errorMessage = 'No public transport route was found.';
        } else {
          this.errorMessage = 'Sorry, we can\'t provide directions at this time.'
        }
        console.log(e.response);
        window.e = e;
        return;
      }
      const route = result.data.response.route[0];
      this.publicTransportLegs = route.leg;
      this.publicTransportRoute = route;
      console.log(route);
      const stops = [];
      for (const line of route.publicTransportLine) {
        // stops.push(...line.stop.map(stop => [stop.position.longitude, stop.position.latitude])) // add all stops
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
        }
      });
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

</style>