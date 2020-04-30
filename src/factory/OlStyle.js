import { Circle as CircleStyle, Icon as IconStyle, Fill, Stroke, Style } from 'ol/style';
import { pinSvg } from './markerPin';

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
    if (styleConf.iconUrl) {
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
    const olStyle = new Style({
      stroke: OlStyleFactory.createStroke(styleConf)
    });

    return olStyle;
  },

  /**
   * Returns an OpenLayers style instance for polygons due to given config.
   *
   * @param  {Object} styleConf  Style config object
   * @return {Style}             OL style instance
   */
  createPolygonStyle (styleConf) {
    let olStyle = OlStyleFactory.createLineStyle(styleConf);
    olStyle.setFill(OlStyleFactory.createFill(styleConf));

    return olStyle;
  },

  /**
   * Creates an OL Stroke object due to given config.
   *
   * @param  {Object} styleConf Style config object
   * @return {Stroke}           OL Stroke instance
   */
  createStroke (styleConf) {
    return new Stroke({
      color: styleConf.strokeColor,
      width: styleConf.strokeWidth
    });
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
