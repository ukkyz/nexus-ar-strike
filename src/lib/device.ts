export function getDeviceId() {
  if (typeof window === "undefined") return "server";
  let id = window.localStorage.getItem("ar-strike-device");
  if (!id) {
    id = `dev-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    window.localStorage.setItem("ar-strike-device", id);
  }
  return id;
}

export function getCallsign() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("ar-strike-callsign") ?? "";
}

export function setCallsign(value: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("ar-strike-callsign", value);
}
