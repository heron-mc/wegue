<template>
  <v-toolbar
    class="wgu-app-toolbar white--text"
    :color="color"
    :dark="dark"
    fixed
    app
    clipped-right
  >

    <!-- slot to inject components at the beginning (before title) -->
    <slot name="wgu-tb-start"></slot>

    <v-toolbar-title><span v-html="title"/></v-toolbar-title>

    <!-- slot to inject components after the title text -->
    <slot name="wgu-tb-after-title"></slot>

    <v-spacer></v-spacer>

    <!-- slot to inject components before the auto-generated buttons (by config) -->
    <slot name="wgu-tb-before-auto-buttons"></slot>

    <template v-for="(tbButton, index) in tbButtons">
      <component
        :is="tbButton.type"
        :key="index"
        :icon="tbButton.icon" :text="tbButton.text"
        :color="color"
        :dark="tbButton.dark"
        :active="tbButton.active"
        :toggleGroup="tbButton.toggleGroup"
      />
    </template>

    <!-- slot to inject components after the auto-generated buttons (by config) -->
    <slot name="wgu-tb-after-auto-buttons"></slot>

    <v-menu v-if="menuButtons.length" offset-y :close-on-content-click="menuCloseOnContentClick" :dark="dark">
      <v-btn icon bright slot="activator">
        <v-icon medium>menu</v-icon>
      </v-btn>
      <v-list>
          <template v-for="(tbButton, index) in menuButtons">
              <v-list-tile>
                <component
                  :is="tbButton.type"
                  :key="index"
                  :icon="tbButton.icon"
                  :color="color"
                  :text="tbButton.text"
                  :dark="tbButton.dark"
                  :active="tbButton.active"
                  :toggleGroup="tbButton.toggleGroup"
                />
              </v-list-tile>
          </template>
      </v-list>
    </v-menu>

    <!-- slot to inject components at the end of the toolbar (after menu) -->
    <slot name="wgu-tb-end"></slot>

  </v-toolbar>
</template>

<script>

import Vue from 'vue'
import LayerListToggleButton from '../../src/components/layerlist/ToggleButton'
import HelpWinToggleButton from '../../src/components/helpwin/ToggleButton'
import MeasureToolToggleButton from '../../src/components/measuretool/ToggleButton'
import InfoClickButton from '../../src/components/infoclick/ToggleButton'
import ShareButton from '../../src/components/sharebutton/ShareButton'
import ZoomToMaxExtentButton from '../../src/components/maxextentbutton/ZoomToMaxExtentButton'
import RoutingToggleButton from '../../src/components/routing/RoutingToggleButton'
import DownloadLayersButton from '../../src/components/downloadlayers/DownloadLayersButton'
import LanguageSelector from '../../src/components/language/LanguageSelector'
import SavePdfButton from '../../src/components/savepdf/SavePdfButton'
import Geocoder from '../../src/components/geocoder/Geocoder'

export default {
  name: 'wgu-app-header',
  components: {
    'wgu-share-btn': ShareButton,
    'wgu-geocoder-btn': Geocoder,
    'wgu-zoomtomaxextent-btn': ZoomToMaxExtentButton,
    'wgu-layerlist-btn': LayerListToggleButton,
    'wgu-helpwin-btn': HelpWinToggleButton,
    'wgu-measuretool-btn': MeasureToolToggleButton,
    'wgu-infoclick-btn': InfoClickButton,
    'wgu-language-btn': LanguageSelector,
    'wgu-routing-btn': RoutingToggleButton,
    'wgu-savepdf-btn': SavePdfButton,
    'wgu-downloadlayers-btn': DownloadLayersButton
  },
  props: {
    color: {type: String, required: false, default: 'red darken-3'},
    dark: {type: Boolean, required: false, default: true}
  },
  data () {
    return {
      menuCloseOnContentClick: this.noSubMenus(),
      title: this.$appConfig.title,
      menuButtons: this.getModuleButtonData() || [],
      tbButtons: this.getToolbarButtons() || [],
      subMenus: false
    }
  },
  methods: {
    smallScreen () {
      return window.innerWidth < 800;
    },
    noSubMenus () {
      return this.subMenus === false;
    },
    /**
     * Determines the module menu button configuration objects from app-config:
     *    menuButtons: [
     *      {type: 'wgu-layerlist-toggle-btn'},
     *      {type: 'wgu-helpwin-toggle-btn'},
     *      {type: 'wgu-measuretool-toggle-btn'}
     *    ]
     * @return {Array} module button configuration objects for the menu
     */
    getModuleButtonData () {
      const appConfig = Vue.prototype.$appConfig || {};
      const modulesConfs = appConfig.modules || {};
      let moduleButtons = [];
      for (const key of Object.keys(modulesConfs)) {
        const moduleOpts = appConfig.modules[key];
        // Remember if any of the Butoons has an in-place sub-menu/dropdown.
        if (moduleOpts.hasSubMenu === true) {
          this.subMenus = true;
        }
        if (moduleOpts.target === 'menu' || (moduleOpts.mobileTarget === 'menu' && this.smallScreen() === true)) {
          moduleButtons.push({
            type: key + '-btn',
            target: moduleOpts.target,
            dark: moduleOpts.darkLayout,
            active: moduleOpts.mobileActive !== undefined && window.innerWidth <= 800 ? moduleOpts.mobileActive : moduleOpts.active,
            toggleGroup: moduleOpts.toggleGroup
          });
        }
      }
      return moduleButtons;
    },
    /**
     * Determines the module toolbar button configuration objects from app-config:
     *    menuButtons: [
     *      {type: 'wgu-layerlist-toggle-btn'},
     *      {type: 'wgu-helpwin-toggle-btn'},
     *      {type: 'wgu-measuretool-toggle-btn'}
     *    ]
     * @return {Array} module button configuration objects for the toolbar
     */
    getToolbarButtons () {
      const appConfig = Vue.prototype.$appConfig || {};
      const modulesConfs = appConfig.modules || {};
      let moduleButtons = [];

      for (const key of Object.keys(modulesConfs)) {
        const moduleOpts = appConfig.modules[key];
        if (moduleOpts.target === 'toolbar' && !(moduleOpts.mobileTarget === 'menu' && this.smallScreen() === true)) {
          moduleButtons.push({
            type: key + '-btn',
            target: moduleOpts.target,
            dark: moduleOpts.darkLayout,
            active: moduleOpts.mobileActive !== undefined && window.innerWidth <= 800 ? moduleOpts.mobileActive : moduleOpts.active,
            toggleGroup: moduleOpts.toggleGroup
          });
        }
      }
      return moduleButtons;
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
</style>
