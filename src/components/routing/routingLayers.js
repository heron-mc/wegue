import { WguEventBus } from '../../WguEventBus.js';
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON';
import LineString from 'ol/geom/LineString';
// import Feature from 'ol/Feature';
// import LineString from 'ol/geom/LineString';
import { Style, Stroke, RegularShape, Fill, Text } from 'ol/style';
export function routingLayers (routingOptions, map) {
  if (!routingOptions) {
    return;
  }
  const startLabel = routingOptions.startLabel || 'Start';
  const endLabel = routingOptions.endLabel || 'Finish';
  const stopsSource = new VectorSource({ });
  const labelStyle = new Style({
    text: new Text({
      font: 'bold 14px "Open Sans", "Arial Unicode MS", "sans-serif"',
      fill: new Fill({
        color: 'black'
      })
    })
  });

  const stopStyle = new Style({
    image: new RegularShape({
      fill: new Fill({ color: 'white' }),
      stroke: new Stroke({ color: 'black', width: 2 }),
      points: 20,
      radius: 10,
      angle: 0
    })
  });
  const stopsLayer = new VectorLayer({
    name: 'route-stops',
    displayInLayerList: false,
    style: feature => {
      labelStyle.getText().setText('' + feature.get('changeId'));
      // return [stopStyle]; // /* , labelStyle */
      return [stopStyle, labelStyle];
    },
    source: stopsSource
  });
  const endpointLabelStyle = new Style({
    text: new Text({
      font: 'bold 18px "Open Sans", "Arial Unicode MS", "sans-serif"',
      // offsetY: -15,
      textAlign: 'left',
      offsetX: 12,
      fill: new Fill({
        color: 'white'
      }),
      stroke: new Stroke({
        color: 'black',
        width: 2
      })
    })
  });
  const startSource = new VectorSource({ });
  const startLayer = new VectorLayer({
    name: 'route-start',
    displayInLayerList: false,
    style: feature => [
      new Style({
        image: new RegularShape({
          fill: new Fill({ color: 'hsl(120,80%,40%)' }),
          stroke: new Stroke({ color: 'black', width: 2 }),
          points: 40,
          radius: 10,
          angle: 3.14159 / 4
        })
      }),
      (endpointLabelStyle.getText().setText(startLabel), endpointLabelStyle)
    ],
    source: startSource
  });
  const endSource = new VectorSource({ });
  const endLayer = new VectorLayer({
    name: 'route-end',
    displayInLayerList: false,
    source: endSource,
    style: feature => [
      new Style({
        image: new RegularShape({
          fill: new Fill({ color: 'hsl(0,80%,40%)' }),
          stroke: new Stroke({ color: 'black', width: 2 }),
          points: 4,
          radius: 12,
          angle: 3.14159 / 4
        })
      }),
      (endpointLabelStyle.getText().setText(endLabel), endpointLabelStyle)
    ]
  });
  const waypointsSource = new VectorSource({ });
  const waypointsLayer = new VectorLayer({
    name: 'route-waypoints',
    displayInLayerList: false,
    source: waypointsSource,
    style: new Style({
      image: new RegularShape({
        fill: new Fill({ color: 'white' }),
        stroke: new Stroke({ color: 'black', width: 2 }),
        points: 40,
        radius: 6
      })
    })
  });
  const routeSource = new VectorSource({ });
  const routeLayer = new VectorLayer({
    name: 'route',
    displayInLayerList: false,
    style: feature => {
      if (feature.getProperties().type === 'PrivateTransportManeuverType') {
        return [
          new Style({
            stroke: new Stroke({
              width: 8,
              color: 'hsla(250,100%,20%,0.9)',
              lineDash: [2, 10]
            })
          }),
          new Style({
            stroke: new Stroke({
              width: 4,
              color: 'white',
              lineDash: [2, 10]
            })
          })
        ];
      } else {
        return [
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
        ]
      }
    },
    source: routeSource
  });
  WguEventBus.$on('route-update', ({
    routeGeometry,
    startGeometry,
    waypointsGeometry,
    endGeometry,
    stopsGeometry,
    boundingBox
  }) => {
    const featureProjection = map.getView().getProjection();
    const geojson = (new GeoJSON({ featureProjection }));

    [routeSource, startSource, waypointsSource, endSource, stopsSource].forEach(s => s.clear());
    if (routeGeometry) {
      routeSource.addFeatures(geojson.readFeatures(routeGeometry));
    }
    if (startGeometry) {
      startSource.addFeatures(geojson.readFeatures(startGeometry));
    }
    if (waypointsGeometry) {
      waypointsSource.addFeatures(geojson.readFeatures(waypointsGeometry));
    }
    if (endGeometry) {
      endSource.addFeatures(geojson.readFeatures(endGeometry));
    }
    if (stopsGeometry) {
      stopsSource.addFeatures(geojson.readFeatures(stopsGeometry));
    }
    if (boundingBox) {
      // map.zoomToExtent(new OpenLayers.Bounds(...boundingBox).transform('EPSG:4326', featureProjection);
      const line = new LineString([[boundingBox[0], boundingBox[1]], [boundingBox[2], boundingBox[3]]]);
      map.getView().fit(line.transform('EPSG:4326', featureProjection), {
        padding: [50, 80, 80, 350],
        maxZoom: 14
      });
    }
  });
  return [routeLayer, stopsLayer, startLayer, waypointsLayer, endLayer];
}
