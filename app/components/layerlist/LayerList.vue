<template>

  <v-list>
    <v-treeview
            :items="items"
            :load-children="fetchItems"
            :open.sync="open"
          >
            <template v-slot:prepend="{ item }">
              <input type="checkbox" :key="item.lid" class="wgu-layer-viz-cb" v-model="item.visible" @change="layerVizChanged($event, item)">
<!--              <v-list-tile-content class="black&#45;&#45;text">-->
<!--                  <v-list-tile-title>{{ item.name }}</v-list-tile-title>-->
<!--              </v-list-tile-content>-->
              <v-list-tile-avatar>
                <img v-if="item.category === 'poi'" v-bind:src="item.icon" alt="POI Icon">
                <v-card v-if="item.category === 'route'"
                                  :style="{
                                    background: item.lineColor,
                                  }"
                                  width="30"
                                  height="4"
                                  class="mr-2"
                                />
                <v-card v-if="item.category === 'area'"
                                  :style="{
                                    background: item.fillColor,
                                    border: '3px solid',
                                    borderColor: item.lineColor
                                  }"
                                  width="30"
                                  height="30"
                                  class="mr-2"
                                />
              </v-list-tile-avatar>
            </template>
          </v-treeview>
<!--       <v-list-tile class="wgu-layerlist-item" v-for="layerItem in layerItems" v-bind:key="item.lid" @click="onItemClick($event, layerItem)">-->
<!--    </v-list-tile>-->
  </v-list>

</template>

<script>
  import { Mapable } from '../../../src/mixins/Mapable';
  import LayerUtil from '../../../src/util/Layer';

  export default {
    name: 'wgu-layerlist',
    mixins: [Mapable],
    props: {
    },
    data () {
      return {
        layerItems: [],
        categoryItems: [],
        open: [1],
        changeVisByClickUpdate: false
      }
    },
    computed: {
      items () {
        return this.categoryItems
      }
    },
    methods: {
      /**
       * Executed after the map is bound (see mixins/Mapable)
       */
      onMapBound () {
        this.createLayerItems();

        // react on added / removed layers
        this.map.getLayers().on('change:length', (evt) => {
          this.createLayerItems();
        });
      },
      /**
       * Creates the layer items from the OpenLayers map.
       */
      createLayerItems () {
        // go over all (reversed) layers from the map and list them up
        const layers = this.map.getLayers().getArray().slice(0).reverse();

        let items = [
          {
            id: 1,
            name: 'POIs',
            lid: undefined,
            children: [
            ]
          },
          {
            id: 15,
            name: 'Routes',
            lid: undefined,
            children: [
            ]
          },
          {
            id: 19,
            name: 'Areas',
            lid: undefined,
            children: [
            ]
          }];

        let categoryItems = items[0]['children'];
        layers.forEach((layer) => {
          // skip if layer should not be listed
          if (layer.get('displayInLayerList') === false) {
            return;
          }
          const layerId = layer.get('lid');
          const layerCategory = layerId.split('_')[0];
          let layerStyle = layer.getStyle();
          let icon, lineColor, fillColor;
          if (layerCategory === 'route') {
            lineColor = layerStyle.getStroke().getColor();
            categoryItems = items[1]['children'];
          } else if (layerCategory === 'area') {
            lineColor = layerStyle.getStroke().getColor();
            fillColor = layerStyle.getFill().getColor();
            categoryItems = items[2]['children'];
          } else if (layerCategory === 'poi') {
            if (Array.isArray(layerStyle)) {
              layerStyle = layerStyle[1];
            }
            icon = layerStyle.getImage().getSrc();
            categoryItems = items[0]['children'];
          }

          const layerItem = {
            id: categoryItems.length + 100,
            name: layer.get('name'),
            lid: layerId,
            category: layerCategory,
            icon: icon,
            lineColor: lineColor,
            fillColor: fillColor,
            visible: layer.getVisible()
          };

          categoryItems.push(layerItem);
          this.layerItems.push(layerItem);

          // synchronize visibility with UI when changed programatically
          layer.on('change:visible', (evt) => {
            this.onOlLayerVizChange(evt)
          });
        });

        this.categoryItems = items;
      },

      fetchItems () {
        return this.categoryItems;
      },

      /**
       * Handles the 'change:visible' event of the layer in order to
       * apply the current visibility state to the corresponding checkbox in
       * case the 'change:visible' wasn't triggered by click.
       *
       * @param  {ol/Object.ObjectEvent} evt The OL event of 'change:visible'
       */
      onOlLayerVizChange (evt) {
        if (!this.changeVisByClickUpdate) {
          this.layerItems.forEach((layerItem, idx) => {
            if (layerItem.lid === evt.target.get('lid')) {
              // execute click handler to change visibility
              this.onItemClick(null, layerItem);
            }
          });
        }
      },

      /**
       * Handler for click on item in layer list:
       * Toggles the corresponding visibility and calls this.layerVizChanged.
       *
       * @param  {Object} evt       Original vue click event
       * @param  {Object} layerItem Layer item data object
       */
      onItemClick (evt, layerItem) {
        layerItem.visible = !layerItem.visible;

        this.changeVisByClickUpdate = true;
        this.layerVizChanged();
        this.changeVisByClickUpdate = false;
      },

      /**
       * Handles the 'change' event of the visibility checkboxes in order to
       * apply the current visibility state in 'data' to the OL layers.
       */
      layerVizChanged (evt, item) {
        this.layerItems.forEach((layerItem, idx) => {
          const layer = LayerUtil.getLayerByLid(layerItem.lid, this.map);
          if (layer) {
            layer.setVisible(layerItem.visible);
          }
        });
      }
    }
  }
</script>

<style>

  .wgu-layer-viz-cb {
    width: 45px;
  }

</style>
