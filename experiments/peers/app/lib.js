/** @returns {Promise<{ id: string, action: string }>} */
export async function getTarget(id) {
  const res = await fetch(`/api/pairs/${id}`);
  if (!res.ok) throw new Error("Pair not found");
  const peer = await res.json();
  return peer;
}

export function debounce(ms, fn) {
  let timerid = null;
  return () => {
    if (timerid !== null) clearTimeout(timerid);
    timerid = setTimeout(fn, ms);
  };
}
