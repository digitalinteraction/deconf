#!/usr/bin/env node

import fs from "fs/promises";

import stripJsonComments from "strip-json-comments";

import {
  array,
  boolean,
  create,
  optional,
  enums,
  literal,
  nullable,
  number,
  object,
  record,
  string,
  tuple,
  type,
  union,
} from "superstruct";

const faIcon = () => tuple([string(), string()]);
const localised = () => record(string(), string());
const access = () => enums(["public", "private", "other"]);
const jsonDate = () => string();

const widgetV0 = () =>
  union([
    type({
      id: string(),
      type: literal("builtin"),
      builtin: type({
        action: enums(["login", "register", "siteVisitors"]),
        faIcon: faIcon(),
        title: optional(localised()),
        subtitle: optional(localised()),
      }),
    }),
    type({
      id: string(),
      type: literal("page"),
      page: type({
        id: string(),
        faIcon: faIcon(),
        title: optional(localised()),
        subtitle: optional(localised()),
      }),
    }),
    type({
      id: string(),
      type: literal("url"),
      url: type({
        url: string(),
        faIcon: faIcon(),
        title: optional(localised()),
        subtitle: optional(localised()),
      }),
    }),
  ]);

const homeV0 = () =>
  type({
    id: string(),
    type: literal("home"),
    version: literal("v0"),
    access: access(),
    home: type({
      hero: type({
        title: localised(),
        subtitle: localised(),
        image: string(),
      }),
      content: localised(),
      widgets: array(widgetV0()),
      sponsors: array(
        type({
          size: enums(["large", "regular", "small", "tiny"]),
          text: localised(),
          sponsors: array(
            type({
              id: string(),
              name: localised(),
              image: string(),
              url: nullable(string()),
            })
          ),
        })
      ),
    }),
  });

const filtersV0 = () =>
  union([
    type({
      type: literal("builtin"),
      builtin: string(),
    }),
    type({
      type: literal("taxonomy"),
      taxonomy: type({
        id: string(),
      }),
    }),
  ]);

const tileSectionV0 = () =>
  union([
    type({
      type: literal("taxonomy"),
      taxonomy: type({ id: string(), limit: optional(number()) }),
    }),
    type({
      type: literal("languages"),
      languages: type({}),
    }),
  ]);

const sessionQueryV0 = () =>
  union([
    type({
      type: literal("taxonomy"),
      taxonomy: type({
        id: string(),
        allow: optional(array(string())),
        block: optional(array(string())),
      }),
    }),
    type({
      type: literal("date"),
      date: type({
        before: optional(jsonDate()),
        after: optional(jsonDate()),
      }),
    }),
  ]);

const tilesV0 = () =>
  type({
    title: type({ enabled: boolean() }),
    content: type({ enabled: boolean() }),
    speakers: type({ enabled: boolean(), limit: number() }),
    header: array(tileSectionV0()),
    footer: array(tileSectionV0()),
    openSession: type({ enabled: boolean() }),
    addToMySchedule: type({ enabled: boolean() }),
  });

const sessionTimelineV0 = () =>
  type({
    id: string(),
    type: literal("sessionTimeline"),
    version: literal("v0"),
    access: access(),
    sessionTimeline: type({
      title: localised(),
      subtitle: localised(),
      primaryFilters: array(filtersV0()),
      secondaryFilters: array(filtersV0()),
      tiles: tilesV0(),
      sessionPredicate: array(sessionQueryV0()),
    }),
  });
//       (v)
// TODO: could these be merged with a "layout": "timeline|grid" field ?
//       (^)
const sessionGridV0 = () =>
  type({
    id: string(),
    type: literal("sessionGrid"),
    version: literal("v0"),
    access: access(),
    sessionGrid: type({
      title: localised(),
      subtitle: localised(),
      primaryFilters: array(filtersV0()),
      secondaryFilters: array(filtersV0()),
      tiles: tilesV0(),
      sessionPredicate: array(sessionQueryV0()),
    }),
  });

const myScheduleV0 = () =>
  type({
    id: string(),
    type: literal("mySchedule"),
    version: literal("v0"),
    access: access(),
    mySchedule: type({
      title: localised(),
      subtitle: localised(),
    }),
  });

const contentV0 = () =>
  type({
    id: string(),
    type: literal("content"),
    version: literal("v0"),
    access: access(),
    content: type({
      body: localised(),
    }),
  });

const AppConfig = type({
  navigation: array(
    object({
      page: string(),
      icon: string(),
      text: localised(),
    })
  ),

  site: type({
    title: string(),
    description: string(),
    slug: string(),
    url: string(),
    deconfVersion: string(),
    customStyles: array(string()),
    customScripts: array(string()),
    opengraph: type({
      title: string(),
      description: string(),
      image: string(),
      twitter: string(),
    }),
  }),

  login: type({
    enabled: boolean(),
    text: localised(),
  }),
  register: type({ enabled: boolean() }),
  profile: type({ enabled: boolean() }),

  pages: array(
    union([
      homeV0(),
      sessionTimelineV0(),
      sessionGridV0(),
      myScheduleV0(),
      contentV0(),
    ])
  ),

  languages: type({
    default: string(),
    available: array(
      type({
        key: string(),
        name: string(),
      })
    ),
  }),

  taxonomies: array(
    type({
      id: string(),
      faIcon: optional(faIcon()),
      options: array(
        type({
          id: string(),
          title: localised(),
          faIcon: optional(faIcon()),
        })
      ),
    })
  ),

  i18n: record(string(), record(string(), string())),

  footer: type({
    content: optional(localised()),
    links: array(
      union([
        type({
          type: literal("url"),
          url: type({
            text: localised(),
            url: string(),
          }),
        }),
        type({
          type: literal("page"),
          page: type({
            id: string(),
            text: localised(),
          }),
        }),
      ])
    ),
  }),
});

/** @typedef {ReturnType<typeof getConfig>} AppConfig */

export async function getConfig() {
  return create(
    JSON.parse(stripJsonComments(await fs.readFile("config.jsonc", "utf8"))),
    AppConfig
  );
}
