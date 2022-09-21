import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { env } from "./config.js";
import { DialogPlugin } from "@openlab/deconf-ui-toolkit";

export class GenericDeconfPlugin {
  static install(Vue) {
    Vue.prototype.$deconf = new GenericDeconfPlugin();
  }
  getCalendarLink(session, kind) {
    if (!session.slot) return null;
    let url = null;
    if (kind === "ical") {
      url = new URL(`calendar/ical/${session.id}`, env.SERVER_URL);
    }
    if (kind === "google") {
      url = new URL(`calendar/google/${session.id}`, env.SERVER_URL);
    }
    return url ? url.toString() : null;
  }
  trackMetric(metric) {
    MetricsPlugin.shared?.track(metric);
  }
  showDialog(component, props) {
    DialogPlugin.shared?.show(component, props);
  }
  closeDialog() {
    DialogPlugin.shared?.close();
  }
}
export class EnvPlugin {
  static install(Vue) {
    Vue.prototype.$env = env;
  }
}
export class FontawesomePlugin {
  static install(Vue) {
    Vue.component("fa-icon", FontAwesomeIcon);
  }
}
export class MetricsPlugin {
  static shared = null;
  static install(Vue) {
    const plugin = new MetricsPlugin();
    Vue.prototype.$metrics = plugin;
    MetricsPlugin.shared = plugin;

    Vue.config.errorHandler = function (error, _vm, info) {
      console.error(error);
      MetricsPlugin.shared?.error({
        name: error.name,
        message: error.message,
        stack: error.stack,
        info: info,
      });
    };
  }
  track(metric) {
    console.debug("MetricsPlugin#track %o", metric.eventName, metric.payload);
    SocketIoPlugin.sharedSocket?.emit(
      "trackMetric",
      metric.eventName,
      metric.payload
    );
  }
  error(error) {
    SocketIoPlugin.sharedSocket?.emit("trackError", error);
  }
}
// TODO: implement this
export class SocketIoPlugin {
  static install(Vue) {
    Vue.prototype.$io = new SocketIoPlugin(env.SERVER_URL);
  }
  static authenticate(token) {
    this.sharedSocket?.emit("auth", token);
  }
  static unauthenticate() {
    this.sharedSocket?.emit("deauth");
  }
  constructor(/* url */) {}
  teardown() {}
}
