<template>
  <AppLayout>
    <FilteredScheduleView
      v-if="schedule"
      :schedule="schedule"
      :user-sessions="userSessions"
      :options="options"
      :schedule-date="scheduleDate"
      :route-query="$route.query"
      @filter="onFilter"
    >
      <span slot="title">{{ localise(page.sessionTimeline.title) }}</span>
      <Markdown slot="infoText" :content="page.sessionTimeline.info" />
      <Markdown slot="noResults" :content="page.sessionTimeline.empty" />
    </FilteredScheduleView>
  </AppLayout>
</template>

<script>
import { FilteredScheduleView, mapApiState } from "@openlab/deconf-ui-toolkit";
import Vue from "vue";
import AppLayout from "../components/AppLayout.vue";
import Markdown from "../components/Markdown.vue";
import { guardPage, localise, scheduleOptions } from "../lib.js";

// TODO: prop for FilteredScheduleView to set the session route
// to open sessions with

export default Vue.extend({
  name: "SessionTimelineV0",
  components: { AppLayout, FilteredScheduleView, Markdown },
  props: {
    page: { type: Object, required: true },
  },
  data() {
    const options = scheduleOptions(this.page, this.page.sessionTimeline);
    return { localise, options };
  },
  computed: {
    ...mapApiState("api", ["user", "schedule", "userSessions"]),

    scheduleDate() {
      return this.$dev?.scheduleDate ?? this.$temporal.date;
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
