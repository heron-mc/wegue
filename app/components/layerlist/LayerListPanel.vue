<i18n>
de:
  Layers: Kartenebenen
</i18n>
<template>
  <v-navigation-drawer class="wgu-layer-list-panel"
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

    <v-card class="wgu-layer-list-card">
      <v-toolbar :color="color" class="" :dark="dark">
        <v-toolbar-side-icon><v-icon>{{icon}}</v-icon></v-toolbar-side-icon>
        <v-toolbar-title class="wgu-win-title">{{ $t('Layers') }}</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-toolbar-side-icon @click="closePanel"><v-icon>close</v-icon></v-toolbar-side-icon>
      </v-toolbar>

      <wgu-layerlist v-bind="options" />
    </v-card>

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
      icon: {type: String, required: false, default: 'layers'},
      color: {type: String, required: false, default: 'red darken-3'},
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
        WguEventBus.$on(this.toggleGroup, ({ moduleName, state }) => {
          this.drawerOpen = moduleName === this.moduleName && state;
        });
      }
    },
    methods: {
      closePanel: function () {
        if (this.drawerOpen === false) {
          // Already closed
          return;
        }
        this.drawerOpen = false;
        if (this.toggleGroup) {
          WguEventBus.$emit(this.toggleGroup, {'moduleName': this.moduleName, 'state': this.drawerOpen});
        }
      }
    }
  }
</script>

<style>
  .wgu-layer-list-panel {
    overflow: auto;
    /*max-height: calc(100vh - 200px);*/
  }

/*  .v-card.wgu-layerlist {*/
/*    position: absolute;*/
/*    z-index: 2;*/
/*  }*/

</style>
