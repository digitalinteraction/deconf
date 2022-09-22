<template>
  <div class="pageFooter">
    <Markdown
      class="pageFooter-line"
      v-if="appConfig.footer.content"
      :content="appConfig.footer.content"
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
import Vue from "vue";
import { appConfig, env, localise } from "../lib.js";
import Markdown from "./Markdown.vue";

export default Vue.extend({
  components: { Markdown },
  data() {
    return { appConfig, localise, env };
  },
});
</script>
