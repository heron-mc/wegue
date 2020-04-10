<<template>
<div id="route"v-if="route">
  <!-- v8 response -->
  <div v-for="(section, sectionNo) of (route.sections || [])">
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
  <!-- v7 response -->
  <div v-if="routeLegs">
    <h2>{{ transportModeTitle }} directions</h2>
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
    routeDuration () {
      return this.route && humanizeDuration(this.route.summary.baseTime * 1000, { round: true, units: ['h', 'm'] });
    },
    routeDistance () {
      return this.route && `${Math.round(this.route.summary.distance * 10 / 1000) / 10} km`;
    },
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