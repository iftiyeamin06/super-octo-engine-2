using Microsoft.AspNetCore.Mvc;

namespace CentralAuth.Api.Controllers;

[ApiController]
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
}
