<template>
  <UtilLayout>
    <LoginView api-module="api">
      <Markdown :content="appConfig.login.text" />
      <p slot="doneText">
        {{ $t("deconf.login.doneText") }}
      </p>
    </LoginView>
  </UtilLayout>
</template>

<script>
import Vue from "vue";
import { LoginView } from "@openlab/deconf-ui-toolkit";
import UtilLayout from "../components/UtilLayout.vue";
import { appConfig } from "../lib.js";

export default Vue.extend({
  components: { UtilLayout, LoginView },
  data() {
    return { appConfig };
  },
});
</script>
