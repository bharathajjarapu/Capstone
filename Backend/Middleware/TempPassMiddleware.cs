namespace VenDot.Middleware;

public class TempPassMiddleware
{
    private readonly RequestDelegate _next;

    public TempPassMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.User.Identity?.IsAuthenticated != true)
        {
            await _next(context);
            return;
        }

        var mustChange = context.User.FindFirst("must_change_password")?.Value == "true";
        if (!mustChange)
        {
            await _next(context);
            return;
        }

        var path = context.Request.Path.Value ?? "";
        if (path.Equals("/api/auth/change-password", StringComparison.OrdinalIgnoreCase) &&
            context.Request.Method.Equals("POST", StringComparison.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }

        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        await context.Response.WriteAsJsonAsync(new { error = "Password change required." });
    }
}
