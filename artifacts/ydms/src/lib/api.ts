import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { supabase } from "@/lib/supabase";

const base = import.meta.env.BASE_URL ?? "/";
const apiBase = base.endsWith("/") ? `${base}api` : `${base}/api`;
setBaseUrl(apiBase);

setAuthTokenGetter(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
});

export {};
