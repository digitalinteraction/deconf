<template>
  <GenericAppLayout>
    <div class="contentV0">
      <section class="section">
        <div class="container">
          <BoxContent>
            <div class="content" v-html="localeContent" />
          </BoxContent>
        </div>
      </section>
    </div>
  </GenericAppLayout>
</template>

<script>
import Vue from "vue";
import GenericAppLayout from "../components/GenericAppLayout.vue";
import { BoxContent } from "@openlab/deconf-ui-toolkit";
import { marked } from "marked";

import { localise } from "../lib.js";

export default Vue.extend({
  name: "ContentV0View",
  components: { GenericAppLayout, BoxContent },
  props: {
    content: { type: Object, required: true },
  },
  computed: {
    localeContent() {
      return marked(localise(this.content));
    },
  },
  methods: {
    marked(str) {
      return marked(str);
    },
  },
});
</script>

<style lang="scss">
.contentV0 {
  background: #f5f5f5;
}
.contentV0 .boxContent {
  max-width: 720px;
  margin-inline: auto;
}
</style>
