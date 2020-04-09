<template>
<div>
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
</template>

<script>
const pad2 = (x) => ('0' + x).slice(-2);

export default {
  data: () => ({
    timeMode: undefined,
    timeModes: [{ text: 'Arrive by', value: 'arrival' }, { text: 'Depart at', value: 'departure' }],
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
    isTimeValid () {
      return !(this.hour !== undefined && this.minute === undefined);
    },
    anything () {
      return [this.time, this.date, this.isDateSpecified, this.isTimeValid];
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