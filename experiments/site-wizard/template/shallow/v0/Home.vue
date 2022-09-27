<template>
  <AppLayout>
    <AtriumLayout class="atriumV0">
      <HeroCard
        slot="top"
        :title="localise(page.home.hero.title)"
        :subtitle="localise(page.home.hero.subtitle)"
        :cover-image="assetUrl(page.home.hero.image)"
      />

      <BoxContent slot="left">
        <div class="content" v-html="localeContent" />
      </BoxContent>

      <div slot="right">
        <ColorWidget
          v-for="(widget, i) in widgetData"
          :key="i"
          v-bind="widget"
        />
        <!-- TODO: FeaturedSessions -->
      </div>

      <SponsorGrid slot="bottom" :groups="sponsorData" />
    </AtriumLayout>
  </AppLayout>
</template>

<script>
import Vue from "vue";
import AppLayout from "../components/AppLayout.vue";
import { marked } from "marked";
import {
  AtriumLayout,
  BoxContent,
  ColorWidget,
  HeroCard,
  mapApiState,
  Routes,
  SponsorGrid,
} from "@openlab/deconf-ui-toolkit";

import { assetUrl, localise } from "../lib.js";
import { router } from "../router.js";

const builtinActions = {
  login: router.resolve({ name: Routes.Login })?.href,
  register: router.resolve({ name: Routes.Register })?.href,
  profile: router.resolve({ name: Routes.Profile })?.href,
};

function baseWidget(widget, title, subtitle, faIcon) {
  return {
    kind: "primary",
    title: title ? localise(title) : "",
    subtitle: subtitle ? localise(subtitle) : "",
    icon: faIcon,
    "data-widget": widget.id,
  };
}

const widgetFactory = {
  builtin(widget, view) {
    const { action, faIcon, title, subtitle } = widget.builtin;
    const attrs = {
      ...baseWidget(widget, title, subtitle, faIcon),
      kind: "primary",
      href: builtinActions[action],
    };
    if (view.user && (action === "login" || action === "register")) return null;
    if (!view.user && action === "profile") return null;
    if (action === "siteVisitors") attrs.title = `${view.siteVisitors}`;
    return attrs;
  },
  page(widget) {
    const { id: name, faIcon, title, subtitle } = widget.page;
    return {
      ...baseWidget(widget.id, title, subtitle, faIcon),
      href: router.resolve({ name })?.href,
      kind: "secondary",
    };
  },
  url(widget) {
    const { url, faIcon, title, subtitle } = widget.url;
    let kind = "secondary";
    if (url.includes("twitter.com")) kind = "twitter";
    return {
      ...baseWidget(widget.id, title, subtitle, faIcon),
      href: url,
      kind: kind,
    };
  },
};

// TODO: proper site-visitors binding

export default Vue.extend({
  name: "AtriumV0View",
  components: {
    AppLayout,
    AtriumLayout,
    BoxContent,
    ColorWidget,
    HeroCard,
    SponsorGrid,
  },
  props: {
    page: { type: Object, required: true },
  },
  data() {
    return { assetUrl, localise, siteVisitors: 123 };
  },
  computed: {
    ...mapApiState("api", ["user"]),
    localeContent() {
      return marked(localise(this.page.home.content));
    },
    widgetData() {
      return this.page.home.widgets
        .map((widget) => widgetFactory[widget.type]?.(widget, this))
        .filter((w) => w);
    },
    sponsorData() {
      return this.page.home.sponsors.map((group) => ({
        size: group.size,
        title: localise(group.text),
        sponsors: group.sponsors.map((sponsor) => ({
          _id: sponsor.id, // TODO: id here for later metrics?
          title: localise(sponsor.name),
          image: assetUrl(sponsor.image),
          href: sponsor.url,
        })),
      }));
    },
  },
});
</script>

<style lang="scss">
// ...
</style>
