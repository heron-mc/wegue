import { Circle as CircleStyle, Icon as IconStyle, Fill, Stroke, Style } from 'ol/style';
import Point from 'ol/geom/Point';
import { pinSvg } from './markerPin';
import { splitLineString } from './splitLineString';

/**
 * Factory, which creates OpenLayers style instances according to a given config
 * object.
 * This only covers a minimal subset of the OpenLayers style capabilities.
 * It allows to create simple styles for points, line and polygons.
 * For advanced styling use a custom style function or
 * GeoStyler<https://github.com/terrestris/geostyler>
 */
export const OlStyleFactory = {

  /**
   * Returns an OpenLayers Style instance due to given config.
   *
   * @param  {Object} styleConf  Style config object
   * @return {Style}             OL Style instance
   */
  getInstance (styleConf) {
    if (!styleConf) {
      return;
    } else if (styleConf.radius || styleConf.iconUrl) {
      return OlStyleFactory.createPointStyle(styleConf);
    } else if (styleConf.fillColor) {
      return OlStyleFactory.createPolygonStyle(styleConf);
    } else if (styleConf.strokeColor || styleConf.strokeWidth) {
      return OlStyleFactory.createLineStyle(styleConf);
    }
  },

  /**
   * Returns an OpenLayers style instance for point due to given config.
   *
   * @param  {Object} styleConf  Style config object
   * @return {Style}             OL style instance
   */
  createPointStyle (styleConf) {
    let pointStyle;
    if (styleConf.iconUrl && styleConf.iconPlacement !== 'line') {
      // create a customised marker pin with the icon in it.
      const [anchorX, anchorY] = styleConf.iconAnchor || [0.5, 0.5];
      const svgImage = new Image();
      svgImage.src = pinSvg({ strokeColor: styleConf.color || 'blue' });
      const outer = new Style({
        image: new IconStyle(({
          img: svgImage,
          imgSize: [32, 32],
          anchor: [anchorX, anchorY - 0.2],
          anchorXUnits: styleConf.iconAnchorXUnits,
          anchorYUnits: styleConf.iconAnchorYUnits,
          crossOrigin: 'Anonymous'
        }))
      });
      const inner = new Style({
        image: new IconStyle(({
          src: styleConf.iconUrl,
          scale: styleConf.scale || 1,
          anchor: styleConf.iconAnchor,
          anchorXUnits: styleConf.iconAnchorXUnits,
          anchorYUnits: styleConf.iconAnchorYUnits,
          crossOrigin: 'Anonymous'
        }))
      });
      pointStyle = [outer, inner];
    } else {
      pointStyle = new Style({
        image: new CircleStyle({
          radius: styleConf.radius,
          fill: OlStyleFactory.createFill(styleConf),
          stroke: OlStyleFactory.createStroke(styleConf)
        })
      });
    }

    return pointStyle;
  },

  /**
   * Returns an OpenLayers style instance for lines due to given config.
   *
   * @param  {Object} styleConf  Style config object
   * @return {Style}             OL style instance
   */
  createLineStyle (styleConf) {
    const lineStyle = new Style({
      stroke: OlStyleFactory.createStroke(styleConf)
    });
    if (styleConf.iconPlacement === 'line' || styleConf.arrowColor /* to be removed */) {
      const compositeStyle = OlStyleFactory.createLineSymbols(styleConf, lineStyle);

      // we add the getStroke function so that it behaves more like a regular line, for LayerList etc.
      compositeStyle.getStroke = () => lineStyle.getStroke();
      return compositeStyle;
    } else {
      return lineStyle;
    }
  },

  /**
   * Returns an OpenLayers style instance for polygons due to given config.
   *
   * @param  {Object} styleConf  Style config object
   * @return {Style}             OL style instance
   */
  createPolygonStyle (styleConf) {
    let olStyle = new Style({ stroke: OlStyleFactory.createStroke(styleConf) }); // OlStyleFactory.createLineStyle(styleConf);
    olStyle.setFill(OlStyleFactory.createFill(styleConf));

    return olStyle;
  },

  createLineSymbols (styleConf = {}, lineStyle) {
    return function(feature, resolution) {
      const iconSpacing = styleConf.iconSpacing || 64;

      // can be used to only calculate icons within current area
      // const mapSize = window.map.getSize();
      // const extent = window.map.getView().calculateExtent([mapSize[0] + iconSpacing * 2, mapSize[1] + iconSpacing * 2]);

      const geometry = feature.getGeometry();
      const lineStrings = geometry.getType() === 'MultiLineString' ? geometry.getLineStrings() : [geometry];
      const splitPoints = [];
      for (const lineString of lineStrings) {
        splitPoints.push(...splitLineString(lineString, iconSpacing * resolution))
      }

      return [
        lineStyle,
        ...splitPoints.map(([x, y, rotation]) => new Style({
          geometry: new Point([x, y]),
          image: new IconStyle({
            src: styleConf.iconUrl || 'static/icon/arrow-up-thin-64.png',
            scale: styleConf.scale || 0.15,
            // for some reason opacity has no effect?
            rotation: styleConf.iconRotate === false ? 0 : rotation,
            crossOrigin: 'Anonymous'
          })
        }))
      ];
    }
  },

  /**
   * Creates an OL Stroke object due to given config.
   *
   * @param  {Object} styleConf Style config object
   * @return {Stroke}           OL Stroke instance
   */
  createStroke (styleConf) {
    const lineStyle = new Stroke({
      color: styleConf.strokeColor,
      width: styleConf.strokeWidth,
      lineDash: styleConf.strokeLineDash,
      lineDashOffset: styleConf.strokeLineDashOffset,
      lineCap: styleConf.strokeLineCap,
      lineJoin: styleConf.strokeLineJoin
    });
    return lineStyle;
  },

  /**
   * Creates an OL Fill object due to given config.
   *
   * @param  {Object} styleConf Style config object
   * @return {Fill}             OL Fill instance
   */
  createFill (styleConf) {
    return new Fill({
      color: styleConf.fillColor
    });
  }

}

