import { setBaseUrl } from "@workspace/api-client-react";

const base = import.meta.env.BASE_URL ?? "/";
const apiBase = base.endsWith("/") ? `${base}api` : `${base}/api`;
setBaseUrl(apiBase);

export {};
