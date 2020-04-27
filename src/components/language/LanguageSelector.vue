<template>
  <div>
  <!-- <v-icon medium>flag</v-icon> -->
  <v-select class="selector" prepend-icon="flag" :items="items" v-model="language" :dark="dark" min-width="1" flat>
    <template v-slot:selection="{ item, index }">
      {{ item.value.toUpperCase() }}
    </template>
  </v-select>
  </div>
  <!-- <v-btn @click="toggleUi">
    <v-icon medium>flag</v-icon>
    {{ language }}
  </v-btn> -->

</template>

<script>
import { WguEventBus } from '../../WguEventBus'

export default {
  name: 'wgu-language-btn',
  props: {
    dark: {type: Boolean, required: false, default: false},
    color: { type: String }
  },
  data: function () {
    return {
      language: this.$i18n.locale,
      state: false
    }
  },
  created () {
    window.LanguageButton = this;
  },
  computed: {
    items () {
      return [{ text: 'English', value: 'en' }, { text: 'German', value: 'de' }];
    }
  },
  watch: {
    language () {
      this.$i18n.locale = this.language;
      WguEventBus.$emit('locale-changed', this.language);
    }
  },
  methods: {
    toggleUi () {
      this.state = !this.state;
      WguEventBus.$emit('toggle-routing-panel', this.state);
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
.selector {
  width: 6em;
  padding-top: 20px;
  padding-left:1em;
}

.v-input__slot {
  /* width: 0; */
}

.v-input {
  flex-grow: 0;
  /* flex-basis: 40px; */
}

.v-text-field > .v-input__control > .v-input__slot::before {
  border-style: none;
}

</style>
