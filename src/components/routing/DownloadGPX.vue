<i18n>
de:
  Save as GPX file: Als GPX-Datei speichern
</i18n>
<template>
<v-btn v-if="routeGeometry" flat color="primary" @click="clickSaveGpx">
    <v-icon>cloud_download</v-icon>
    &nbsp;&nbsp;{{ $t('Save as GPX file') }}.
</v-btn>
</template>

<script>
import { saveAs } from 'file-saver';
import toGpx from 'togpx';

export default {
  props: ['transportMode', 'routeGeometry'],
  methods: {
    clickSaveGpx () {
      if (!this.routeGeometry) {
        return;
      }
      const geom = JSON.parse(JSON.stringify(this.routeGeometry));
      geom.features.forEach(line => {
        line.properties = {
          name: line.properties.instruction
        }
      });
      const gpx = toGpx(geom, {
        creator: 'Wegue',
        metadata: {
          name: `${this.transportMode} directions`
        }
      });
      const blob = new Blob([gpx], { type: 'application/gpx+xml' });
      saveAs(blob, 'route.gpx');
    }
  }
}
</script>

<style scoped>

</style>