export function flip ([a, b]) {
  return [b, a];
}

export function pad2 (x) {
  return ('0' + x).slice(-2);
}

export function feature (properties, geometry) {
  return {
    type: 'Feature',
    properties,
    geometry
  }
}

export function featureCollection (features) {
  return {
    type: 'FeatureCollection',
    features
  }
}

export function point (coordinates) {
  return {
    type: 'Point',
    coordinates
  }
}

export function lineString (coordinates) {
  return {
    type: 'LineString',
    coordinates
  }
}
