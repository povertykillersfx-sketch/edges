import { createClient } from "@supabase/supabase-js";

function readPublicEnv() {
  try {
    return {
      url: import.meta.env.VITE_SUPABASE_URL || "",
      key: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
    };
  } catch {
    return { url: "", key: "" };
  }
}

const { url, key } = readPublicEnv();

export const supabase = url && key ? createClient(url, key) : null;
export const isRemote = Boolean(supabase);
