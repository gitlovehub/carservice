import { useEffect, useState } from "react";
import { technicianApi, messageForError } from "./technicianApi";
import type { Paginated, RepairOrder } from "./technicianApi";

export function useOrders(page: number, status = "") {
  const [data, setData] = useState<Paginated<RepairOrder> | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    let live = true;
    queueMicrotask(() => { if (live) { setBusy(true); setError(""); } });
    technicianApi.orders(page, status, abort.signal).then(response => { if (live) setData(response); })
      .catch(err => { if (live && !abort.signal.aborted) setError(messageForError(err)); })
      .finally(() => { if (live) setBusy(false); });
    return () => { live = false; abort.abort(); };
  }, [page, status, revision]);
  return { data, busy, error, retry: () => setRevision(v => v + 1) };
}
