<i18n>
de:
  Public transport directions: Wegbeschreibung für öffentliche Verkehrsmittel
  Driving directions: Wegbeschreibung
  Bicycle directions: Wegbeschreibung
  Walking directions: Wegbeschreibung
  Time: Dauer
  Start: Abfahrtszeit
  Distance: Entfernung
  Routes: Routen
  Instructions: Beschreibungen
  km: km
  Section: Abschnitt
</i18n>
<template>
<div id="route"v-if="route">
  <!-- v8 response -->
  <div v-for="(section, sectionNo) of (route.sections || [])" :key="sectionNo">
    <h2 v-if="sectionNo === 0">{{ $t('Driving directions') }}</h2>
    <h3 v-if="route.sections.length > 1">{{ `${$t('Section')} ${sectionNo + 1}` }} ({{ Math.round(section.summary.length/100)/10}} {{ $t('km') }})</h3>
    <table class="route-summary">
      <tr>
        <th>{{ $t('Time') }}:</th>
        <td>{{ routeDuration(sectionNo) }}</td>
      </tr>
      <tr>
        <th>{{ $t('Distance') }}:</th>
        <td>{{ routeDistance(sectionNo) }}</td>
      </tr>
    </table>
    <div class="actions">
      <table>
        <tr v-for="(action, i) of section.actions" :key="i">
          <td class="time" v-if="action.cumulative"> {{ action.cumulative }} </td>
          <td> {{ action.instruction }}</td>
        </tr>
      </table>
    </div>
  </div>
  <!-- v7 response -->
  <div v-if="routeLegs">
    <h2>{{ $t(transportModeTitle + ' directions') }}</h2>
    <table class="route-summary">
      <tr>
        <th>{{ $t('Time') }}:</th>
        <td>{{ routeDuration() }}</td>
      </tr>
      <tr v-if="routeStartTime">
        <th>{{ $t('Start') }}:</th>
        <td>{{ routeStartDate && routeStartDate + ' at '}} {{ routeStartTime }}</td>
      </tr>
      <tr>
        <th>{{ $t('Distance') }}:</th>
        <td>{{ routeDistance() }}</td>
      </tr>
      <tr v-if="route.publicTransportLine">
        <th>{{ $t('Routes') }}:</th>
        <td>{{ route.publicTransportLine.map(l => l.lineName).join(',  ') }}</td>
      </tr>
    </table>

    <h3>{{ $t('Instructions') }}</h3>
    <div v-for="leg of routeLegs">
      <table class="maneuvers">
        <tr v-for="maneuver of leg.maneuver">
          <td class="time" v-if="isScheduled && maneuver.time"> {{ maneuver.time.slice(11, 19) }} </td>
          <td class="time" v-if="!isScheduled && maneuver.cumulative"> {{ maneuver.cumulative }} </td>
          <td v-html="maneuver.instruction">{{maneuver.instruction}}</td>
          <td class="changeId" v-if="hasChangeIds"> <span v-if="maneuver.changeId !== undefined">{{ maneuver.changeId }}</span> </td>
        </tr>
      </table>
    </div>
  </div>
</div>
</template>

<script>
import humanizeDuration from 'humanize-duration';
function pad2 (x) {
  return ('0' + x).slice(-2);
}
export default {
  props: ['route', 'dateSpecified', 'transportModeTitle'],
  data: () => ({
  }),
  name: 'RoutingInstructions',
  computed: {
    routeStartDate () {
      if (!this.dateSpecified) {
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
    routeLegs () {
      return this.route && this.route.leg;
    },
    hasChangeIds () {
      return this.route && this.routeLegs.find(l => l.maneuver.find(m => m.changeId));
    },
    isScheduled () {
      return this.route.mode && this.route.mode.transportModes[0] === 'publicTransportTimeTable';
    }
  },
  methods: {
    routeDuration (sectionNo) {
      return this.route && humanizeDuration(this.routeSummary(sectionNo).baseTime * 1000, { round: true, units: ['h', 'm'], language: this.$i18n.locale });
    },
    routeDistance (sectionNo) {
      return this.route && `${Math.round(this.routeSummary(sectionNo).distance * 10 / 1000) / 10} ${this.$t('km')}`;
    },
    routeSummary (sectionNo) {
      if (this.route && this.route.summary) {
        return this.route.summary;
      } else {
        return {
          baseTime: this.route.sections[sectionNo].summary.duration,
          distance: this.route.sections[sectionNo].summary.length
        }
      }
    }
  }
}
</script>

<style scoped>
.time {
  color: #555;
  vertical-align: top;
  font-style:italic;
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

.maneuvers td, .actions td {
  padding: 0.5em 0.5em;
}

.maneuvers .station,
.maneuvers .transit,
.maneuvers .line {
  font-weight:bold;
}


</style>
