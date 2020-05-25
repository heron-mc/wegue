// Note: you must create this file, following the format of routingConfig.js.example
import routingConfig from './routingConfig.js';
import axios from 'axios';
import flexpolyline from './flexpolyline';
import { flip, pad2, featureCollection, feature, point, lineString } from './routingUtils';

export async function getRouteV7 ({
  from,
  waypoints,
  to,
  transportMode,
  timeDate,
  locale
}) {
  const makeRequest = () => {
    let timeParam = {};
    let walkRadiusParam = {};
    if (transportMode.match(/publicTransport/)) {
      if (timeDate.time) {
        timeParam = {[timeDate.timeMode]: `${timeDate.date}T${timeDate.time}:00`};
      }
      walkRadiusParam = { walkRadius: 3000 }
    }
    const toGeo = point => `geo!${point.geometry.coordinates[1]},${point.geometry.coordinates[0]}`;
    const waypointParams = {
      waypoint0: toGeo(from)
    };
    waypoints.forEach((waypoint, i) => {
      waypointParams[`waypoint${i + 1}`] = toGeo(waypoint)
    });
    waypointParams[`waypoint${waypoints.length + 1}`] = toGeo(to);

    const mode = (transportMode === 'fastest;publicTransport' && timeDate.time ? 'fastest;publicTransportTimeTable' : transportMode);
    const language = locale.match(/de/) ? 'de-de' : locale;
    return axios.get(`https://route.ls.hereapi.com/routing/7.2/calculateroute.json`, {
      params: {
        apiKey: routingConfig.hereApiKey,
        ...waypointParams,
        mode,
        lineattributes: 'all',
        maneuverattributes: 'all', // TODO strip down to the ones we need.
        routeattributes: 'all',
        combineChange: true, // avoid separate "enter" and "leave" steps for interchanges
        ...timeParam,
        ...walkRadiusParam,
        language
      }
    });
  }

  function stopsGeometryFromRoute (route) {
    const stops = [];
    for (const leg of route.leg) {
      const newStops = leg.maneuver
        .filter(m => ['change', 'enter', 'leave'].indexOf(m.action) >= 0);
      newStops.forEach((m, i) => { m.changeId = i + 1; });
      stops.push(...newStops);
    }

    return featureCollection(stops.map(m =>
      feature({ changeId: m.changeId }, point([m.position.longitude, m.position.latitude]))))
  }

  function shapeToLineFeature (shape, maneuver) {
    return feature({
      type: maneuver._type,
      instruction: maneuver.instruction.replace(/(<([^>]+)>)/g, '')
    }, lineString(shape.map(coordString => flip(coordString.split(',').map(Number))))
    );
  }

  function routeGeometryFromRoute (route) {
    const fc = featureCollection([]);
    for (const leg of route.leg) {
      const lineFeatures = leg.maneuver
        .filter(m => m.shape.length > 1)
        .map(m => shapeToLineFeature(m.shape, m));
      fc.features.push(...lineFeatures);
    }
    return fc;
  }

  function addCumulativeTimes (leg) {
    let total = 0;
    for (const maneuver of leg.maneuver) {
      maneuver.cumulative = `${pad2(Math.floor(total / 3600))}:${pad2(Math.floor(total / 60) % 60)}`;
      total += (maneuver.travelTime || 0);
    }
  }

  let result;
  const ret = {};
  try {
    result = await makeRequest();
    const route = result.data.response.route[0];
    route.leg.forEach(addCumulativeTimes);
    ret.route = route;
    ret.boundingBox = [route.boundingBox.topLeft.longitude, route.boundingBox.bottomRight.latitude, route.boundingBox.bottomRight.longitude, route.boundingBox.topLeft.latitude];
    ret.routeGeometry = routeGeometryFromRoute(route);
    ret.stopsGeometry = stopsGeometryFromRoute(route);
  } catch (e) {
    console.log(e);
    console.log(e.response, e.response.status, e.response.responseText, e.response.data.subtype);
    if (e.response && e.response.status === 400 && e.response.data.subtype === 'NoRouteFound') {
      ret.errorMessage = 'No route was found.';
    } else if (e.response && e.response.data && e.response.data.details === 'Time Table Transit Routing is only supported for two StopOver waypoints') {
      ret.errorMessage = 'Sorry, you can specify a time, or multiple waypoints, but not both.';
    } else {
      ret.errorMessage = 'Sorry, directions are currently unavailable.'
    }
    if (e.response && e.response.data && e.response.data.details) {
      console.log(e.response.data.details, e.response.data.additionalData);
    }
  }
  return ret;
}

function polylineToGeoJSON (polyline) {
  const points = flexpolyline.decode(polyline).polyline
  return lineString(points.map(flip))
}

export async function getRouteV8 ({
  from,
  to,
  waypoints,
  transportMode,
  locale
}) {
  // https://developer.here.com/documentation/routing-api/api-reference-swagger.html
  // https://developer.here.com/documentation/routing/dev_guide/topics/resource-calculate-route.html

  const via = waypoints
    .filter(Boolean)
    .map(w => w.geometry.coordinates)
    .filter(Boolean)
    .map(flip)
    .map(c => c.join(','));

  const result = await axios.get(`https://router.hereapi.com/v8/routes`, {
    params: {
      transportMode: 'car',
      routingMode: transportMode.split('-')[1],
      origin: flip(from.geometry.coordinates).join(','),
      destination: flip(to.geometry.coordinates).join(','),
      ...(via ? { via } : {}),
      return: 'summary,polyline,instructions,actions',
      apiKey: routingConfig.hereApiKey,
      lang: locale
    },
    // the API wants &via=x,y&via=x,y whereas Axios by default provides &via[]=x,y&via[]=x,y
    paramsSerializer: params =>
      Object.keys(params)
        .map(key => {
          const vals = Array.isArray(params[key]) ? params[key] : [params[key]];
          return vals.map(val => `${key}=${val}`).join('&')
        }).join('&')
  });
  const route = result.data.routes[0]
  return {
    route,
    routeGeometry: {
      type: 'FeatureCollection',
      features: route.sections.map(section => polylineToGeoJSON(section.polyline))
    }
  }
}
