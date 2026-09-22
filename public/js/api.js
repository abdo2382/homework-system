const Api = (() => {
  function token() {
    return localStorage.getItem('token');
  }

  async function request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const t = token();
    if (t) headers.Authorization = 'Bearer ' + t;

    const res = await fetch('/api' + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    let data = null;
    try { data = await res.json(); } catch (_) { /* no body */ }

    if (!res.ok) {
      const message = (data && data.error) || 'Something went wrong.';
      const err = new Error(message);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  // For endpoints that need multipart/form-data (file uploads) rather than JSON.
  async function uploadFile(path, file, fieldName) {
    const fd = new FormData();
    fd.append(fieldName, file);
    const headers = {};
    const t = token();
    if (t) headers.Authorization = 'Bearer ' + t;

    const res = await fetch('/api' + path, { method: 'POST', headers, body: fd });
    let data = null;
    try { data = await res.json(); } catch (_) { /* no body */ }
    if (!res.ok) {
      const err = new Error((data && data.error) || 'Upload failed.');
      err.status = res.status;
      throw err;
    }
    return data;
  }

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    del: (path) => request('DELETE', path),
    uploadFile,
    token,
    setToken(t) { localStorage.setItem('token', t); },
    clearToken() { localStorage.removeItem('token'); },
  };
})();
