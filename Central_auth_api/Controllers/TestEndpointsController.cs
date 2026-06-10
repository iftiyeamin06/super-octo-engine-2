using CentralAuth.Api.Filters;
using Microsoft.AspNetCore.Mvc;

namespace CentralAuth.Api.Controllers;

[ApiController]
[ServiceFilter(typeof(DynamicPermissionFilter))]
public class TestEndpointsController : ControllerBase
{
    [HttpGet("/api/receipts")]
    public IActionResult GetReceipts()
    {
        return Ok(new
        {
            receipts = new[] { "R-001", "R-002", "R-003" },
            count = 3,
            source = "TestEndpointsController"
        });
    }

    [HttpGet("/api/admin")]
    public IActionResult GetAdmin()
    {
        return Ok(new
        {
            message = "Admin dashboard data",
            users = 42,
            source = "TestEndpointsController"
        });
    }

    [HttpGet("/api/fabrics")]
    public IActionResult GetFabrics()
    {
        return Ok(new { module = "Fabrics", status = "ok" });
    }

    [HttpGet("/api/orders")]
    public IActionResult GetOrders()
    {
        return Ok(new { module = "Orders", status = "ok" });
    }

    [HttpGet("/api/inventory")]
    public IActionResult GetInventory()
    {
        return Ok(new { module = "Inventory", status = "ok" });
    }

    [HttpGet("/api/cutting")]
    public IActionResult GetCutting()
    {
        return Ok(new { module = "Cutting", status = "ok" });
    }

    [HttpGet("/api/reports")]
    public IActionResult GetReports()
    {
        return Ok(new { module = "Reports", status = "ok" });
    }

    [HttpGet("/api/hr")]
    public IActionResult GetHr()
    {
        return Ok(new { module = "HR", status = "ok" });
    }

    [HttpGet("/api/binding")]
    public IActionResult GetBinding()
    {
        return Ok(new { module = "Binding", status = "ok" });
    }
}
