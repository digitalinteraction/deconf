<template>
  <AppLayout v-if="session">
    <SessionView
      api-module="api"
      :session="session"
      :schedule="schedule"
      :logged-in="Boolean(user)"
      :schedule-date="scheduleDate"
    >
      <BackButton slot="backButton" :to="backRoute">
        {{ backText }}
      </BackButton>

      <Markdown slot="content" :content="session.content" />
    </SessionView>
  </AppLayout>
</template>

<script>
import Vue from "vue";
import AppLayout from "../components/AppLayout.vue";
import Markdown from "../components/Markdown.vue";
import {
  mapApiState,
  BackButton,
  SessionView,
} from "@openlab/deconf-ui-toolkit";

export default Vue.extend({
  components: { AppLayout, BackButton, Markdown, SessionView },
  props: {
    page: { type: Object, required: true },
    sessionId: { type: String, required: true },
  },
  computed: {
    ...mapApiState("api", ["schedule", "user"]),
    backRoute() {
      return { name: this.page.id };
    },
    session() {
      return (
        this.schedule?.sessions.find((s) => s.id === this.sessionId) ?? null
      );
    },
    scheduleDate() {
      return this.$dev.scheduleDate ?? this.$temporal.date;
    },
    backText() {
      // TODO: pull from "page" config ?
      return this.$t("generic.general.back");
    },
  },
});
</script>
