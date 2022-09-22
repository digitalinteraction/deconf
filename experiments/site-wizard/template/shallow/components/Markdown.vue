<template>
  <div class="content" v-html="html" />
</template>

<script>
import Vue from "vue";
import { marked } from "marked";
import { localise } from "../lib.js";

export default Vue.extend({
  props: {
    content: { type: Object, required: true },
  },
  computed: {
    html() {
      return marked(localise(this.content));
    },
  },
});
</script>
