using Microsoft.AspNetCore.Mvc;

namespace CentralAuth.Api.Controllers;

[ApiExplorerSettings(IgnoreApi = true)]
public class MockAppController : Controller
{
    [HttpGet("/mock-apps/FabricsReceiving/Receipts")]
    public ContentResult Receipts()
    {
        var html = @"<!DOCTYPE html>
<html lang=""en"">
<head>
<meta charset=""UTF-8"">
<meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
<title>Fabrics Receiving — Receipts</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Segoe UI',system-ui,sans-serif; background:#f0fdf4; color:#1a1a2e; padding:2rem; }
  .container { max-width:800px; margin:0 auto; }
  h1 { font-size:1.5rem; margin-bottom:.25rem; }
  .subtitle { color:#555; font-size:.9rem; margin-bottom:1.5rem; }
  .card { background:#fff; border-radius:10px; box-shadow:0 2px 8px rgba(0,0,0,.08); padding:1.5rem; margin-bottom:1.25rem; }
  .badge { display:inline-block; font-size:.75rem; padding:.2rem .55rem; border-radius:99px; font-weight:600; }
  .badge-success { background:#d1fae5; color:#065f46; }
  .badge-error { background:#fee2e2; color:#991b1b; }
  .badge-pending { background:#fef3c7; color:#92400e; }
  #accessStatus { margin-top:.5rem; font-size:.9rem; }
</style>
</head>
<body>
<div class=""container"">
  <h1> Fabrics Receiving — Receipts</h1>
  <p class=""subtitle"">Mock site page — simulating a secure module</p>

  <div class=""card"">
    <div id=""accessStatus"">Initializing security check...</div>
  </div>
</div>

<script>
window.onload = function () {
  var statusEl = document.getElementById('accessStatus');
  var raw = localStorage.getItem('central_auth_session');
  if (!raw) {
    statusEl.innerHTML = '<span class=""badge badge-error""> ACCESS DENIED</span> No digital passport found.';
    alert('🔒 [Central Auth] No digital passport found! Redirecting to login...');
    window.location.href = '/swagger/index.html';
    return;
  }
  var session;
  try { session = JSON.parse(raw); } catch(e) {
    statusEl.innerHTML = '<span class=""badge badge-error""> SESSION ERROR</span> Invalid session JSON.';
    alert('🔒 [Central Auth] Session data corrupted! Redirecting to login...');
    window.location.href = '/swagger/index.html';
    return;
  }
  var token = session.token;
  if (!token) {
    statusEl.innerHTML = '<span class=""badge badge-error""> ACCESS DENIED</span> No token in session.';
    alert('🔒 [Central Auth] No token found in session! Redirecting to login...');
    window.location.href = '/swagger/index.html';
    return;
  }

  statusEl.innerHTML = '<span class=""badge badge-pending""> CHECKING</span> Token found. Verifying permissions...';

  fetch('/api/receipts', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function (res) {
    if (res.status === 401) {
      statusEl.innerHTML = '<span class=""badge badge-error""> ACCESS DENIED</span> Session identity expired or invalid.';
      alert('🔒 [Central Auth] Session identity expired or invalid! Redirecting to login...');
      window.location.href = '/swagger/index.html';
      return;
    }
    if (res.status === 403) {
      statusEl.innerHTML = '<span class=""badge badge-error""> ACCESS DENIED</span> Your role lacks the required permission mapping for this route.';
      alert('🚫 [Central Auth] Access Denied! Your role lacks the required permission mapping for this route. Redirecting...');
      window.location.href = '/swagger/index.html';
      return;
    }
    statusEl.innerHTML = '<span class=""badge badge-success""> ACCESS GRANTED</span> ✅ Access Granted! Welcome to the secure module dashboard view.';
  })
  .catch(function (err) {
    statusEl.innerHTML = '<span class=""badge badge-error""> NETWORK ERROR</span> ' + err.message;
  });
};
</script>
</body>
</html>";
        return Content(html, "text/html");
    }

    [HttpGet("/mock-apps/Admin/Dashboard")]
    public ContentResult Dashboard()
    {
        var html = @"<!DOCTYPE html>
<html lang=""en"">
<head>
<meta charset=""UTF-8"">
<meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
<title>Admin — Dashboard</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Segoe UI',system-ui,sans-serif; background:#fef2f2; color:#1a1a2e; padding:2rem; }
  .container { max-width:800px; margin:0 auto; }
  h1 { font-size:1.5rem; margin-bottom:.25rem; }
  .subtitle { color:#555; font-size:.9rem; margin-bottom:1.5rem; }
  .card { background:#fff; border-radius:10px; box-shadow:0 2px 8px rgba(0,0,0,.08); padding:1.5rem; margin-bottom:1.25rem; }
  .badge { display:inline-block; font-size:.75rem; padding:.2rem .55rem; border-radius:99px; font-weight:600; }
  .badge-success { background:#d1fae5; color:#065f46; }
  .badge-error { background:#fee2e2; color:#991b1b; }
  .badge-pending { background:#fef3c7; color:#92400e; }
  #accessStatus { margin-top:.5rem; font-size:.9rem; }
</style>
</head>
<body>
<div class=""container"">
  <h1> Admin — Dashboard</h1>
  <p class=""subtitle"">Mock site page — simulating a secure module</p>

  <div class=""card"">
    <div id=""accessStatus"">Initializing security check...</div>
  </div>
</div>

<script>
window.onload = function () {
  var statusEl = document.getElementById('accessStatus');
  var raw = localStorage.getItem('central_auth_session');
  if (!raw) {
    statusEl.innerHTML = '<span class=""badge badge-error""> ACCESS DENIED</span> No digital passport found.';
    alert('🔒 [Central Auth] No digital passport found! Redirecting to login...');
    window.location.href = '/swagger/index.html';
    return;
  }
  var session;
  try { session = JSON.parse(raw); } catch(e) {
    statusEl.innerHTML = '<span class=""badge badge-error""> SESSION ERROR</span> Invalid session JSON.';
    alert('🔒 [Central Auth] Session data corrupted! Redirecting to login...');
    window.location.href = '/swagger/index.html';
    return;
  }
  var token = session.token;
  if (!token) {
    statusEl.innerHTML = '<span class=""badge badge-error""> ACCESS DENIED</span> No token in session.';
    alert('🔒 [Central Auth] No token found in session! Redirecting to login...');
    window.location.href = '/swagger/index.html';
    return;
  }

  statusEl.innerHTML = '<span class=""badge badge-pending""> CHECKING</span> Token found. Verifying permissions...';

  fetch('/api/admin', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function (res) {
    if (res.status === 401) {
      statusEl.innerHTML = '<span class=""badge badge-error""> ACCESS DENIED</span> Session identity expired or invalid.';
      alert('🔒 [Central Auth] Session identity expired or invalid! Redirecting to login...');
      window.location.href = '/swagger/index.html';
      return;
    }
    if (res.status === 403) {
      statusEl.innerHTML = '<span class=""badge badge-error""> ACCESS DENIED</span> Your role lacks the required permission mapping for this route.';
      alert('🚫 [Central Auth] Access Denied! Your role lacks the required permission mapping for this route. Redirecting...');
      window.location.href = '/swagger/index.html';
      return;
    }
    statusEl.innerHTML = '<span class=""badge badge-success""> ACCESS GRANTED</span> ✅ Access Granted! Welcome to the secure module dashboard view.';
  })
  .catch(function (err) {
    statusEl.innerHTML = '<span class=""badge badge-error""> NETWORK ERROR</span> ' + err.message;
  });
};
</script>
</body>
</html>";
        return Content(html, "text/html");
    }

    [HttpGet("/mock-apps/Fabrics")]
    public ContentResult Fabrics()
    {
        var html = @"<!DOCTYPE html>
<html lang=""en"">
<head>
<meta charset=""UTF-8"">
<meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
<title>Fabrics Receiving Dashboard</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Segoe UI',system-ui,sans-serif; background:#f0fdf4; color:#1a1a2e; padding:2rem; }
  .container { max-width:800px; margin:0 auto; }
  h1 { font-size:1.5rem; margin-bottom:.25rem; }
  .subtitle { color:#555; font-size:.9rem; margin-bottom:1.5rem; }
  .card { background:#fff; border-radius:10px; box-shadow:0 2px 8px rgba(0,0,0,.08); padding:1.5rem; margin-bottom:1.25rem; }
  .badge { display:inline-block; font-size:.75rem; padding:.2rem .55rem; border-radius:99px; font-weight:600; }
  .badge-success { background:#d1fae5; color:#065f46; }
  .badge-error { background:#fee2e2; color:#991b1b; }
  .badge-pending { background:#fef3c7; color:#92400e; }
  #accessStatus { margin-top:.5rem; font-size:.9rem; }
</style>
</head>
<body>
<div class=""container"">
  <h1> Fabrics Receiving Dashboard</h1>
  <p class=""subtitle"">Mock site page — simulating a secure module</p>
  <div class=""card"">
    <div id=""accessStatus"">Initializing security check...</div>
  </div>
</div>
<script>
window.onload = function () {
  var statusEl = document.getElementById('accessStatus');
  var raw = localStorage.getItem('central_auth_session');
  if (!raw) {
    statusEl.innerHTML = '<span class=""badge badge-error""> ACCESS DENIED</span> No digital passport found.';
    alert('🔒 [Central Auth] No digital passport found! Redirecting to login...');
    window.location.href = '/swagger/index.html';
    return;
  }
  var session;
  try { session = JSON.parse(raw); } catch(e) {
    statusEl.innerHTML = '<span class=""badge badge-error""> SESSION ERROR</span> Invalid session JSON.';
    alert('🔒 [Central Auth] Session data corrupted! Redirecting to login...');
    window.location.href = '/swagger/index.html';
    return;
  }
  var token = session.token;
  if (!token) {
    statusEl.innerHTML = '<span class=""badge badge-error""> ACCESS DENIED</span> No token in session.';
    alert('🔒 [Central Auth] No token found in session! Redirecting to login...');
    window.location.href = '/swagger/index.html';
    return;
  }
  statusEl.innerHTML = '<span class=""badge badge-pending""> CHECKING</span> Token found. Verifying permissions...';
  fetch('/api/fabrics', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function (res) {
    if (res.status === 401) {
      statusEl.innerHTML = '<span class=""badge badge-error""> ACCESS DENIED</span> Session identity expired or invalid.';
      alert('🔒 [Central Auth] Session identity expired or invalid! Redirecting to login...');
      window.location.href = '/swagger/index.html';
      return;
    }
    if (res.status === 403) {
      statusEl.innerHTML = '<span class=""badge badge-error""> ACCESS DENIED</span> Your role lacks the required permission mapping for this route.';
      alert('🚫 [Central Auth] Access Denied! Your role lacks the required permission mapping for this route. Redirecting...');
      window.location.href = '/swagger/index.html';
      return;
    }
    statusEl.innerHTML = '<span class=""badge badge-success""> ACCESS GRANTED</span> ✅ Access Granted! Welcome to the secure module dashboard view.';
  })
  .catch(function (err) {
    statusEl.innerHTML = '<span class=""badge badge-error""> NETWORK ERROR</span> ' + err.message;
  });
};
</script>
</body>
</html>";
        return Content(html, "text/html");
    }

    [HttpGet("/mock-apps/Orders")]
    public ContentResult Orders()
    {
        var html = @"<!DOCTYPE html>
<html lang=""en"">
<head>
<meta charset=""UTF-8"">
<meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
<title>Order Management Dashboard</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Segoe UI',system-ui,sans-serif; background:#fff7ed; color:#1a1a2e; padding:2rem; }
  .container { max-width:800px; margin:0 auto; }
  h1 { font-size:1.5rem; margin-bottom:.25rem; }
  .subtitle { color:#555; font-size:.9rem; margin-bottom:1.5rem; }
  .card { background:#fff; border-radius:10px; box-shadow:0 2px 8px rgba(0,0,0,.08); padding:1.5rem; margin-bottom:1.25rem; }
  .badge { display:inline-block; font-size:.75rem; padding:.2rem .55rem; border-radius:99px; font-weight:600; }
  .badge-success { background:#d1fae5; color:#065f46; }
  .badge-error { background:#fee2e2; color:#991b1b; }
  .badge-pending { background:#fef3c7; color:#92400e; }
  #accessStatus { margin-top:.5rem; font-size:.9rem; }
</style>
</head>
<body>
<div class=""container"">
  <h1> Order Management Dashboard</h1>
  <p class=""subtitle"">Mock site page — simulating a secure module</p>
  <div class=""card"">
    <div id=""accessStatus"">Initializing security check...</div>
  </div>
</div>
<script>
window.onload = function () {
  var statusEl = document.getElementById('accessStatus');
  var raw = localStorage.getItem('central_auth_session');
  if (!raw) {
    statusEl.innerHTML = '<span class=""badge badge-error""> ACCESS DENIED</span> No digital passport found.';
    alert('🔒 [Central Auth] No digital passport found! Redirecting to login...');
    window.location.href = '/swagger/index.html';
    return;
  }
  var session;
  try { session = JSON.parse(raw); } catch(e) {
    statusEl.innerHTML = '<span class=""badge badge-error""> SESSION ERROR</span> Invalid session JSON.';
    alert('🔒 [Central Auth] Session data corrupted! Redirecting to login...');
    window.location.href = '/swagger/index.html';
    return;
  }
  var token = session.token;
  if (!token) {
    statusEl.innerHTML = '<span class=""badge badge-error""> ACCESS DENIED</span> No token in session.';
    alert('🔒 [Central Auth] No token found in session! Redirecting to login...');
    window.location.href = '/swagger/index.html';
    return;
  }
  statusEl.innerHTML = '<span class=""badge badge-pending""> CHECKING</span> Token found. Verifying permissions...';
  fetch('/api/orders', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function (res) {
    if (res.status === 401) {
      statusEl.innerHTML = '<span class=""badge badge-error""> ACCESS DENIED</span> Session identity expired or invalid.';
      alert('🔒 [Central Auth] Session identity expired or invalid! Redirecting to login...');
      window.location.href = '/swagger/index.html';
      return;
    }
    if (res.status === 403) {
      statusEl.innerHTML = '<span class=""badge badge-error""> ACCESS DENIED</span> Your role lacks the required permission mapping for this route.';
      alert('🚫 [Central Auth] Access Denied! Your role lacks the required permission mapping for this route. Redirecting...');
      window.location.href = '/swagger/index.html';
      return;
    }
    statusEl.innerHTML = '<span class=""badge badge-success""> ACCESS GRANTED</span> ✅ Access Granted! Welcome to the secure module dashboard view.';
  })
  .catch(function (err) {
    statusEl.innerHTML = '<span class=""badge badge-error""> NETWORK ERROR</span> ' + err.message;
  });
};
</script>
</body>
</html>";
        return Content(html, "text/html");
    }

    [HttpGet("/mock-apps/Inventory")]
    public ContentResult Inventory()
    {
        var html = @"<!DOCTYPE html>
<html lang=""en"">
<head>
<meta charset=""UTF-8"">
<meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
<title>Inventory Asset Dashboard</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Segoe UI',system-ui,sans-serif; background:#f0f9ff; color:#1a1a2e; padding:2rem; }
  .container { max-width:800px; margin:0 auto; }
  h1 { font-size:1.5rem; margin-bottom:.25rem; }
  .subtitle { color:#555; font-size:.9rem; margin-bottom:1.5rem; }
  .card { background:#fff; border-radius:10px; box-shadow:0 2px 8px rgba(0,0,0,.08); padding:1.5rem; margin-bottom:1.25rem; }
  .badge { display:inline-block; font-size:.75rem; padding:.2rem .55rem; border-radius:99px; font-weight:600; }
  .badge-success { background:#d1fae5; color:#065f46; }
  .badge-error { background:#fee2e2; color:#991b1b; }
  .badge-pending { background:#fef3c7; color:#92400e; }
  #accessStatus { margin-top:.5rem; font-size:.9rem; }
</style>
</head>
<body>
<div class=""container"">
  <h1> Inventory Asset Dashboard</h1>
  <p class=""subtitle"">Mock site page — simulating a secure module</p>
  <div class=""card"">
    <div id=""accessStatus"">Initializing security check...</div>
  </div>
</div>
<script>
window.onload = function () {
  var statusEl = document.getElementById('accessStatus');
  var raw = localStorage.getItem('central_auth_session');
  if (!raw) {
    statusEl.innerHTML = '<span class=""badge badge-error""> ACCESS DENIED</span> No digital passport found.';
    alert('🔒 [Central Auth] No digital passport found! Redirecting to login...');
    window.location.href = '/swagger/index.html';
    return;
  }
  var session;
  try { session = JSON.parse(raw); } catch(e) {
    statusEl.innerHTML = '<span class=""badge badge-error""> SESSION ERROR</span> Invalid session JSON.';
    alert('🔒 [Central Auth] Session data corrupted! Redirecting to login...');
    window.location.href = '/swagger/index.html';
    return;
  }
  var token = session.token;
  if (!token) {
    statusEl.innerHTML = '<span class=""badge badge-error""> ACCESS DENIED</span> No token in session.';
    alert('🔒 [Central Auth] No token found in session! Redirecting to login...');
    window.location.href = '/swagger/index.html';
    return;
  }
  statusEl.innerHTML = '<span class=""badge badge-pending""> CHECKING</span> Token found. Verifying permissions...';
  fetch('/api/inventory', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function (res) {
    if (res.status === 401) {
      statusEl.innerHTML = '<span class=""badge badge-error""> ACCESS DENIED</span> Session identity expired or invalid.';
      alert('🔒 [Central Auth] Session identity expired or invalid! Redirecting to login...');
      window.location.href = '/swagger/index.html';
      return;
    }
    if (res.status === 403) {
      statusEl.innerHTML = '<span class=""badge badge-error""> ACCESS DENIED</span> Your role lacks the required permission mapping for this route.';
      alert('🚫 [Central Auth] Access Denied! Your role lacks the required permission mapping for this route. Redirecting...');
      window.location.href = '/swagger/index.html';
      return;
    }
    statusEl.innerHTML = '<span class=""badge badge-success""> ACCESS GRANTED</span> ✅ Access Granted! Welcome to the secure module dashboard view.';
  })
  .catch(function (err) {
    statusEl.innerHTML = '<span class=""badge badge-error""> NETWORK ERROR</span> ' + err.message;
  });
};
</script>
</body>
</html>";
        return Content(html, "text/html");
    }

    [HttpGet("/mock-apps/Reports")]
    public ContentResult Reports()
    {
        var html = @"<!DOCTYPE html>
<html lang=""en"">
<head>
<meta charset=""UTF-8"">
<meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
<title>Executive Reports Dashboard</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Segoe UI',system-ui,sans-serif; background:#f5f3ff; color:#1a1a2e; padding:2rem; }
  .container { max-width:800px; margin:0 auto; }
  h1 { font-size:1.5rem; margin-bottom:.25rem; }
  .subtitle { color:#555; font-size:.9rem; margin-bottom:1.5rem; }
  .card { background:#fff; border-radius:10px; box-shadow:0 2px 8px rgba(0,0,0,.08); padding:1.5rem; margin-bottom:1.25rem; }
  .badge { display:inline-block; font-size:.75rem; padding:.2rem .55rem; border-radius:99px; font-weight:600; }
  .badge-success { background:#d1fae5; color:#065f46; }
  .badge-error { background:#fee2e2; color:#991b1b; }
  .badge-pending { background:#fef3c7; color:#92400e; }
  #accessStatus { margin-top:.5rem; font-size:.9rem; }
</style>
</head>
<body>
<div class=""container"">
  <h1> Executive Reports Dashboard</h1>
  <p class=""subtitle"">Mock site page — simulating a secure module</p>
  <div class=""card"">
    <div id=""accessStatus"">Initializing security check...</div>
  </div>
</div>
<script>
window.onload = function () {
  var statusEl = document.getElementById('accessStatus');
  var raw = localStorage.getItem('central_auth_session');
  if (!raw) {
    statusEl.innerHTML = '<span class=""badge badge-error""> ACCESS DENIED</span> No digital passport found.';
    alert('🔒 [Central Auth] No digital passport found! Redirecting to login...');
    window.location.href = '/swagger/index.html';
    return;
  }
  var session;
  try { session = JSON.parse(raw); } catch(e) {
    statusEl.innerHTML = '<span class=""badge badge-error""> SESSION ERROR</span> Invalid session JSON.';
    alert('🔒 [Central Auth] Session data corrupted! Redirecting to login...');
    window.location.href = '/swagger/index.html';
    return;
  }
  var token = session.token;
  if (!token) {
    statusEl.innerHTML = '<span class=""badge badge-error""> ACCESS DENIED</span> No token in session.';
    alert('🔒 [Central Auth] No token found in session! Redirecting to login...');
    window.location.href = '/swagger/index.html';
    return;
  }
  statusEl.innerHTML = '<span class=""badge badge-pending""> CHECKING</span> Token found. Verifying permissions...';
  fetch('/api/reports', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function (res) {
    if (res.status === 401) {
      statusEl.innerHTML = '<span class=""badge badge-error""> ACCESS DENIED</span> Session identity expired or invalid.';
      alert('🔒 [Central Auth] Session identity expired or invalid! Redirecting to login...');
      window.location.href = '/swagger/index.html';
      return;
    }
    if (res.status === 403) {
      statusEl.innerHTML = '<span class=""badge badge-error""> ACCESS DENIED</span> Your role lacks the required permission mapping for this route.';
      alert('🚫 [Central Auth] Access Denied! Your role lacks the required permission mapping for this route. Redirecting...');
      window.location.href = '/swagger/index.html';
      return;
    }
    statusEl.innerHTML = '<span class=""badge badge-success""> ACCESS GRANTED</span> ✅ Access Granted! Welcome to the secure module dashboard view.';
  })
  .catch(function (err) {
    statusEl.innerHTML = '<span class=""badge badge-error""> NETWORK ERROR</span> ' + err.message;
  });
};
</script>
</body>
</html>";
        return Content(html, "text/html");
    }
}
