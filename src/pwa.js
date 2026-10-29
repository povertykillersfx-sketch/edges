const CLIENT_HOST = "app.eahosthub.co.za";
const DISMISS_KEY = "eahub.ios-install.dismissed";

let deferredPrompt = null;
const waiting = [];
let openIosBanner = null;
let installOnArrival = false;
let started = false;

export function installOnArrivalPending() {
  return installOnArrival;
}

export function isIos() {
  const agent = navigator.userAgent || "";
  const ipadDesktop = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(agent) || ipadDesktop;
}

export function isAndroid() {
  return /Android/i.test(navigator.userAgent || "");
}

export function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export function isClientPortalHost(host = window.location.hostname) {
  return host === CLIENT_HOST;
}

export function onClientHost() {
  const host = window.location.hostname;
  return (
    host === CLIENT_HOST ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".trycloudflare.com")
  );
}

export function iosBannerDismissed() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissIosBanner() {
  try {
    sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Private mode can block storage. The banner still closes for this view.
  }
}

export function showIosInstall() {
  try {
    sessionStorage.removeItem(DISMISS_KEY);
  } catch {
    // Ignore storage failures and still open the banner.
  }
  openIosBanner?.();
}

export function bindIosInstall(open) {
  openIosBanner = open;
  return () => {
    if (openIosBanner === open) openIosBanner = null;
  };
}

function rememberPrompt(event) {
  deferredPrompt = event;
  waiting.splice(0).forEach((resolve) => resolve(event));
}

export function startClientPwa() {
  if (started) return;
  started = true;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    rememberPrompt(event);
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
  });
  if (onClientHost() && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
  const params = new URLSearchParams(window.location.search);
  if (params.get("install") === "1" && isAndroid() && onClientHost()) {
    installOnArrival = true;
    params.delete("install");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  }
}

export async function installClientApp() {
  if (!onClientHost()) {
    window.location.assign("https://app.eahosthub.co.za/?install=1");
    return "redirect";
  }
  if (!deferredPrompt) {
    const arrived = await new Promise((resolve) => {
      const timer = window.setTimeout(() => resolve(null), 1500);
      waiting.push((event) => {
        window.clearTimeout(timer);
        resolve(event);
      });
    });
    if (!arrived && !deferredPrompt) return "unavailable";
  }
  try {
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return choice?.outcome || "unavailable";
  } catch {
    deferredPrompt = null;
    return "unavailable";
  }
}
