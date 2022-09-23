<template>
  <div class="content">
    <p>Processing log in…</p>
  </div>
</template>

<script>
import { createLoginFinishEvent } from "@openlab/deconf-ui-toolkit";
import Vue from "vue";
import { homeRoute } from "../../../shallow_chVopy/lib.js";
import { authTokenKey } from "../lib.js";

// TODO: use official when moved from PDC

export default Vue.extend({
  name: "TokenCaptureV0",
  mounted() {
    this.processHash(window.location.hash);
  },
  methods: {
    async processHash(hash) {
      if (!hash || !hash.startsWith("#")) return;

      const params = new URLSearchParams(hash.slice(1));
      const authToken = params.get("token");
      if (!authToken) return;

      localStorage.setItem(authTokenKey, authToken);
      await this.$store.dispatch("api/authenticate", { token: authToken });

      this.$metrics.track(createLoginFinishEvent());

      this.$router.replace(homeRoute);
    },
  },
});
</script>
