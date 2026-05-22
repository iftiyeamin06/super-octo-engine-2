using CentralAuth.Api.Data;
using CentralAuth.Api.DTOs;
using CentralAuth.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CentralAuth.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ModulesController(CentralAuthDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<List<ModuleDto>> GetAll() =>
        await db.Modules.OrderBy(m => m.SortOrder).ThenBy(m => m.Name)
            .Select(m => new ModuleDto(m.Id, m.Name, m.Code, m.Route, m.Icon, m.SortOrder, m.ParentId, m.IsActive))
            .ToListAsync();

    [HttpGet("{id:long}/pages")]
    public async Task<List<object>> GetPages(long id) =>
        await db.Pages.Where(p => p.ModuleId == id).OrderBy(p => p.SortOrder)
            .Select(p => (object)new { p.Id, p.Name, p.Route, p.SortOrder, p.Icon, p.IsActive })
            .ToListAsync();

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] ModuleDto dto)
    {
        var module = new Module { Name = dto.Name, Code = dto.Code, Route = dto.Route, Icon = dto.Icon, SortOrder = dto.SortOrder, ParentId = dto.ParentId };
        db.Modules.Add(module);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { id = module.Id }, new { module.Id });
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult> Update(long id, [FromBody] ModuleDto dto)
    {
        var module = await db.Modules.FindAsync(id);
        if (module is null) return NotFound();
        module.Name = dto.Name; module.Route = dto.Route; module.Icon = dto.Icon;
        module.SortOrder = dto.SortOrder; module.IsActive = dto.IsActive;
        module.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:long}")]
    public async Task<ActionResult> Delete(long id)
    {
        var module = await db.Modules.FindAsync(id);
        if (module is null) return NotFound();
        module.IsActive = false; module.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }
}
