<template>
  <UtilLayout :home-route="homeRoute" width="regular">
    <BrandAsset slot="brand" :image="appConfig.branding.primary" />

    <!-- Is a slot for this needed? -->
    <template slot="backButton">
      <slot name="backButton">
        <BackButton :to="homeRoute">
          {{ $t("generic.general.backHome") }}
        </BackButton>
      </slot>
    </template>

    <!-- TODO: ... -->
    <!-- <LanguageControl slot="languageControl" /> -->

    <slot slot="main" />

    <PageFooter slot="footer" />
  </UtilLayout>
</template>

<script>
import Vue from "vue";
import { BackButton, UtilLayout } from "@openlab/deconf-ui-toolkit";

import BrandAsset from "./BrandAsset.vue";
import PageFooter from "./PageFooter.vue";
import { homeRoute, appConfig } from "../lib.js";

export default Vue.extend({
  name: "GenericUtilLayout",
  components: { BackButton, BrandAsset, PageFooter, UtilLayout },
  data() {
    return { homeRoute, appConfig };
  },
});
</script>

<style lang="scss">
.appLayout-fill {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  align-items: stretch;
}
.appLayout-fill > :not(.pageFooter) {
  flex: 1;
}
</style>
