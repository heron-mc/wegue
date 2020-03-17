<template>
    <v-navigation-drawer
        v-model="drawer"
        absolute
    >
        <v-card>
            <v-card-title class="headline">
                    Directions
            </v-card-title>
            <v-form>
                <v-text-field
                    v-model="start"
                    label="Start"
                />
                <v-text-field
                    v-model="end"
                    label="End"
                />
            </v-form>
        </v-card>
    </v-navigation-drawer>
</template>

<script>

// import { WguEventBus } from '../WguEventBus.js';
// import { DraggableWin } from '../directives/DraggableWin.js';

export default {
  name: 'wgu-routing-panel',
  directives: {
  },
  props: {
  },
  data () {
    return {
    }
  },
  mounted () {
    // var me = this;

  },
  methods: {
  }

}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>


</style>
