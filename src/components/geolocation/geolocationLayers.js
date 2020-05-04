import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Style, Fill, Stroke, RegularShape } from 'ol/style';
import Geolocation from 'ol/Geolocation';
import Point from 'ol/geom/Point';
import Feature from 'ol/Feature';

export function geolocationLayers (options = {}, map) {
  const {
    enabled,
    locationFillColor = 'hsla(200, 70%, 60%, 0.5)',
    locationStrokeColor = 'hsl(200, 70%, 40%)',
    accuracyFillColor = 'hsla(200, 70%, 80%, 0.1)',
    accuracyStrokeColor = 'hsla(200, 70%, 40%, 0.5)'
  } = options;
  if (!enabled) {
    return [];
  }

  const locationSource = new VectorSource();

  const locationLayer = new VectorLayer({
    name: 'geolocation',
    displayInLayerList: false,
    style: new Style({
      image: new RegularShape({
        fill: new Fill({ color: locationFillColor }),
        stroke: new Stroke({ color: locationStrokeColor, width: 2 }),
        points: 16,
        radius: 5
      })
    }),
    source: locationSource
  });

  const accuracySource = new VectorSource();
  const accuracyLayer = new VectorLayer({
    name: 'geolocation-accuracy',
    displayInLayerList: false,
    style: new Style({
      fill: new Fill({ color: accuracyFillColor }),
      stroke: new Stroke({ color: accuracyStrokeColor, width: 1 })
    }),
    source: accuracySource
  });
  const geolocation = new Geolocation({
    projection: map.getView().getProjection(),
    tracking: true
  });
  let locationFeature, accuracyFeature;

  geolocation.on('change', e => {
    const coordinates = geolocation.getPosition();
    if (!locationFeature) {
      locationFeature = new Feature(new Point(coordinates));
      locationSource.addFeature(locationFeature);
      accuracyFeature = new Feature(geolocation.getAccuracyGeometry());
      accuracySource.addFeature(accuracyFeature);
    } else {
      locationFeature.getGeometry().setCoordinates(coordinates);
      accuracyFeature.setGeometry(geolocation.getAccuracyGeometry());
    }
  });

  return [locationLayer, accuracyLayer];
}
