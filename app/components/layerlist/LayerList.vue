<i18n>
en:
  Natur: Nature
de:
  POIs: POIs
  Routes: Strecke
  Areas: Gebiete
  Categories: Kategorien
  Tags: Schlagworte
</i18n>
<template>
  <v-card class="wgu-layer-list-card">
    <v-tabs
      :dark="dark"
      :sliderColor="sliderColor"
      grow
      class="wgu-layer-list-tabs"
    >
      <v-tab>
        {{ $t(categoriesTitle) }}
      </v-tab>
      <v-tab-item>
        <v-list>
          <v-treeview :items="categoriesTree" :load-children="fetchCategoryItems" :open.sync="unfoldCategories">
            <template v-slot:prepend="{ item }">
              <input type="checkbox" :key="item.lid" class="wgu-layer-viz-cb" v-model="item.visible" @change="onItemChanged(item)">
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
                   :open.sync="unfoldTags"
                 >
                   <template v-slot:prepend="{ item }">
                     <input type="checkbox" :key="item.lid" class="wgu-layer-viz-cb" v-model="item.visible" @change="onItemChanged(item)">
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
  </v-card>

</template>

<script>
  import { Mapable } from '../../../src/mixins/Mapable';
  import LayerUtil from '../../../src/util/Layer';
  import {WguEventBus} from '../../../src/WguEventBus';

  export default {
    name: 'wgu-layerlist',
    mixins: [Mapable],
    props: {
      dark: {type: Boolean, required: false, default: false},
      sliderColor: {type: String, required: false, default: 'grey'},
      categoriesTitle: {type: String, required: false, default: 'Categories'},
      tagsTitle: {type: String, required: false, default: 'Tags'}
    },
    data () {
      return {
        categoryItems: [],
        tagItems: [],
        unfoldCategories: [],
        unfoldTags: []
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
        WguEventBus.$on('locale-changed', language => {
          this.$i18n.locale = language;
          this.createLayerItems();
        });
      },
      /**
       * Creates single layer (tree) item from an OpenLayers Layer.
       */
      createLayerItem (layer, childId) {
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
          id: childId,
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
        // Get applicable layers: displayInLayerList enabled and Vector Layers
        const layers = this.map.getLayers().getArray().slice(0).reverse().filter(
          l => l.get('displayInLayerList') !== false && l.getSource().getFeatures);

        let nodeId = 0;
        function nextId () {
          return ++nodeId;
        }

        // Predefined Categories TODO make smarter
        let categoryItems = [
          {
            id: nextId(),
            name: this.$i18n.t('POIs'),
            lid: undefined,
            visible: false,
            children: [
            ]
          },
          {
            id: nextId(),
            name: this.$i18n.t('Routes'),
            lid: undefined,
            visible: false,
            children: [
            ]
          },
          {
            id: nextId(),
            name: this.$i18n.t('Areas'),
            lid: undefined,
            visible: false,
            children: [
            ]
          }];

        // Tag defs come from the tags added to Layers
        let tagItems = [];

        layers.forEach((layer, idx) => {
          let layerItem = this.createLayerItem(layer, nextId());

          // First add to Categories tree
          const layerCategory = layerItem.category;
          let categoryNode = categoryItems[0];
          if (layerCategory === 'route') {
            categoryNode = categoryItems[1];
          } else if (layerCategory === 'area') {
            categoryNode = categoryItems[2];
          }
          categoryNode.children.push(layerItem);

          // Skip if no tags present for layer
          if (!layerItem.tags) {
            return;
          }

          // One or more Tags avail: add to the Tags tree
          // Must be existing layer item: reuse for common visibility state
          const tags = layerItem.tags;
          tags.forEach((tagRaw, idx) => {
            const tag = this.$t(tagRaw);

            const tagNode = tagItems.find(tagItem => tagItem.name === tag);
            if (!tagNode) {
              // Create new tag parent node
              tagItems.push({
                id: nextId(),
                name: tag,
                lid: undefined,
                visible: false,
                children: [layerItem]
              });
            } else {
              tagNode.children.push(layerItem)
            }
          });
        });

        this.categoryItems = categoryItems;
        this.tagItems = tagItems;
        // Unfold the first item folders
        this.unfoldTags = this.tagItems.length > 0 ? [this.tagItems[0]['id']] : [];
        this.unfoldCategories = [this.categoryItems[0]['id']];
      },

      fetchCategoryItems () {
        return this.categoryItems;
      },

      fetchTagItems () {
        return this.tagItems;
      },

      /**
       * Handles the 'change' event of the visibility checkboxes in order to
       * apply the current visibility state in 'data' to the OL layers, recursive.
       */
      onItemChanged (item) {
        if (!item.children) {
          // Child node clicked or changed via parent
          const layer = LayerUtil.getLayerByLid(item.lid, this.map);
          if (layer) {
            layer.setVisible(item.visible);
          }
          return
        }
        // Parent node clicked
        item.children.forEach((child, idx) => {
          child.visible = item.visible;
          this.onItemChanged(child)
        });
      }
    }
  }
</script>

<style>

  .wgu-layer-list-card {
    overflow: auto;
    max-height: calc(100vh - 200px);
  }
  .wgu-layer-list-tabs {
    min-width: 360px;
    max-width: 420px;
  }
  .wgu-layer-viz-cb {
    width: 24px;
  }

</style>
