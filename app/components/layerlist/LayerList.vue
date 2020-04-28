<i18n>
de:
  POIs: POIs
  Routes: Strecke
  Areas: Gebiete
  Categories: Kategorien
  Tags: Tags
</i18n>
<template>
  <div>
    <v-tabs
      dark
      slider-color="grey"
    >
      <v-tab>
        {{ $t(categoriesTitle) }}
      </v-tab>
      <v-tab-item>
        <v-list>
          <v-treeview :items="categoriesTree" :load-children="fetchCategoryItems" :open.sync="open">
            <template v-slot:prepend="{ item }">
              <input type="checkbox" :key="item.lid" class="wgu-layer-viz-cb" v-model="item.visible" @change="layerVizChanged(item)">
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
            </template>
          </v-treeview>
        </v-list>
      </v-tab-item>
      <v-tab>
        {{ $t(tagsTitle) }}
      </v-tab>
      <v-tab-item>
        <v-list>
           <v-treeview
                   :items="tagsTree"
                   :load-children="fetchTagItems"
                   :open.sync="open"
                 >
                   <template v-slot:prepend="{ item }">
                     <input type="checkbox" :key="item.lid" class="wgu-layer-viz-cb" v-model="item.visible" @change="layerVizChanged(item)">
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
                   </template>
                 </v-treeview>
         </v-list>
      </v-tab-item>
    </v-tabs>
  </div>

</template>

<script>
  import { Mapable } from '../../../src/mixins/Mapable';
  import LayerUtil from '../../../src/util/Layer';

  export default {
    name: 'wgu-layerlist',
    mixins: [Mapable],
    props: {
      categoriesTitle: {type: String, required: false, default: 'Categories'},
      tagsTitle: {type: String, required: false, default: 'Tags'}
    },
    data () {
      return {
        layerItems: [],
        categoryItems: [],
        tagItems: [],
        open: [1],
        changeVisByClickUpdate: false
      }
    },
    computed: {
      categoriesTree () {
        return this.categoryItems
      },
      tagsTree () {
        return this.tagItems
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
       * Creates single layer item from an OpenLayers Layer.
       */
      createLayerItem (layer) {
        const layerId = layer.get('lid');
        const layerCategory = layerId.split('_')[0];
        let layerStyle = layer.getStyle();
        let icon, lineColor, fillColor;
        if (layerCategory === 'route') {
          lineColor = layerStyle.getStroke().getColor();
        } else if (layerCategory === 'area') {
          lineColor = layerStyle.getStroke().getColor();
          fillColor = layerStyle.getFill().getColor();
        } else if (layerCategory === 'poi') {
          if (Array.isArray(layerStyle)) {
            layerStyle = layerStyle[1];
          }
          icon = layerStyle.getImage().getSrc();
        }

        return {
          id: -1,
          name: layer.get('name'),
          lid: layerId,
          category: layerCategory,
          tags: layer.get('tags'),
          icon: icon,
          lineColor: lineColor,
          fillColor: fillColor,
          visible: layer.getVisible()
        };
      },
      /**
       * Creates the layer items from the OpenLayers map.
       */
      createLayerItems () {
        // go over all (reversed) layers from the map and list them up
        const layers = this.map.getLayers().getArray().slice(0).reverse();

        // Predefined Categories
        let categoryItems = [
          {
            id: 1,
            name: 'POIs',
            lid: undefined,
            children: [
            ]
          },
          {
            id: 20,
            name: 'Routes',
            lid: undefined,
            children: [
            ]
          },
          {
            id: 30,
            name: 'Areas',
            lid: undefined,
            children: [
            ]
          }];

        // Tag defs come from the tags added to Layers
        let tagItems = [];
        let nextId = 4;
        layers.forEach((layer, idx) => {
          // skip if layer should not be listed
          if (layer.get('displayInLayerList') === false) {
            return;
          }
          let layerItem = this.createLayerItem(layer);
          layerItem.id = nextId;
          nextId += 1;
          // First add to Categories tree
          const layerCategory = layerItem.category;
          let categoryNode = categoryItems[0]['children'];
          if (layerCategory === 'route') {
            categoryNode = categoryItems[1]['children'];
          } else if (layerCategory === 'area') {
            categoryNode = categoryItems[2]['children'];
          }
          categoryNode.push(layerItem);

          // Skip if no tags
          if (!layerItem.tags) {
            return;
          }

          // One or more Tags avail: add to the Tags tree
          layerItem = this.createLayerItem(layer);
          layerItem.id = nextId;
          nextId += 1;
          const tags = layerItem.tags;
          tags.forEach((tag, idx) => {
            let tagNode;
            tagItems.forEach((tagItem, idx) => {
              if (tagItem.name === 'tag') {
                tagNode = tagItem;
              }
            });

            if (!tagNode) {
              tagNode = {
                id: nextId,
                name: tag,
                lid: undefined,
                children: [
                ]
              };
              tagItems.push(tagNode)
              nextId += 1;
            }
            tagNode = tagNode.children.push(layerItem)
          });

          this.layerItems.push(layerItem);

          // synchronize visibility with UI when changed programatically
          // layer.on('change:visible', (evt) => {
          //   this.onOlLayerVizChange(evt)
          // });
        });

        this.categoryItems = categoryItems;
        this.tagItems = tagItems;
      },

      fetchCategoryItems () {
        return this.categoryItems;
      },

      fetchTagItems () {
        return this.tagItems;
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
      layerVizChanged (item) {
        if (item && item.children) {
          item.children.forEach((item, idx) => {
            this.onItemClick(null, item)
          });
          return;
        }
        this.layerItems.forEach((item, idx) => {
          const layer = LayerUtil.getLayerByLid(item.lid, this.map);
          if (layer) {
            layer.setVisible(item.visible);
          }
        });
      }
    }
  }
</script>

<style>

  .wgu-layer-viz-cb {
    width: 24px;
  }

</style>
