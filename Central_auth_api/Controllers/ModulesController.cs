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
    public async Task<List<ModuleListItemDto>> GetAll() =>
        await db.Modules
            .AsNoTracking()
            .OrderBy(m => m.SortOrder)
            .ThenBy(m => m.Name)
            .Select(m => new ModuleListItemDto(m.Id, m.Name, m.Code, m.Route, m.IsActive, m.CreatedAt, m.UpdatedAt))
            .ToListAsync();

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ModuleDetailDto>> GetById(long id)
    {
        var module = await db.Modules.AsNoTracking()
            .Where(m => m.Id == id)
            .Select(m => new ModuleDetailDto(m.Id, m.Name, m.Code, m.ParentId, m.SortOrder, m.Icon, m.Route, m.IsActive))
            .FirstOrDefaultAsync();

        return module is null ? NotFound() : Ok(module);
    }

    [HttpGet("{id:long}/pages")]
    public async Task<List<object>> GetPages(long id) =>
        await db.Pages.Where(p => p.ModuleId == id).OrderBy(p => p.SortOrder)
            .Select(p => (object)new { p.Id, p.Name, p.Route, p.SortOrder, p.Icon, p.IsActive })
            .ToListAsync();

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] ModuleSaveDto dto)
    {
        var module = new Module
        {
            Name = dto.Name,
            Code = dto.Code,
            ParentId = dto.ParentId,
            SortOrder = dto.SortOrder,
            Icon = dto.Icon,
            Route = dto.Route,
            IsActive = dto.IsActive
        };
        db.Modules.Add(module);
        await db.SaveChangesAsync();
        return Ok();
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult> Update(long id, [FromBody] ModuleSaveDto dto)
    {
        var module = await db.Modules.FindAsync(id);
        if (module is null) return NotFound();
        module.Name = dto.Name;
        module.Code = dto.Code;
        module.ParentId = dto.ParentId;
        module.SortOrder = dto.SortOrder;
        module.Icon = dto.Icon;
        module.Route = dto.Route;
        module.IsActive = dto.IsActive;
        module.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok();
    }

    [HttpDelete("{id:long}")]
    public async Task<ActionResult> Delete(long id)
    {
        var module = await db.Modules.FindAsync(id);
        if (module is null) return NotFound();
        module.IsActive = false;
        module.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok();
    }
}
