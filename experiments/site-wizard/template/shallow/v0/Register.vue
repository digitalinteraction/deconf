<template>
  <p>Redirecting...</p>
</template>

<script>
import Vue from "vue";

import { appConfig } from "../lib.js";

export default Vue.extend({
  mounted() {
    if (!appConfig.register.redirect) {
      throw new Error("non-redirecting Registration is not available");
    }
    window.open(appConfig.register.redirect);
    this.$router.back();
  },
});
</script>
