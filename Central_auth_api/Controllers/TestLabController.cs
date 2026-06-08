using Microsoft.AspNetCore.Mvc;

namespace CentralAuth.Api.Controllers;

[ApiController]
public class TestLabController : ControllerBase
{
    [HttpGet("/test-panel")]
    public ContentResult Index()
    {
        var html = @"<!DOCTYPE html>
<html lang=""en"">
<head>
<meta charset=""UTF-8"">
<meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
<title>Central Auth — Test Lab</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Segoe UI',system-ui,sans-serif; background:#f0f2f5; color:#1a1a2e; padding:2rem; }
  .container { max-width:800px; margin:0 auto; }
  h1 { font-size:1.5rem; margin-bottom:.25rem; }
  .subtitle { color:#555; font-size:.9rem; margin-bottom:1.5rem; }
  .card { background:#fff; border-radius:10px; box-shadow:0 2px 8px rgba(0,0,0,.08); padding:1.5rem; margin-bottom:1.25rem; }
  label { font-weight:600; font-size:.85rem; display:block; margin-bottom:.35rem; }
  textarea { width:100%; padding:.65rem; border:1px solid #ccc; border-radius:6px; font-family:monospace; font-size:.82rem; resize:vertical; min-height:80px; }
  textarea:focus { outline:2px solid #4f46e5; border-color:#4f46e5; }
  .row { display:flex; gap:.75rem; flex-wrap:wrap; margin-top:.6rem; align-items:center; }
  .btn { padding:.55rem 1.1rem; border:none; border-radius:6px; cursor:pointer; font-weight:600; font-size:.85rem; transition:opacity .15s; }
  .btn:hover { opacity:.85; }
  .btn-primary { background:#4f46e5; color:#fff; }
  .btn-success { background:#059669; color:#fff; }
  .btn-danger { background:#dc2626; color:#fff; }
  .btn-outline { background:transparent; border:1px solid #ccc; color:#333; }
  .badge { display:inline-block; font-size:.75rem; padding:.2rem .55rem; border-radius:99px; font-weight:600; }
  .badge-ok { background:#d1fae5; color:#065f46; }
  .badge-missing { background:#fee2e2; color:#991b1b; }
  #tokenStatus { margin-top:.5rem; font-size:.82rem; }
  #result { background:#1e1e2e; color:#cdd6f4; border-radius:6px; padding:1rem; font-family:'Cascadia Code','Fira Code',monospace; font-size:.82rem; white-space:pre-wrap; min-height:60px; }
  .test-row { display:flex; gap:.75rem; align-items:center; flex-wrap:wrap; }
  .test-row code { background:#f3f4f6; padding:.2rem .5rem; border-radius:4px; font-size:.82rem; }
  .hint { font-size:.8rem; color:#777; margin-top:.3rem; }
</style>
</head>
<body>
<div class=""container"">
  <h1> Central Auth Test Lab</h1>
  <p class=""subtitle"">Simulate API requests, test permission enforcement, and verify 401/403 redirect behavior.</p>

  <div class=""card"">
    <label for=""baseUrlInput"">API Base URL</label>
    <input type=""url"" id=""baseUrlInput"" placeholder=""http://localhost:5089"" style=""width:100%;padding:.65rem;border:1px solid #ccc;border-radius:6px;font-size:.85rem;"">
    <div class=""row"">
      <button class=""btn btn-primary"" onclick=""saveBaseUrl()"">Save</button>
      <button class=""btn btn-outline"" onclick=""clearBaseUrl()"">Clear</button>
    </div>
  </div>

  <div class=""card"">
    <label for=""tokenInput"">JWT Access Token</label>
    <textarea id=""tokenInput"" placeholder=""Paste your JWT token here...""></textarea>
    <div class=""row"">
      <button class=""btn btn-primary"" onclick=""saveToken()"">Save Token</button>
      <button class=""btn btn-outline"" onclick=""clearToken()"">Clear</button>
    </div>
    <div id=""tokenStatus""></div>
  </div>

  <div class=""card"">
    <label>Test Endpoints</label>
    <div class=""test-row"" style=""margin-bottom:.6rem;"">
      <code>GET /api/receipts</code>
      <button class=""btn btn-success"" onclick=""testEndpoint('GET','/api/receipts')"">Send</button>
      <span style=""font-size:.8rem;color:#555;"">requires <code>FabricsReceiving_Receipts_View</code></span>
    </div>
    <div class=""test-row"">
      <code>GET /api/admin</code>
      <button class=""btn btn-danger"" onclick=""testEndpoint('GET','/api/admin')"">Send</button>
      <span style=""font-size:.8rem;color:#555;"">requires <code>Administration_FullAccess</code></span>
    </div>
  </div>

  <div class=""card"">
    <label>Response</label>
    <pre id=""result"">Awaiting test...</pre>
  </div>
</div>

<script>
  const TOKEN_KEY = 'central_auth_test_token';
  const BASE_URL_KEY = 'central_auth_base_url';

  function loadBaseUrl() {
    const saved = localStorage.getItem(BASE_URL_KEY);
    if (saved) document.getElementById('baseUrlInput').value = saved;
  }
  function saveBaseUrl() {
    localStorage.setItem(BASE_URL_KEY, document.getElementById('baseUrlInput').value.trim());
  }
  function clearBaseUrl() {
    localStorage.removeItem(BASE_URL_KEY);
    document.getElementById('baseUrlInput').value = '';
  }

  function loadToken() {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved) { document.getElementById('tokenInput').value = saved; updateStatus(saved); }
  }

  function saveToken() {
    const val = document.getElementById('tokenInput').value.trim();
    if (!val) { alert('Paste a JWT token first.'); return; }
    localStorage.setItem(TOKEN_KEY, val);
    updateStatus(val);
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    document.getElementById('tokenInput').value = '';
    updateStatus('');
  }

  function updateStatus(token) {
    const el = document.getElementById('tokenStatus');
    if (!token) {
      el.innerHTML = '<span class=""badge badge-missing"">No token saved</span> &mdash; requests will be unauthenticated (401).';
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const sub = payload.sub || '?';
      const exp = payload.exp ? new Date(payload.exp * 1000).toLocaleString() : '?';
      const perms = payload.permission || [];
      const permCount = Array.isArray(perms) ? perms.length : (perms ? 1 : 0);
      el.innerHTML = '<span class=""badge badge-ok"">Token loaded</span> user <strong>' + sub + '</strong> &middot; ' +
        permCount + ' permission(s) &middot; expires ' + exp;
    } catch {
      el.innerHTML = '<span class=""badge badge-missing"">Invalid JWT format</span>';
    }
  }

  function getBaseUrl() {
    const base = localStorage.getItem(BASE_URL_KEY) || '';
    return base.replace(/\/+$/, '');
  }

  async function testEndpoint(method, path) {
    const resultEl = document.getElementById('result');
    const token = localStorage.getItem(TOKEN_KEY);
    const baseUrl = getBaseUrl();
    const fullUrl = baseUrl ? baseUrl + path : path;

    resultEl.textContent = 'Sending ' + method + ' ' + fullUrl + '...';

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const res = await fetch(fullUrl, { method, headers });
      const body = res.status === 204 ? '(No Content)' : await res.text();
      let formatted;
      try { formatted = JSON.stringify(JSON.parse(body), null, 2); } catch { formatted = body; }

      const output = 'Status: ' + res.status + ' ' + res.statusText + '\n\n' + formatted;
      resultEl.textContent = output;

      if (res.status === 401) {
        alert('401 Unauthorized — Redirecting to Swagger login...');
        window.location.href = (baseUrl || '') + '/swagger/index.html';
      } else if (res.status === 403) {
        alert('403 Forbidden — Insufficient permissions. Redirecting to Swagger...');
        window.location.href = (baseUrl || '') + '/swagger/index.html';
      }
    } catch (err) {
      resultEl.textContent = 'Network / Fetch error:\n' + err.message;
    }
  }

  loadBaseUrl();
  loadToken();
</script>
</body>
</html>";
        return Content(html, "text/html");
    }
}
