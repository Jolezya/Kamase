// Shared-household sync for KaMaSe.
// The whole app state is one JSON blob living in a single Supabase row.
// The app already merges by per-record `updatedAt`, so all this layer does is
// read that row, write it back, and ping the app when the row changes so the
// other phone refreshes without waiting for the 8s poll.

import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

// One fixed row for the household. Everyone with the link shares it.
const ROW_ID = "household";
const TABLE = "kamase_state";

const supabase = URL && ANON ? createClient(URL, ANON) : null;

// If env vars are missing (e.g. someone opens the build without configuring),
// fall back to localStorage so the app still runs instead of crashing.
const LS_KEY = "kamase:local";

export async function loadDb() {
  if (!supabase) {
    try { const v = localStorage.getItem(LS_KEY); return v ? JSON.parse(v) : null; }
    catch { return null; }
  }
  const { data, error } = await supabase.from(TABLE).select("data").eq("id", ROW_ID).maybeSingle();
  if (error) { console.warn("loadDb", error.message); return null; }
  return data ? data.data : null;
}

export async function saveDb(v) {
  if (!supabase) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(v)); return true; }
    catch { return false; }
  }
  const { error } = await supabase.from(TABLE).upsert({ id: ROW_ID, data: v, updated_at: new Date().toISOString() });
  if (error) { console.warn("saveDb", error.message); return false; }
  return true;
}

// Call `onChange` whenever the household row is written by anyone (including
// the other phone). Returns an unsubscribe function.
export function subscribe(onChange) {
  if (!supabase) return () => {};
  const ch = supabase
    .channel("kamase_state_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: TABLE, filter: `id=eq.${ROW_ID}` }, () => onChange())
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}
