<i18n>
en:
  _untagged: Other
de:
  POIs: POIs
  Routes: Strecke
  Areas: Gebiete
  Categories: Kategorien
  Tags: Schlagworte
  _untagged: Weitere Kartenebenen
</i18n>
<template>
  <v-tabs
    :dark="dark"
    :sliderColor="sliderColor"
    grow
    :class="{'wgu-layer-list-tabs': true, 'wgu-layer-no-header': tabs.length < 2}"
  >
    <template v-for="tab of tabs">
      <v-tab :key="tab.title">
        {{ $t(tab.title) }}
      </v-tab>
      <v-tab-item :key="tab.title">
        <v-list>
          <v-treeview :items="tab.items" :load-children="tab.loadFunc" :open.sync="tab.unfolded" class="wgu-layer-treeview ">
            <template v-slot:prepend="{ item }">
              <input type="checkbox" :key="item.lid" class="wgu-layer-viz-cb" v-model="item.visible" @change="onItemChanged(item)">
                <img class="poi-icon" v-if="item.category === 'poi'" v-bind:src="item.icon" alt="POI Icon">
              <v-card v-if="item.category === 'route'"
                :style="{
                  borderTopColor: item.stroke.getColor(),
                  borderTopWidth: 3,
                  borderTopStyle: {'6,12':'dashed', '1,8': 'dotted', null: 'solid'}[item.stroke.getLineDash()] || 'dashed'
                }"
                width="30"
                height="4"
                class="mr-2"
              />
              <v-card v-if="item.category === 'area'"
                :style="{
                  background: item.fill.getColor(),
                  borderWidth: '3px',
                  borderStyle: {'6,12':'dashed', '1,8': 'dotted', null: 'solid'}[item.stroke.getLineDash()] || 'dashed',
                  borderColor: item.stroke.getColor()
                }"
                width="30"
                height="30"
                class="mr-2"
              />
            </template>
          </v-treeview>
        </v-list>
      </v-tab-item>
    </template>
  </v-tabs>

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
      tagsTitle: {type: String, required: false, default: 'Tags'},
      hideCategories: { type: Boolean, required: false, default: false },
      hideTags: { type: Boolean, required: false, default: false }
    },
    data () {
      return {
        categoryItems: [],
        tagItems: [],
        unfoldCategories: [],
        unfoldTags: new Set()
      }
    },
    computed: {
      categoriesTree () {
        return this.categoryItems
      },
      tagsTree () {
        return this.tagItems
      },
      tabs() {
        return [
          ...(this.hideTags ? [] : [{title: this.tagsTitle, items: this.tagsTree, loadFunc: this.fetchTagItems, unfolded: [...this.unfoldTags]}]),
          ...(this.hideCategories ? [] : [{title: this.categoriesTitle, items: this.categoriesTree, loadFunc: this.fetchCategoryItems, unfolded: [...this.unfoldCategories]}])
        ];
      }
    },
    methods: {
      /**
       * Executed after the map is bound (see mixins/Mapable)
       */
      onMapBound () {
        // Only render LayerList when Map fully rendered
        WguEventBus.$on('ol-map-rendered', evt => {
          this.createLayerItems();
          // React on added / removed layers
          this.map.getLayers().on('change:length', (evt) => {
            this.createLayerItems();
          });

          // React on changed Locale
          WguEventBus.$on('locale-changed', language => {
            this.$i18n.locale = language;
            this.createLayerItems();
          });
        });
      },
      /**
       * Creates single layer (tree) item from an OpenLayers Layer.
       */
      createLayerItem (layer, childId) {
        const layerId = layer.get('lid');
        const layerCategory = layerId.split('_')[0];
        let layerStyle = layer.getStyle && layer.getStyle();
        let icon; // , lineColor, fillColor;
        if (layerCategory === 'poi' && layerStyle) {
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
          stroke: layerStyle && layerStyle.getStroke && layerStyle.getStroke(),
          fill: layerStyle && layerStyle.getFill && layerStyle.getFill(),
          visible: layer.getVisible()
        };
      },
      /**
       * Creates the layer items from the OpenLayers map.
       */
      createLayerItems () {
        // Get applicable layers: displayInLayerList enabled and Vector Layers
        const layers = this.map.getLayers().getArray().slice(0).reverse().filter(
          l => l.get('displayInLayerList') === true);

        let nodeId = 0;
        function nextId () {
          return ++nodeId;
        }

        // Predefined Categories TODO make smarter
        const categoryItems = ['POIs', 'Routes', 'Areas']
          .map(category => ({
            id: nextId(),
            name: this.$i18n.t(category),
            lid: undefined,
            visible: false,
            children: []
          }));
        const getCategoryNode = type => categoryItems[{ route: 1, area: 2 }[type] || 0];
        // Tag defs come from the tags added to Layers
        let tagItems = [];
        this.unfoldTags = new Set();
        this.unfoldCategories = new Set();
        layers.forEach((layer, idx) => {
          const layerItem = this.createLayerItem(layer, nextId());

          // First add to Categories tree
          const categoryNode = getCategoryNode(layerItem.category);
          categoryNode.children.push(layerItem);
          if (layerItem['visible'] === true) {
            this.unfoldCategories.add(categoryNode['id'])
          }

          const tags = layerItem.tags || [this.$t('_untagged')];
          // One or more Tags avail: add to the Tags tree
          // Must be existing layer item: reuse for common visibility state
          tags.forEach((tag, idx) => {
            let tagNode = tagItems.find(tagItem => tagItem.name === tag);
            if (!tagNode) {
              // Create new tag parent node and push to tree
              tagNode = {
                id: nextId(),
                name: tag,
                lid: undefined,
                visible: false,
                children: []
              };
              tagItems.push(tagNode);
            }
            // Add LayerItem to TagNode
            tagNode.children.push(layerItem);
            if (layerItem['visible'] === true) {
              this.unfoldTags.add(tagNode['id'])
            }
          });
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

  /*.wgu-layer-list-card {*/
  /*  overflow: auto;*/
  /*  max-height: calc(100vh - 200px);*/
  /*}*/
  .wgu-layer-list-tabs {
    min-width: 360px;
    max-width: 420px;
  }
  .wgu-layer-viz-cb {
    width: 24px;
  }
  .wgu-layer-no-header .v-tabs__bar {
    display: none;
  }

  .wgu-layer-treeview .v-treeview-node__label {
    /* There's probably a better solution... */
    max-width: 220px;
  }

</style>
<style scoped>
  .poi-icon {
    margin-left:2px;
    margin-right:4px;
    width: 32px;
    height: 38px;
  }
</style>
