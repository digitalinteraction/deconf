<template>
  <img
    v-if="image"
    :src="assetUrl(image.url)"
    :width="image.width"
    :height="image.height"
  />
</template>

<script>
import Vue from "vue";
import { assetUrl } from "../lib.js";

export default Vue.extend({
  props: {
    image: { type: Object, required: true },
  },
  data() {
    return { assetUrl };
  },
});
</script>
