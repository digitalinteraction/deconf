<template>
  <img
    v-if="image"
    :src="image.url"
    :width="image.width"
    :height="image.height"
  />
</template>

<script>
import Vue from "vue";

export default Vue.extend({
  props: {
    image: { type: Object, required: true },
  },
});
</script>
