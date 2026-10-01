import { API_URL, createApi } from "./client";

export function createServices(baseUrl = API_URL, { chatKey, tenant } = {}) {
  const api = createApi(baseUrl, { chatKey, tenant });
  return {
    chatApi: {
      // The LLM server always uses LLM_MODEL from its .env; clients don't choose a model.
      send: (messages, context) => api.post("/chat", { messages, context }).then((r) => r.data),
    },

    // Who this widget key is (tenant, audience) and the tenant's widget settings from the admin console.
    widgetApi: {
      get: () => api.get("/widget").then((r) => r.data),
    },

    modelApi: {
      current: () => api.get("/models").then((r) => r.data),
    },

    toolApi: {
      list: () => api.get("/tools").then((r) => r.data),
    },

    fileApi: {
      list: () => api.get("/files").then((r) => r.data),
      upload: (file, onProgress) => {
        const form = new FormData();
        form.append("file", file);
        return api
          .post("/files/upload", form, {
            onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
          })
          .then((r) => r.data);
      },
      remove: (path) => api.delete(`/files/${encodeURI(path)}`).then((r) => r.data),
      downloadUrl: (path) => `${baseUrl}/api/files/download/${encodeURI(path)}`,
    },
  };
}
