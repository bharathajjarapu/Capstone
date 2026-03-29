let clearHandler = () => {
  localStorage.removeItem("venauth");
  window.location.assign("/login");
};

export function registerSessionClearHandler(fn) {
  clearHandler = fn;
}

export function triggerSessionClear() {
  clearHandler();
}

export function getAuthToken() {
  try {
    const raw = localStorage.getItem("venauth");
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data.token ?? null;
  } catch {
    return null;
  }
}
