<template></template>

<script>
/* eslint-disable */

import Vue from 'vue';
import Map from 'ol/Map'
import View from 'ol/View'
import Attribution from 'ol/control/Attribution';
import Zoom from 'ol/control/Zoom';
import SelectInteraction from 'ol/interaction/Select';
import {defaults as defaultInteractions} from 'ol/interaction';
import RotateControl from 'ol/control/Rotate';
import Projection from 'ol/proj/Projection';
import {register as olproj4} from 'ol/proj/proj4';
import proj4 from 'proj4'
import Overlay from 'ol/Overlay';
// import the app-wide EventBus
import { WguEventBus } from '../../WguEventBus.js';
import { LayerFactory } from '../../factory/Layer.js';
import ColorUtil from '../../util/Color';
import PermalinkController from './PermalinkController';
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import GeoJSON from 'ol/format/GeoJSON';
import Feature from 'ol/Feature';
import LineString from 'ol/geom/LineString';
import { Style, Stroke, RegularShape, Fill, Text } from 'ol/style';
export default {
  name: 'wgu-map',
  props: {
    color: {type: String, required: false, default: 'red darken-3'},
    collapsibleAttribution: {type: Boolean, default: false},
    rotateableMap: {type: Boolean, required: false, default: false}
  },
  data () {
    return {
      zoom: this.$appConfig.mapZoom,
      center: this.$appConfig.mapCenter,
      projection: this.$appConfig.mapProjection,
      projectionObj: null,
      projectionDefs: this.$appConfig.projectionDefs,
      permalink: this.$appConfig.permalink
    }
  },
  mounted () {
    // Make the OL map accessible for Mapable mixin even 'ol-map-mounted' has
    // already been fired. Don not use directly in cmps, use Mapable instead.
    Vue.prototype.$map = this.map;
    // Send the event 'ol-map-mounted' with the OL map as payload
    WguEventBus.$emit('ol-map-mounted', this.map);

    // resize the map, so it fits to parent, may need to wait
    // until map container element is ready.
    const timer = setInterval(() => {
      const mapTarget = document.getElementById('ol-map-container');
      if (!mapTarget) {
        return;
      }
      clearInterval(timer);
      this.map.setTarget(mapTarget);
      this.map.updateSize();

      // adjust the bg color of the OL buttons (like zoom, rotate north, ...)
      this.setOlButtonColor();

      // initialize map hover functionality
      this.setupMapHover();
    }, 100);
  },
  async created () {
    // make map rotateable according to property
    const interactions = defaultInteractions({
      altShiftDragRotate: this.rotateableMap,
      pinchRotate: this.rotateableMap
    });
    let controls = [
      new Zoom(),
      new Attribution({
        collapsible: this.collapsibleAttribution
      })
    ];
    // add a button control to reset rotation to 0, if map is rotateable
    if (this.rotateableMap) {
      controls.push(new RotateControl());
    }

    // Optional projection (EPSG) definitions for Proj4
    if (this.projectionDefs) {
      // Add all (array of array)
      proj4.defs(this.projectionDefs);
      // Register with OpenLayers
      olproj4(proj4);
    }

    // Projection for Map, default is Web Mercator
    if (!this.projection) {
      this.projection = {code: 'EPSG:3857', units: 'm'}
    }

    this.map = new Map({
      layers: [],
      controls: controls,
      interactions: interactions,
      view: new View({
        center: this.center,
        zoom: this.zoom,
        projection: new Projection(this.projection)
      })
    });

    // create layers from config and add them to map
    const layers = await this.createLayers();
    this.map.getLayers().extend(layers);

    if (this.$appConfig.permalink) {
      this.permalinkController = this.createPermalinkController();
      this.map.set('permalinkcontroller', this.permalinkController, true);
      this.permalinkController.apply();
      this.permalinkController.setup();
    }
    window.map = this.map; //TODO remove
    const layers = await me.createLayers();
    me.map.getLayers().extend(layers);
  },

  methods: {
    /**
     * Creates the OL layers due to the "mapLayers" array in app config.
     * @return {ol.layer.Base[]} Array of OL layer instances
     */
    async createLayers () {
      const addInteraction = (layer) => {
        // if layer is selectable register a select interaction
        if (layer.get('selectable') === false) {
          return;
        }
        const selectClick = new SelectInteraction({
          layers: [layer],
          style: layer.get('styleSelected') || undefined
        });
        // forward an event if feature selection changes
        selectClick.on('select', function (evt) {
          // TODO use identifier for layer (once its implemented)
          WguEventBus.$emit(
            'map-selectionchange',
            layer.get('lid'),
            evt.selected,
            evt.deselected
          );
        });
        // register/activate interaction on map
        this.map.addInteraction(selectClick);
      };

      let layers = [];
      const mapLayersConfig = this.$appConfig.mapLayers;
      await Promise.all(mapLayersConfig.reverse().map(async lConf => {
        let layersToAdd = await LayerFactory.getInstance(lConf);
        // One layer definition can lead to several layer instances being created
        if (Array.isArray(layersToAdd)) {
          // Reverse like main config to have Layers added in right stacking order.
          layersToAdd = layersToAdd.reverse();
        } else {
          layersToAdd = [layersToAdd];
        }
        layersToAdd.forEach(layer => addInteraction(layer));
        layers.push(...layersToAdd);
      }));
      ;
      return [...layers, ...this.addRoutingLayers()];
      return this.addRoutingLayers();
    },
    addRoutingLayers () {
      const startSource = new VectorSource ({ });
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
      const endSource = new VectorSource ({ });
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

      const stopsSource = new VectorSource ({ });
      const labelStyle = new Style({
        text: new Text({
          font: 'bold 14px "Open Sans", "Arial Unicode MS", "sans-serif"',
          textAlign: 'left',
          offsetX: 10,
          //placement: point?
          fill: new Fill({ 
            color: 'white' 
          }),
          stroke: new Stroke({ 
            color: 'black',
            width: 2
          }),
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
        style: //[
          
          feature => {
            labelStyle.getText().setText(feature.get('name'));
            return [stopStyle, labelStyle];
          },
        // ],
        // ,
        source: stopsSource
      });

      const routeSource = new VectorSource ({ });
      const routeLayer = new VectorLayer({
        name: 'route',
        displayInLayerList: false,
        style: [
          new Style({
            stroke: new Stroke({
              width: 12,
              color: 'hsla(250,50%,20%,0.4)'
            }),
          }),
          new Style({
            stroke: new Stroke({
              width: 8,
              color: 'hsla(250,100%,20%,0.9)'
            }),
          }),
          new Style({
            stroke: new Stroke({
              width:4,
              color: 'white'
            }),

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
        const featureProjection = this.map.getView().getProjection();
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
    },

    /**
     * Creates a PermalinkController, override in subclass for specializations.
     *
     * @return {PermalinkController} PermalinkController instance.
     */
    createPermalinkController () {
      return new PermalinkController(this.map, this.$appConfig.permalink);
    },

    /**
     * Sets the background color of the OL buttons to the color property.
     */
    setOlButtonColor () {
      var me = this;

      if (ColorUtil.isCssColor(me.color)) {
        // directly apply the given CSS color
        if (document.querySelector('.ol-zoom')) {
          document.querySelector('.ol-zoom .ol-zoom-in').style.backgroundColor = me.color;
          document.querySelector('.ol-zoom .ol-zoom-out').style.backgroundColor = me.color;
        }
        if (document.querySelector('.ol-rotate')) {
          document.querySelector('.ol-rotate .ol-rotate-reset').style.backgroundColor = me.color;
        }
      } else {
        // apply vuetify color by transforming the color to the corresponding
        // CSS class (see https://vuetifyjs.com/en/framework/colors)
        const [colorName, colorModifier] = me.color.toString().trim().split(' ', 2);
        if (document.querySelector('.ol-zoom')) {
          document.querySelector('.ol-zoom .ol-zoom-in').classList.add(colorName);
          document.querySelector('.ol-zoom .ol-zoom-in').classList.add(colorModifier);
          document.querySelector('.ol-zoom .ol-zoom-out').classList.add(colorName);
          document.querySelector('.ol-zoom .ol-zoom-out').classList.add(colorModifier);
        }
        if (document.querySelector('.ol-rotate')) {
          document.querySelector('.ol-rotate .ol-rotate-reset').classList.add(colorName);
          document.querySelector('.ol-rotate .ol-rotate-reset').classList.add(colorModifier);
        }
      }
    },
    /**
     * Initializes the map hover functionality:
     * Adds a little tooltip like DOM element, wrapped as OL Overlay to the
     * map.
     * Registers a 'pointermove' event on the map and shows the layer's
     * 'hoverAttribute' if the layer is configured as 'hoverable'
     */
    setupMapHover () {
      const map = this.map;
      let overlayEl;

      // create a span to show map tooltip
      overlayEl = document.createElement('span');
      overlayEl.classList.add('wgu-hover-tooltiptext');
      map.getTarget().append(overlayEl);

      this.overlayEl = overlayEl;

      // wrap the tooltip span in a OL overlay and add it to map
      this.overlay = new Overlay({
        element: overlayEl,
        autoPan: true,
        autoPanAnimation: {
          duration: 250
        }
      });
      map.addOverlay(this.overlay);

      // show tooltip if a hoverable feature gets hit with the mouse
      map.on('pointermove', this.onPointerMove, this);
    },

    /**
     * Shows the hover tooltip on the map if an appropriate feature of a
     * 'hoverable' layer was hit with the mouse.
     *
     * @param  {Object} event The OL event for pointermove
     */
    onPointerMove (event) {
      const me = this;
      const map = me.map;
      const overlayEl = me.overlayEl;
      let hoverAttr;
      const features = map.getFeaturesAtPixel(event.pixel, {layerFilter: (layer) => {
        if (layer.get('hoverable')) {
          hoverAttr = layer.get('hoverAttribute');
        }
        return layer.get('hoverable');
      }});
      if (!features || features.length === 0 || !hoverAttr) {
        hoverAttr = null;
        overlayEl.innerHTML = null;
        me.overlay.setPosition(undefined);
        return;
      }
      const feature = features[0];
      var attr = feature.get(hoverAttr);
      overlayEl.innerHTML = attr;
      me.overlay.setPosition(event.coordinate);
    }
  }

}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
  div.ol-zoom {
    top: auto;
    left: auto;
    bottom: 3em;
    right: 0.5em;
  }

  div.ol-attribution.ol-uncollapsible {
    bottom: 12px;
    font-size: 10px;
  }

  /* Hover tooltip */
  .wgu-hover-tooltiptext {
    width: 120px;
    background-color: rgba(211, 211, 211, .9);
    color: #222;
    text-align: center;
    padding: 5px;
    border-radius: 6px;

    /* Position the hover tooltip */
    position: absolute;
    z-index: 1;
  }

</style>
