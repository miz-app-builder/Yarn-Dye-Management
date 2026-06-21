import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { supabase } from "@/lib/supabase";

// Generated hooks already include /api prefix (from OpenAPI server URL).
// setBaseUrl is only needed for Expo/mobile apps pointing to a remote host.
// On web, relative URLs work automatically — do NOT set a base URL.
setBaseUrl(null);

setAuthTokenGetter(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
});

export {};
