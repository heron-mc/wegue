<i18n>
de:
  Arrival or departure time: Ankunfts- oder Abfahrtszeit
  Arrive by: Ankunft vor
  Depart at: Abfahrt um
  Hour: Stunde
  Minute: Minute
  Today: Heute
  Another day: Ein anderer Tag
  Date: Datum
</i18n>
<template>
<div>
  <v-select
    :items="timeModes"
    v-model="timeMode"
    clearable
    :label="$t('Arrival or departure time')"
  ></v-select>
  <v-layout row v-if="timeMode">
    <v-flex col xs3>
      <v-select
        id="hour"
        style="text-align: right"
        v-model="hour"
        :label="$t('Hour')"
        :items="hourItems"
      ></v-select>
    </v-flex>
    <v-flex col xs1 class="colon">
    :
    </v-flex>
    <v-flex col xs3>
      <v-select
        v-model="minute"
        :label="$t('Minute')"
        :items="minuteItems"
      ></v-select>
    </v-flex>
  </v-layout>
  <v-select
    v-if="timeMode && time"
    v-model="travelDay"
    :items="[{ text: $t('Today'), value: 'Today'}, { text: $t('Another day'), value: 'Another day'}]"
  /></v-select>

  <v-date-picker
    v-if="timeMode && travelDay !== 'Today'"
    v-model="rawDate"
    :label="$t('Date')"

  ></v-date-picker>
</div>
</template>

<script>
import { pad2 } from './routingUtils';

export default {
  data: () => ({
    timeMode: undefined,
    hourItems: [],
    minuteItems: [],
    hour: undefined,
    minute: undefined,
    travelDay: 'Today',
    rawDate: undefined
  }),
  created () {
    for (let i = 0; i < 24; i++) {
      this.hourItems.push(i);
    }
    for (let i = 0; i < 60; i++) {
      this.minuteItems.push(pad2(i));
    }
  },
  computed: {
    timeModes () {
      return [{ text: this.$t('Arrive by'), value: 'arrival' }, { text: this.$t('Depart at'), value: 'departure' }]
    },
    time () {
      if (!this.timeMode || this.hour === undefined || this.minute === undefined) {
        return undefined;
      }
      return ('0' + this.hour).slice(-2) + ':' + pad2(this.minute);
    },
    date () {
      if (!this.isDateSpecified) {
        const now = (new Date());
        const todayDate = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
        return todayDate;
      }
      return this.rawDate;
    },
    isDateSpecified () {
      return this.timeMode && this.travelDay !== 'Today' && this.rawDate;
    },
    isTimeValid () {
      return !(this.hour !== undefined && this.minute === undefined);
    },
    anything () {
      return [this.timeMode, this.time, this.date, this.isDateSpecified, this.isTimeValid];
    }
  },
  watch: {
    anything () {
      this.$emit('change', {
        timeMode: this.timeMode,
        time: this.time,
        date: this.date,
        isDateSpecified: this.isDateSpecified,
        isTimeValid: this.isTimeValid
      });
    }
  }
}
</script>

<style scoped>
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