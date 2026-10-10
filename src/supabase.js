import { createClient } from "@supabase/supabase-js";

const PROJECT_URL = "https://qgixypagvtylyqzvzsbe.supabase.co";
const PROJECT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnaXh5cGFndnR5bHlxenZ6c2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NDc4MTEsImV4cCI6MjEwNzIyMzgxMX0.o4sGtqC7mYtYX6tndRt1Uq3BYxhRECU03dRW_XOVAs4";

function readPublicEnv() {
  try {
    return {
      url: import.meta.env.VITE_SUPABASE_URL || PROJECT_URL,
      key: import.meta.env.VITE_SUPABASE_ANON_KEY || PROJECT_KEY,
    };
  } catch {
    return { url: PROJECT_URL, key: PROJECT_KEY };
  }
}

const { url, key } = readPublicEnv();

export const supabase = url && key ? createClient(url, key) : null;
export const isRemote = Boolean(supabase);
