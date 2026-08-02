/** Copy a House share URL (issue or plate deep-link) to the clipboard. */
export async function copyHouseShareLink(
  kind: "issue" | "plate",
  id: string,
): Promise<boolean> {
  const path = kind === "issue" ? `/house/issue/${id}` : `/house?plate=${id}`;
  const url =
    typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
