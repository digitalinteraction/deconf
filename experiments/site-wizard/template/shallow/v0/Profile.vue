<template>
  <UtilLayout>
    <ProfileView
      v-if="user && profile"
      api-module="api"
      :fields="fields"
      @logout="onLogout"
      @unregister="onUnregister"
    >
      <PrivateCalendarCreator slot="preActions" api-module="api" />
    </ProfileView>
  </UtilLayout>
</template>

<script>
import Vue from "vue";
import UtilLayout from "../components/UtilLayout.vue";
import {
  ProfileView,
  PrivateCalendarCreator,
  mapApiState,
} from "@openlab/deconf-ui-toolkit";
import { appConfig, authTokenKey, homeRoute } from "../lib.js";

export default Vue.extend({
  name: "ProfileV0",
  components: { UtilLayout, ProfileView, PrivateCalendarCreator },
  computed: {
    ...mapApiState("api", ["user", "profile"]),
    fields() {
      return [
        {
          label: this.$t("generic.profile.nameText"),
          value: this.profile.name,
        },
        {
          label: this.$t("generic.profile.emailText"),
          value: this.profile.email,
        },
        {
          label: this.$t("generic.profile.localeText"),
          value: this.getLanguage(this.user.user_lang),
        },
        {
          label: this.$t("generic.profile.registeredText"),
          value: this.profile.created.toLocaleString(),
        },
        {
          label: this.$t("generic.profile.whenText"),
          value: this.iatToString(this.user.iat),
        },
      ];
    },
  },
  mounted() {
    if (!this.user) {
      this.$router.replace(homeRoute);
      return;
    }
    this.fetchProfile();
  },
  methods: {
    async fetchProfile() {
      await this.$store.dispatch("api/fetchProfile");
      if (!this.profile) this.onLogout();
    },
    onLogout() {
      localStorage.removeItem(authTokenKey);
      setTimeout(() => window.location.reload(), 500);
    },
    onUnregister() {
      // TODO: ...
    },
    iatToString(iat) {
      const date = new Date(iat * 1000);
      date.setMinutes(
        date.getMinutes() + date.getTimezoneOffset(),
        date.getSeconds(),
        date.getMilliseconds()
      );

      return date.toLocaleString();
    },
    getLanguage(locale) {
      return appConfig.languages.available.find((l) => l.key === locale)?.name;
    },
  },
});
</script>
