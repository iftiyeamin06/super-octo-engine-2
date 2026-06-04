using System.Text;
using CentralAuth.Api.Data;
using CentralAuth.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

var connStr = builder.Configuration.GetConnectionString("CentralAuth");
if (string.IsNullOrWhiteSpace(connStr))
    throw new InvalidOperationException("Missing connection string 'ConnectionStrings:CentralAuth'. Set it in appsettings.Development.json, user secrets, or environment variables.");

builder.Services.AddDbContext<CentralAuthDbContext>(opt =>
    opt.UseMySql(connStr, ServerVersion.AutoDetect(connStr)));

builder.Services.Configure<EmployeeIdOptions>(builder.Configuration.GetSection("EmployeeId"));
builder.Services.AddScoped<IEmployeeIdGenerator, EmployeeIdGenerator>();

var jwtCfg = builder.Configuration.GetSection("Jwt");
var jwtKeyValue = jwtCfg["Key"];
if (string.IsNullOrWhiteSpace(jwtKeyValue))
    throw new InvalidOperationException("Missing JWT key 'Jwt:Key'. Set it in appsettings.Development.json, user secrets, or environment variables.");

var jwtKey = Encoding.UTF8.GetBytes(jwtKeyValue);
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtCfg["Issuer"],
            ValidAudience = jwtCfg["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(jwtKey),
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(opt =>
    opt.AddPolicy("ReactUI", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()));

builder.Services.AddControllers()
    .AddJsonOptions(opt =>
        opt.JsonSerializerOptions.DefaultIgnoreCondition =
            System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull);

var app = builder.Build();

app.UseCors("ReactUI");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => new { status = "ok", service = "CentralAuth.Api", timestamp = DateTime.UtcNow });

app.Run();
