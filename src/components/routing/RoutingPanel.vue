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
                <v-autocomplete
                  :items="routeTargets.from"
                  :disabled="!routeTargets.from"
                  v-model="from"
                  label="From"
                  solo
                  clearable
                  @change="changeRouteTarget(from)"
                  @click:clear="clearCustomTarget(from)"
                >
                </v-autocomplete>
                <v-alert color="info" outline :value="choosingPoint(from)">
                  <v-icon>location_searching</v-icon>
                  Click on the map to choose a location.
                </v-alert>

                    <!-- <v-btn
                      small
                      round
                      v-if="from && from.properties.name === 'Point on map'"
                      :depressed="selectingPoint"
                      :color="selectingPoint ? 'cyan' : ''"
                      @click="clickSelectPoint"
                      style="margin-top:-20px"
                    >
                      <v-icon>location_searching</v-icon>
                      Select point
                    </v-btn> -->
                <v-autocomplete v-for="(waypoint, i) in waypoints"
                  :key="i"
                  :items="routeTargets[i]"
                  :disabled="!routeTargets"
                  clearable
                  v-model="waypoints[i]"
                  label="via"
                  @click:clear="clearCustomTarget(waypoints[i]), clearWaypoint(i)"
                  @change="changeRouteTarget(waypoints[i])"
                  solo
                ></v-autocomplete>
                <v-btn color="primary" flat small 
                  v-if="from && to && (waypoints.length === 0 || waypoints.length <= 8 && waypoints.slice(-1)[0])" @click="waypoints.push(undefined)">
                  Add stop
                </v-btn>
                <v-btn flat small v-if="waypoints.length" @click="waypoints.splice(-1)">Remove stop</v-btn>
                <v-autocomplete
                  :items="routeTargets.to"
                  :disabled="!routeTargets.to"
                  v-model="to"
                  label="to"
                  solo
                  clearable
                  @change="changeRouteTarget(to)"
                  @click:clear="clearCustomTarget(to)"
                ></v-autocomplete>
                <v-alert color="info" outline :value="choosingPoint(to)">
                  <v-icon>location_searching</v-icon>
                  Click on the map to choose a location.
                </v-alert>
                <div v-if="transportMode === 'fastest;publicTransport' && from && to">
                  <v-select
                    :items="timeModes"
                    v-model="timeMode"
                    clearable
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
                  <v-select 
                    v-if="timeMode && time"
                    v-model="travelDay"
                    :items="['Today', 'Another day']"
                  /></v-select>



                  <v-date-picker 
                    v-if="timeMode && travelDay !== 'Today'"
                    v-model="rawDate"
                    label="Date"

                  ></v-date-picker>


                </div>
                <v-container justify-center="true">
                  <v-btn class="d-block mx-auto " color="primary" @click="search" v-if="from && to && !(time && timeIsInvalid)">
                    Get directions
                  </v-btn>
                </v-container>
                <v-alert :value="errorMessage" outline type="error" class="ma-3">
                  {{ errorMessage }}
                </v-alert>
                
                <div v-for="(section, sectionNo) of (sections || [])">
                  <h2 v-if="sectionNo === 0">Driving directions</h2>
                  <h3>Section {{ sectionNo + 1 }} ({{ Math.round(section.summary.length/100)/10}} km)</h3>
                  <div class="actions">
                    <table>
                      <tr v-for="action of section.actions">
                        <td> {{ action.instruction }}</td>
                      </tr>
                    </table>
                  </div>
                </div>
                <div id="route" v-if="routeLegs">
                  <h2>{{ responseTransportMode }} directions</h2>
                  <table class="route-summary">
                    <tr>
                      <th>Time:</th>
                      <td>{{ routeDuration }}</td>
                    </tr>
                    <tr v-if="routeStartTime">
                      <th>Start:</th>
                      <td>{{ routeStartDate && routeStartDate + ' at '}} {{ routeStartTime }}</td>
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
                  <v-btn flat color="primary" @click="clickSaveGpx">
                    <v-icon>cloud_download</v-icon> 
                    &nbsp;&nbsp;Save as GPX file.
                  </v-btn>
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
import { transform } from 'ol/proj';
import toGpx from 'togpx';
import { saveAs } from 'file-saver';

function pad2 (x) {
  return ('0' + x).slice(-2);
}

export default {
  name: 'wgu-routing-panel',
  directives: {
  },
  props: {
  },
  data () {
    return {
      drawerOpen: undefined,
      sections: undefined,
      routeTargets: { from: null, to: null, 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null, 9: null },
      from: undefined,
      to: undefined,
      waypoints: [],
      route: undefined,
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
      timeMode: undefined,
      timeModes: [{ text: 'Arrive by', value: 'arrival' }, { text: 'Depart at', value: 'departure' }],
      errorMessage: undefined,
      dev: location.hash.match(/dev/),
      hourItems: [],
      minuteItems: [],
      hour: undefined,
      minute: undefined,
      travelDay: 'Today',
      rawDate: undefined,
      routeGeometry: undefined,
      stopsGeometry: undefined,
      boundingBox: undefined
      // selectingPoint: false
    }
  },
  created () {
    for (let i = 0; i < 24; i++) {
      this.hourItems.push(i);
    }
    for (let i = 0; i < 60; i++) {
      this.minuteItems.push(pad2(i));
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
      return [this.from, this.to, this.waypoints.map(w => w && w.geometry.coordinates), this.transportMode, this.timeMode, this.time, Date.now()];
    },
    routeDuration () {
      return this.route && humanizeDuration(this.route.summary.baseTime * 1000, { round: true, units: ['h', 'm'] });
    },
    routeDistance () {
      return this.route && `${Math.round(this.route.summary.distance * 10 / 1000) / 10} km`;
    },
    routeStartDate () {
      if (!this.isDateSpecified) {
        return '';
      }
      if (!this.route || !this.route.summary.departure) {
        return '';
      }
      const date = new Date(this.route.summary.departure.slice(0, 10));
      return `${pad2(date.getDate() + 1)}.${pad2(date.getMonth() + 1)}.${date.getFullYear()}`;
    },
    routeStartTime () {
      return this.route && this.route.summary.departure && this.route.summary.departure.slice(11, 19);
    },
    timeIsInvalid () {
      return this.hour !== undefined && this.minute === undefined;
    },
    responseTransportMode () {
      if (this.transportMode.match(/^car/)) {
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
    routeLegs () {
      return this.route && this.route.leg;
    },
    hasChangeIds () {
      return this.route && this.routeLegs.find(l => l.maneuver.find(m => m.changeId));
    },
    time () {
      if (this.hour === undefined || this.minute === undefined) {
        return undefined;
      }
      return ('0' + this.hour).slice(-2) + ':' + pad2(this.minute);
    },
    date () {
      if (!this.isDateSpecified) {
        const now = (new Date());
        const todayDate = `${now.getFullYear()}-${pad2(now.getMonth())}-${pad2(now.getDay() + 1)}`;
        return todayDate;
      }
      return this.rawDate;
    },
    isDateSpecified () {
      return this.travelDay !== 'Today' && this.rawDate;
    },
    selectingPoint () {
      return this.from && this.from.properties.name === 'Point on map' && this.from.geometry.coordinates === null;
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
      this.sections = undefined;
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
    },
    selectingPoint () {
    //   if (this.selectingPoint) {
    //     window.map.getViewport().style.cursor = 'crosshair';
    //     const self = this;
    //     window.map.on('click', e => {
    //       // just checking we're still in the same state
    //       if (self.selectingPoint) {
    //         const coords = transform(e.coordinate, window.map.getView().getProjection(), 'EPSG:4326');
    //         console.log(coords);
    //         window.map.getViewport().style.cursor = '';
    //         self.from.geometry.coordinates = coords;
    //       }
    //     });
    //   }
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

        ['from', 'to', 0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(targetSetId => {
          this.routeTargets[targetSetId] = [{
            text: 'Point on map',
            value: {
              type: 'Feature',
              properties: {
                name: 'Point on map'
              },
              geometry: {
                type: 'Point',
                coordinates: null
              }
            }
          }, ...routeTargets];
        });
      });
    },
    clearCustomTarget (targetSet) {
      targetSet.geometry.coordinates = null;
    },
    changeRouteTarget (targetSet) {
      if (targetSet && targetSet.geometry.coordinates === null) {
        window.map.getViewport().style.cursor = 'crosshair';
        // const self = this;
        window.map.once('click', e => {
          // just checking we're still in the same state
          if (targetSet.geometry.coordinates === null) {
            const coords = transform(e.coordinate, window.map.getView().getProjection(), 'EPSG:4326');
            console.log(coords);
            window.map.getViewport().style.cursor = '';
            targetSet.geometry.coordinates = coords;
          }
        });
      }

      // console.log(targetSet.geometry.coordinates)
    },
    choosingPoint (targetSet) {
      return targetSet && targetSet.properties.name === 'Point on map' && targetSet.geometry.coordinates === null;
    },

    async search () {
      this.sections = undefined;
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
      const route = result.data.routes[0];
      this.sections = route.sections;

      console.log(result.data);
      this.routeGeometry = {
        type: 'FeatureCollection',
        features: route.sections.map(section => polylineToGeoJSON(section.polyline))
      };
    },
    async getRouteV7 () {
      const makeRequest = () => {
        let timeParam = {};
        let walkRadiusParam = {};
        if (this.transportMode.match(/publicTransport/)) {
          if (this.time) {
            timeParam = {[this.timeMode]: `${this.date}T${this.time}:00`};
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

        const mode = (this.transportMode === 'fastest;publicTransport' && this.time ? 'fastest;publicTransportTimeTable' : this.transportMode);
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
        // return {
        //   type: 'LineString',
        //   coordinates: route.shape.map(coordString => flip(coordString.split(',').map(Number)))
        // };
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
#maneuvers td, .actions td {
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
  font-size:26px;
  padding-bottom:8px;
}


</style>