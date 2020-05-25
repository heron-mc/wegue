import { containsCoordinate } from 'ol/extent'
// adapted from https://gis.stackexchange.com/questions/306976/add-image-along-the-linestring
// returns a set of points spaced along a line, for symbol placement.
// options:
//   alwaysUp: don't rotate symbols
//   extent: area within which to operate
//   midPoints: place symbols only at midpoints, not along the whole way.
export function splitLineString(geometry, minSegmentLength, options = {}) {
  function calculatePointsDistance(coord1, coord2) {
    const dx = coord1[0] - coord2[0];
    const dy = coord1[1] - coord2[1];
    return Math.sqrt(dx * dx + dy * dy);
  };

  function calculateSplitPointCoords(startNode, nextNode, distanceBetweenNodes, distanceToSplitPoint) {
    const d = distanceToSplitPoint / distanceBetweenNodes;
    const x = nextNode[0] + (startNode[0] - nextNode[0]) * d;
    const y = nextNode[1] + (startNode[1] - nextNode[1]) * d;
    return [x, y];
  };

  function calculateAngle(startNode, nextNode, alwaysUp) {
    const x = (startNode[0] - nextNode[0]);
    const y = (startNode[1] - nextNode[1]);
    const angle = Math.atan(x / y);
    const offset = y > 0 ? Math.PI : x < 0 ? Math.PI * 2 : 0;
    return alwaysUp ? angle : angle + offset;
  };

  const splitPoints = [];
  const coords = geometry.getCoordinates();

  let coordIndex = 0;

  let [startPoint, nextPoint] = coords.slice(coordIndex, coordIndex + 2);
  let angle = calculateAngle(startPoint, nextPoint, options.alwaysUp);

  const n = Math.ceil(geometry.getLength() / minSegmentLength);
  const segmentLength = geometry.getLength() / n;
  let currentSegmentLength = options.midPoints ? segmentLength / 2 : segmentLength;

  for (let i = 0; i <= n; i++) {
    const distanceBetweenPoints = calculatePointsDistance(startPoint, nextPoint);
    currentSegmentLength += distanceBetweenPoints;

    if (currentSegmentLength < segmentLength) {
      coordIndex++;
      if (coordIndex < coords.length - 1) {
        [startPoint, nextPoint] = coords.slice(coordIndex, coordIndex + 2);
        angle = calculateAngle(startPoint, nextPoint, options.alwaysUp);
        i--;
        continue;
      } else {
        if (!options.midPoints) {
          const splitPointCoords = nextPoint;
          if (!options.extent || containsCoordinate(options.extent, splitPointCoords)) {
            splitPointCoords.push(angle);
            splitPoints.push(splitPointCoords);
          }
        }
        break;
      }
    } else {
      const distanceToSplitPoint = currentSegmentLength - segmentLength;
      const splitPointCoords = calculateSplitPointCoords(startPoint, nextPoint, distanceBetweenPoints, distanceToSplitPoint);
      startPoint = splitPointCoords.slice();
      if (!options.extent || containsCoordinate(options.extent, splitPointCoords)) {
        splitPointCoords.push(angle);
        splitPoints.push(splitPointCoords);
      }
      currentSegmentLength = 0;
    }
  }

  return splitPoints;
};
