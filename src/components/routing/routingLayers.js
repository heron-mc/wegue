import { WguEventBus } from '../../WguEventBus.js';
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON';
// import Feature from 'ol/Feature';
// import LineString from 'ol/geom/LineString';
import { Style, Stroke, RegularShape, Fill, Text } from 'ol/style';
export function routingLayers (routingOptions, map) {
  if (!routingOptions) {
    return;
  }
  const startSource = new VectorSource({ });
  const startLayer = new VectorLayer({
    name: 'route-start',
    displayInLayerList: false,
    style: new Style({
      image: new RegularShape({
        fill: new Fill({ color: 'green' }),
        stroke: new Stroke({ color: 'black', width: 2 }),
        points: 5,
        radius: 10,
        radius2: 4,
        angle: 0
      })
    }),
    source: startSource
  });
  const endSource = new VectorSource({ });
  const endLayer = new VectorLayer({
    name: 'route-end',
    displayInLayerList: false,
    style: new Style({
      image: new RegularShape({
        fill: new Fill({ color: 'red' }),
        stroke: new Stroke({ color: 'black', width: 2 }),
        points: 5,
        radius: 10,
        radius2: 4,
        angle: 0
      })
    }),
    source: endSource
  });

  const stopsSource = new VectorSource({ });
  const labelStyle = new Style({
    text: new Text({
      font: 'bold 14px "Open Sans", "Arial Unicode MS", "sans-serif"',
      textAlign: 'left',
      offsetX: 10,
      // placement: point?
      fill: new Fill({
        color: 'white'
      }),
      stroke: new Stroke({
        color: 'black',
        width: 2
      })
    })
  });

  const stopStyle = new Style({
    image: new RegularShape({
      fill: new Fill({ color: 'white' }),
      stroke: new Stroke({ color: 'black', width: 2 }),
      points: 20,
      radius: 8,
      // radius2: 10,
      angle: 0
    })
  });
  const stopsLayer = new VectorLayer({
    name: 'route-stops',
    displayInLayerList: false,
    style: feature => {
      labelStyle.getText().setText(feature.get('name'));
      return [stopStyle, labelStyle];
    },
    source: stopsSource
  });

  const routeSource = new VectorSource({ });
  const routeLayer = new VectorLayer({
    name: 'route',
    displayInLayerList: false,
    style: [
      new Style({
        stroke: new Stroke({
          width: 12,
          color: 'hsla(250,50%,20%,0.4)'
        })
      }),
      new Style({
        stroke: new Stroke({
          width: 8,
          color: 'hsla(250,100%,20%,0.9)'
        })
      }),
      new Style({
        stroke: new Stroke({
          width: 4,
          color: 'white'
        })
      })
    ],
    source: routeSource
  });
  WguEventBus.$on('route-update', ({
    routeGeometry,
    startGeometry,
    endGeometry,
    stopsGeometry
  }) => {
    const featureProjection = map.getView().getProjection();
    const geojson = (new GeoJSON({ featureProjection }));

    [routeSource, startSource, endSource, stopsSource].forEach(s => s.clear());
    if (routeGeometry) {
      routeSource.addFeatures(geojson.readFeatures(routeGeometry));
    }
    if (startGeometry) {
      startSource.addFeatures(geojson.readFeatures(startGeometry));
    }
    if (endGeometry) {
      endSource.addFeatures(geojson.readFeatures(endGeometry));
    }
    if (stopsGeometry) {
      console.log(stopsGeometry);
      stopsSource.addFeatures(geojson.readFeatures(stopsGeometry));
    }
  });
  return [routeLayer, startLayer, endLayer, stopsLayer];
}
