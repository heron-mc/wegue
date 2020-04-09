<<template>
<div v-if="route">
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
  </div>
</div>
</template>

<script>
import humanizeDuration from 'humanize-duration';
function pad2 (x) {
  return ('0' + x).slice(-2);
}
export default {
  props: ['route', 'dateSpecified'],
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
    },
    routeLegs () {
      return this.route && this.route.leg;
    },
    hasChangeIds () {
      return this.route && this.routeLegs.find(l => l.maneuver.find(m => m.changeId));
    }
  }

}
</script>

<style scoped>

</style>