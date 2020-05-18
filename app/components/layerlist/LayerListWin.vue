<i18n>
de:
  Layers: Kartenebenen
</i18n>
<template>

  <v-card
    v-draggable-win="draggable" class="wgu-layerlist"
    v-if=show v-bind:style="{ left: left, top: top}"
  >
    <v-toolbar :color="color" :dark="dark">
      <v-toolbar-side-icon><v-icon>{{icon}}</v-icon></v-toolbar-side-icon>
      <v-toolbar-title class="wgu-win-title">{{ $t(title) }}</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-toolbar-side-icon @click="show=false"><v-icon>close</v-icon></v-toolbar-side-icon>
    </v-toolbar>

    <wgu-layerlist v-bind="options" />

  </v-card>

</template>

<script>
  import { DraggableWin } from '../../../src/directives/DraggableWin.js';
  import LayerList from './LayerList';

  export default {
    name: 'wgu-layerlist-win',
    directives: {
      DraggableWin
    },
    components: {
      'wgu-layerlist': LayerList
    },
    props: {
      dark: {type: Boolean, required: false, default: false},
      color: {type: String, required: false, default: 'red darken-3'},
      icon: {type: String, required: false, default: 'layers'},
      title: {type: String, required: false, default: 'Layers'},
      draggable: {type: Boolean, required: false, default: true},
      active: {type: Boolean, required: false, default: false},
      initPos: {type: Object, required: false},
      options: { type: Object, required: false, default: {} }
    },
    data () {
      return {
        moduleName: 'wgu-layerlist',
        show: this.active,
        left: this.initPos ? this.initPos.left + 'px' : '10px',
        top: this.initPos ? this.initPos.top + 'px' : '70px'
      }
    }
  }
</script>

<style>

  .v-card.wgu-layerlist {
    position: absolute;
    z-index: 2;
  }

</style>
