<i18n>
de:
  Layers: Kartenebenen
</i18n>
<template>
  <v-navigation-drawer
      v-model="drawerOpen"
      :value="drawerOpen"
      :dark="dark"
      :right="right"
      :width="width"
      :height="height"
      hide-overlay
      disable-resize-watcher
      disable-route-watcher
      absolute
      stateless
  >

    <wgu-layerlist v-bind="options" />

  </v-navigation-drawer>
</template>

<script>
  import LayerList from './LayerList';
  import {WguEventBus} from '../../../src/WguEventBus';

  export default {
    name: 'wgu-layerlist-panel',
    components: {
      'wgu-layerlist': LayerList
    },
    props: {
      right: {type: Boolean, required: false, default: false},
      width: {type: Number, required: false, default: 360},
      height: {type: String, required: false, default: '100%'},
      dark: {type: Boolean, required: false, default: false},
      color: {type: String, required: false, default: 'red darken-3'},
      title: {type: String, required: false, default: 'Layers'},
      active: {type: Boolean, required: false, default: false},
      options: { type: Object, required: false, default: {} },
      toggleGroup: {type: String, required: false, default: undefined}
    },
    data () {
      return {
        moduleName: 'wgu-layerlist',
        drawerOpen: this.active
      }
    },
    mounted () {
      WguEventBus.$on('toggle-layerlist-panel', state => {
        this.drawerOpen = state === undefined ? !this.drawerOpen : state;
      });

      // When member of toggle group: close if any other panel active
      if (this.toggleGroup) {
        WguEventBus.$on(this.toggleGroup, arg => {
          this.drawerOpen = arg.moduleName === this.moduleName;
        });
      }
    }
  }
</script>

<style>

/*  .v-card.wgu-layerlist {*/
/*    position: absolute;*/
/*    z-index: 2;*/
/*  }*/

</style>
