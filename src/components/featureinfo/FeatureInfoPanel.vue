<i18n>
de:
  Get directions: Route berechnen
</i18n>
<template>

  <v-navigation-drawer class="wgu-feature-info-panel"
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
    <v-card
      class="wgu-feature-info-card info-card"
      v-draggable-win="draggable"
      v-if="feature"
       >

      <v-toolbar :color="color" class="" :dark="dark">
          <v-toolbar-side-icon><v-icon>{{icon}}</v-icon></v-toolbar-side-icon>
          <v-toolbar-title class="wgu-win-title">{{title}}</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-toolbar-side-icon @click="closePanel"><v-icon>close</v-icon></v-toolbar-side-icon>
        </v-toolbar>

        <v-img v-if="attributes[imageProp]" :src="attributes[imageProp]" :width="imageWidth" :height="imageHeight" style="margin: 10px auto 0 auto"/>
        <v-card-title v-if="attributes[titleProp]" primary-title>
            <h3 class="headline mb-0">{{attributes[titleProp]}}</h3>
        </v-card-title>
        <v-card-text v-if="attributes[descProp]" v-html="description" :style="{maxHeight:textHeight, overflowY:'scroll'}"></v-card-text>
        <v-card-actions>
          <v-btn v-if="attributes[infoUrlProp]" flat color="blue" :href="attributes[infoUrlProp]" target="_blank">{{infoUrlText}}</v-btn>
          <v-btn v-if="this.enableRouting === true && feature.getGeometry().getType() === 'Point'" @click="clickDirections">{{ $t('Get directions') }}</v-btn>
        </v-card-actions>
    </v-card>
  </v-navigation-drawer>
</template>

<script>

import {WguEventBus} from '../../../src/WguEventBus';
import marked from 'marked/marked.min.js';

export default {
  name: 'wgu-feature-info-panel',
  props: {
    right: {type: Boolean, required: false, default: false},
    height: {type: String, required: false, default: '100%'},
    width: {type: Number, required: false, default: 360},
    dark: {type: Boolean, required: false, default: false},
    icon: {type: String, required: false, default: 'info'},
    color: {type: String, required: false, default: 'red darken-3'},
    draggable: {type: Boolean, required: false, default: false},
    active: {type: Boolean, required: false, default: false},
    enableRouting: {type: Boolean, required: false, default: false},
    toggleGroup: {type: String, required: false, default: undefined}
  },
  data () {
    return {
      // will be filled in when mounted and when feature clicked
      layers: null,
      feature: null,
      attributes: null,
      title: 'Feature Info',
      titleProp: null,
      imageProp: null,
      descProp: null,
      infoUrlProp: null,
      infoUrlText: null,
      imageHeight: null,
      imageWidth: null,
      textHeight: null,
      moduleName: 'wgu-feature-info',
      drawerOpen: this.active
    }
  },
  mounted () {
    const config = this.$appConfig.modules['wgu-feature-info'] || {};
    this.layers = config.layers;
    if (this.layers) {
      // Using a regular expression to Match layers
      this.layers.forEach(layer => { layer.layerId = new RegExp(layer.layerId) });
    }

    // listen to selection events of connected layer and apply attributes
    WguEventBus.$on('map-selectionchange', (layerId, selected, deselected) => {
      if (selected.length === 0) {
        return;
      }
      const layer = this.findLayer(layerId);
      if (!layer) {
        return;
      }
      Object.assign(this, {
        ...layer,
        infoUrlText: layer.infoUrlText || 'More info...',
        title: layer.title || layer.titleProp || 'Feature Info',
        textHeight: `${layer.textHeight || 200}px`
      });

      this.closePanel();

      this.setFeature(selected[0]);

      // If part of toggleGroup, let other know we become active/visible
      this.drawerOpen = true;
      if (this.toggleGroup) {
        WguEventBus.$emit(this.toggleGroup, {'moduleName': this.moduleName, 'state': this.drawerOpen});
      }
    });

    // When member of toggle group: close if any other panel active
    if (this.toggleGroup) {
      WguEventBus.$on(this.toggleGroup, ({ moduleName, state }) => {
        this.drawerOpen = moduleName === this.moduleName && state;
      });
    }
  },
  computed: {
    description () {
      return marked(this.attributes[this.descProp] || '').replace(/<a /g, '<a target="_blank" ');
    }
  },
  methods: {
    /**
     * Sets the feature and its attributes as properties
     * @param {ol.Feature} feature The new feature
     */
    setFeature (feature) {
      this.feature = feature;
      this.attributes = this.feature ? this.feature.getProperties() : null;
    },
    /**
     * Find a layer in our target Layer collection by layer name (layerId).
     * @param {layerId} layerId layer name
     */
    findLayer (layerId) {
      const targetLayerArr = this.layers.filter(layer => layerId.match(layer.layerId));
      return targetLayerArr.length > 0 ? targetLayerArr[0] : null;
    },
    closePanel: function () {
      // this.feature.deselected; TODO: how to deselect Feature on Map?
      this.setFeature(null);
      if (this.drawerOpen === false) {
        // Already closed
        return;
      }
      this.drawerOpen = false;
      if (this.toggleGroup) {
        WguEventBus.$emit(this.toggleGroup, {'moduleName': this.moduleName, 'state': this.drawerOpen});
      }
    },
    clickDirections: function () {
      WguEventBus.$emit('directions-to-feature', this.feature);
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>

  .wgu-feature-info-panel {
    overflow: auto;
    /*max-height: calc(100vh - 200px);*/
  }
  /*.wgu-feature-info-card.info-card {*/
  /*  position: absolute;*/
  /*  background-color: white;*/
  /*  z-index: 100;*/
  /*}*/

</style>
