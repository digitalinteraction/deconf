<template>
  <PageFooter>
    <div
      slot="beforeLinks"
      v-if="appConfig.footer.content"
      v-html="marked(localise(appConfig.footer.content))"
    />
  </PageFooter>
</template>

<script>
import marked from "marked";
import { appConfig } from "../config.js";
import { PageFooter, localiseFromObject } from "@openlab/deconf-ui-toolkit";

export default {
  components: { PageFooter },
  data() {
    return { appConfig };
  },
  computed: {
    localeContent() {
      return marked(localiseFromObject("en", appConfig.footer.content));
    },
    localeLinks() {
      return appConfig.footer.links.map((link) => ({}));
    },
  },
  methods: {
    localise(input) {
      // TODO: i18n stuff
      return localiseFromObject("en", input);
    },
  },
};
</script>
