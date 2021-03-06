<i18n>
de:
  Get directions: Route berechnen
</i18n>
<template>

    <v-card
      class="wgu-feature-infowindow info-card"
      v-draggable-win="draggable"
      v-if="feature"
      v-bind:style="{ left: left, top: top, width: width }" >

      <v-toolbar :color="color" class="" :dark="dark">
          <v-toolbar-side-icon><v-icon>{{icon}}</v-icon></v-toolbar-side-icon>
          <v-toolbar-title class="wgu-win-title">{{title}}</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-toolbar-side-icon @click="onWinXClose"><v-icon>close</v-icon></v-toolbar-side-icon>
        </v-toolbar>

        <v-img v-if="attributes[imageProp]" :src="attributes[imageProp]" :width="imageWidth" :height="imageHeight" style="margin: 10px auto 0 auto"/>
        <v-card-title v-if="attributes[titleProp]" primary-title>
            <h3 class="headline mb-0">{{attributes[titleProp]}}</h3>
        </v-card-title>
        <v-card-text v-if="attributes[descProp]" v-html="description" :style="{maxHeight:textHeight, overflowY:'scroll'}"></v-card-text>
        <v-card-actions>
          <v-btn v-if="attributes[infoUrlProp]" flat color="blue" :href="attributes[infoUrlProp]" target="_blank">{{infoUrlText}}</v-btn>
          <v-btn v-if="feature.getGeometry().getType() === 'Point'" @click="clickDirections">{{ $t('Get directions') }}</v-btn>
        </v-card-actions>
    </v-card>

</template>

<script>

import { WguEventBus } from '../WguEventBus.js';
import { DraggableWin } from '../directives/DraggableWin.js';
import marked from 'marked/marked.min.js'; // importing the min is not best practice, but avoids a problem with ES6 code and uglify.

export default {
  name: 'wgu-feature-info-window-win',
  directives: {
    DraggableWin
  },
  props: {
    dark: {type: Boolean, required: false, default: false},
    icon: {type: String, required: false, default: 'info'},
    color: {type: String, required: false, default: 'red darken-3'},
    draggable: {type: Boolean, required: false, default: true}
  },
  data () {
    return {
      // will be filled in when mounted and when feature clicked
      layers: null,
      feature: null,
      attributes: null,
      width: null,
      left: null,
      top: null,
      title: 'Feature Info',
      titleProp: null,
      imageProp: null,
      descProp: null,
      infoUrlProp: null,
      infoUrlText: null,
      imageHeight: null,
      imageWidth: null,
      textHeight: null
    }
  },
  mounted () {
    const config = this.$appConfig.modules['wgu-feature-info-window'] || {};
    this.layers = config.layers;
    if (this.layers) {
      // Using a regular expression to Match layers
      this.layers.forEach(layer => { layer.layerId = new RegExp(layer.layerId) });
    }
    this.left = config.initPos ? this.initPos.left + 'px' : '300px';
    this.top = config.initPos ? this.initPos.top + 'px' : '200px';
    this.width = config.width ? config.width + 'px' : '350px';

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

      this.setFeature(selected[0]);
    });
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
    onWinXClose: function () {
      // this.feature.deselected; TODO: how to deselect Feature on Map?
      this.setFeature(null);
    },
    clickDirections: function () {
      WguEventBus.$emit('directions-to-feature', this.feature);
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>

  .wgu-feature-infowindow.info-card {
    position: absolute;
    background-color: white;
    z-index: 100;
  }

</style>
