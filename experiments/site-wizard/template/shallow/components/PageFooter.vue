<template>
  <div class="pageFooter">
    <p
      class="pageFooter-line"
      v-if="appConfig.footer.content"
      v-html="markdown(localise(appConfig.footer.content))"
    />

    <p class="pageFooter-line">
      <span v-for="(item, i) in appConfig.footer.links" :key="i">
        <a v-if="item.type === 'url'" :href="item.url.url">
          {{ localise(item.url.text) }}
        </a>
        <router-link v-if="item.type === 'page'" :to="{ name: item.page.id }">
          {{ localise(item.page.text) }}
        </router-link>
        <template v-if="i < appConfig.footer.links.length - 1"> / </template>
      </span>
    </p>

    <p class="pageFooter-line">
      Made by
      <a href="https://openlab.ncl.ac.uk/" target="_blank" rel="noopener">
        Open Lab
      </a>
      and
      <a href="https://github.com/digitalinteraction/deconf"> Open Source</a>
      /
      {{ env.APP_NAME }}
      {{ env.APP_VERSION }}
    </p>
  </div>
</template>

<script>
import { marked } from "marked";
import { appConfig, env, localise } from "../lib.js";
import { localiseFromObject } from "@openlab/deconf-ui-toolkit";

export default {
  data() {
    return { appConfig, localise, env };
  },
  computed: {
    localeContent() {
      return marked(localiseFromObject("en", appConfig.footer.content));
    },
  },
  methods: {
    markdown(str) {
      return marked(str);
    },
  },
};
</script>
