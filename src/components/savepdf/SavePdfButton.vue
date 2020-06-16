<i18n>
de:
  Save as PDF: Als PDF speichern
</i18n>
<template>
  <v-tooltip bottom>
    <template #activator="{ on: tooltip }">
      <v-btn icon :dark="dark"  v-on="{ ...tooltip }" @click="click" :disabled="processing">
        <v-icon medium>{{ icon }}</v-icon>
      </v-btn>
    </template>
    <span>{{ $t(hoverText) }}</span>
  </v-tooltip>

</template>

<script>
/* eslint-disable */
import { Mapable } from '../../mixins/Mapable';
import { WguEventBus } from '../../WguEventBus'
import jsPDF from 'jspdf';

export default {
  name: 'wgu-savepdf-btn',
  mixins: [Mapable],
  props: {
    dark: {type: Boolean, required: false, default: false},
    icon: {type: String, required: false, default: 'picture_as_pdf'},
    hoverText: {type: String, required: false, default: 'Save as PDF'}
  },
  data: function () {
    return {
      processing: undefined
    };
  },
  methods: {
    click () {
      this.processing = true;
      savePdf(this.map, 150, () => this.processing = false);
    }
  }
};

// Copy a canvas out of our map into the prep area
function copyCanvas(sourceCanvas, outputContext) {
  if (sourceCanvas.width > 0) {
    const opacity = sourceCanvas.parentNode.style.opacity;
    outputContext.globalAlpha = opacity === '' ? 1 : Number(opacity);
    const transform = sourceCanvas.style.transform;
    // Get the transform parameters from the style's transform matrix
    const matrix = transform.match(/^matrix\(([^\(]*)\)$/)[1].split(',').map(Number);
    // Apply the transform to the export map context
    CanvasRenderingContext2D.prototype.setTransform.apply(outputContext, matrix);
    outputContext.drawImage(sourceCanvas, 0, 0);
  }
}

function createOutputCanvas(width, height) {
    const outputCanvas = document.createElement('canvas');
    [outputCanvas.width, outputCanvas.height] = [width, height];

    const outputContext = outputCanvas.getContext('2d');
    document.querySelectorAll('.ol-layer canvas')
      .forEach(canvas => copyCanvas(canvas, outputContext));
    return outputCanvas;
}

function savePdf(map, resolution, doneCb) {
  // code adapted from here: https://openlayers.org/en/latest/examples/export-pdf.html
  map.once('rendercomplete', function() {
    const outputCanvas = createOutputCanvas(...pageDimensionsPixels);
    const pdf = new jsPDF('landscape', undefined, 'a4');
    pdf.addImage(outputCanvas.toDataURL('image/jpeg'), 'JPEG', 0, headerBarMM, ...pageDimensionsMM);
    [...document.getElementsByClassName('logo')].forEach((logoElement, i) => {
      const scale = logoElement.clientWidth / logoElement.clientHeight;
      pdf.addImage(logoElement, 'JPEG', i * headerBarMM * 2 + 2, 2, headerBarMM * scale * 0.9, headerBarMM * 0.9);
    });
    pdf.save('map.pdf');

    // Reset original map size
    map.setSize(origSize);
    map.getView().setResolution(origResolution);
    doneCb();
  });

  const pageDimensionsMM = [297, 210]; // A4
  const pageDimensionsPixels = pageDimensionsMM.map(d => Math.round(d * resolution / 25.5));
  const headerBarMM = 30;
  const mapDimensionsMM = [pageDimensionsMM[0], pageDimensionsMM[1] - headerBarMM];
  const mapDimensionsPixels = mapDimensionsMM.map(d => Math.round(d * resolution / 25.5));
  const origSize = map.getSize();
  const origResolution = map.getView().getResolution();
  const mapScaling = Math.min(mapDimensionsPixels[0] / origSize[0], mapDimensionsPixels[1] / origSize[1]);

  // Resize map, triggering the handler above.
  map.setSize(mapDimensionsPixels);
  map.getView().setResolution(origResolution / mapScaling);
}

</script>

<style>
</style>
