using System.Text;
using CentralAuth.Api.Data;
using CentralAuth.Api.Filters;
using CentralAuth.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

var connStr = builder.Configuration.GetConnectionString("CentralAuth");
if (string.IsNullOrWhiteSpace(connStr))
    throw new InvalidOperationException("Missing connection string 'ConnectionStrings:CentralAuth'. Set it in appsettings.Development.json, user secrets, or environment variables.");

builder.Services.AddDbContext<CentralAuthDbContext>(opt =>
    opt.UseMySql(connStr, ServerVersion.AutoDetect(connStr)));

builder.Services.AddHttpContextAccessor();
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
    })
    .AddScheme<ApiKeyAuthOptions, ApiKeyAuthenticationHandler>("ApiKey", null);

builder.Services.AddAuthorization();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "CentralAuth.Api", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Paste ONLY the JWT (no 'Bearer ' prefix)."
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id   = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
builder.Services.AddCors(opt =>
    opt.AddPolicy("ReactUI", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()));

builder.Services.AddMemoryCache();
builder.Services.AddControllers()
    .AddJsonOptions(opt =>
        opt.JsonSerializerOptions.DefaultIgnoreCondition =
            System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull);

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "CentralAuth.Api v1"));
}

app.UseCors("ReactUI");
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<DynamicPermissionMiddleware>();
app.MapControllers();
app.MapGet("/health", () => new { status = "ok", service = "CentralAuth.Api", timestamp = DateTime.UtcNow });

app.Run();
