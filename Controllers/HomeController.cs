using Microsoft.AspNetCore.Mvc;

namespace TravelClick.Controllers;

public class HomeController : Controller
{
 [HttpGet("/")]
 public IActionResult Index()
 {
 return PhysicalFile(Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "index.html"), "text/html");
 }
}