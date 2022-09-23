<template>
  <UtilLayout>
    <LoginView api-module="api">
      <Markdown slot="infoText" :content="appConfig.login.text" />
      <p slot="doneText">
        {{ $t("deconf.login.doneText") }}
      </p>
    </LoginView>
  </UtilLayout>
</template>

<script>
import Vue from "vue";
import { LoginView } from "@openlab/deconf-ui-toolkit";
import Markdown from "../components/Markdown.vue";
import UtilLayout from "../components/UtilLayout.vue";
import { appConfig } from "../lib.js";

export default Vue.extend({
  components: { UtilLayout, LoginView, Markdown },
  data() {
    return { appConfig };
  },
});
</script>
