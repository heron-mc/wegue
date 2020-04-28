<i18n>
de:
    Download all active layers as GPX: Laden Sie alle aktiven Ebenen als GPX herunter
    Wegue layers: Wegue Ebenen
</i18n>
<template>
  <v-tooltip bottom>
    <template #activator="{ on: tooltip }">
      <v-btn icon :dark="dark"  v-on="{ ...tooltip }" @click="click">
        <v-icon medium>{{ icon }}</v-icon>
      </v-btn>
    </template>
    <span>{{ $t(hoverText) }}</span>
  </v-tooltip>

</template>

<script>
/* eslint-disable */
import { WguEventBus } from '../../WguEventBus'
import { Mapable } from '../../../src/mixins/Mapable';
import GeoJSON from 'ol/format/GeoJSON';
import { saveAs } from 'file-saver';
import toGpx from 'togpx';

export default {
  name: 'wgu-downloadlayers-btn',
  mixins: [Mapable],
  props: {
    dark: {type: Boolean, required: false, default: false},
    icon: {type: String, required: false, default: 'cloud_download'},
    hoverText: {type: String, required: false, default: 'Download all active layers as GPX'}
  },
  data: function () {
    return {
      state: false
    }
  },
  methods: {
    click () {
        console.log(this.map);
        const geojson = new GeoJSON();
        const layers = this.map.getLayers().getArray().filter(l => l.getVisible() && l.get('displayInLayerList') !== false);
        const features = [];
        for (const layer of layers) {
            features.push(...layer.getSource().getFeatures());
        }
        const featureCollection = geojson.writeFeaturesObject(features, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' });
        featureCollection.features = featureCollection.features.filter(f => f.geometry.type !== 'Polygon' && f.geometry.type !== 'MultiPolygon');
        const gpx = toGpx(featureCollection, {
            creator: 'Wegue',
            metadata: {
                name: this.$t(`Wegue layers`)
            }
        });
        const blob = new Blob([gpx], { type: 'application/gpx+xml' });
        saveAs(blob, 'layers.gpx');
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
</style>
