export const RECOVERY_FLAG = "pallazium_password_recovery";

export function isRecoveryUrl() {
  if (typeof window === "undefined") return false;

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(window.location.search);

  return (
    hashParams.get("type") === "recovery" ||
    searchParams.get("type") === "recovery" ||
    sessionStorage.getItem(RECOVERY_FLAG) === "1"
  );
}

export function markRecoveryMode() {
  sessionStorage.setItem(RECOVERY_FLAG, "1");
}

export function clearRecoveryMode() {
  sessionStorage.removeItem(RECOVERY_FLAG);
}
