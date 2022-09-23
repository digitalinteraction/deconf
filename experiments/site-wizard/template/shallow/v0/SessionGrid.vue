<template>
  <AppLayout>
    <WhatsOnView
      :schedule="filteredSchedule"
      :sessions="filteredSessions"
      :filters-key="options.filtersKey"
      :enabled-filters="options.enabledFilters"
      :config="options.scheduleConfig"
      slot-state="future"
      :language-options="options.languages"
      :url-filters="urlFilters"
      @filter="onFilter"
      :readonly="readonly"
    >
      <span slot="title">{{ localise(page.sessionGrid.title) }}</span>
      <Markdown slot="info" :content="page.sessionGrid.info" />
      <Markdown slot="noResults" :content="page.sessionGrid.empty" />
    </WhatsOnView>
  </AppLayout>
</template>

<script>
import {
  WhatsOnView,
  mapApiState,
  decodeUrlScheduleFilters,
  filterScheduleFromSessions,
} from "@openlab/deconf-ui-toolkit";
import Vue from "vue";
import AppLayout from "../components/AppLayout.vue";
import Markdown from "../components/Markdown.vue";
import { guardPage, localise, scheduleOptions } from "../lib.js";

// TODO:
// - a new FilteredWhatsOnView type component
// - what to do with "slot-state"
// - what to do with "readonly"

export default Vue.extend({
  name: "SessionGridV0",
  components: { AppLayout, WhatsOnView, Markdown },
  props: {
    page: { type: Object, required: true },
  },
  data() {
    const readonly = false;
    const options = scheduleOptions(this.page, this.page.sessionGrid);
    const urlFilters = decodeUrlScheduleFilters(this.$route.query);
    return { localise, options, urlFilters, readonly };
  },
  computed: {
    ...mapApiState("api", ["user", "schedule", "userSessions"]),
    scheduleDate() {
      return this.$dev?.scheduleDate ?? this.$temporal.date;
    },
    filteredSessions() {
      return (
        this.schedule?.sessions.filter((s) => this.options.predicate(s)) ?? []
      );
    },
    filteredSchedule() {
      if (!this.schedule) return null;
      return filterScheduleFromSessions(this.schedule, this.filteredSessions);
    },
  },
  created() {
    // TODO: test this
    guardPage(this.page, this.user, this.$router);
  },
  methods: {
    onFilter(query) {
      this.$router.replace({ query });
    },
  },
});
</script>
