/** Default home path per role — keep in sync with [Readme.md](Readme.md) routes and App.jsx. */
export function dashboardPathForRole(role) {
  switch (role) {
    case "Admin":
      return "/admin/dashboard";
    case "Accountant":
      return "/accountant/dashboard";
    case "Manager":
      return "/manager/payments";
    case "Analyst":
      return "/analyst/dashboard";
    default:
      return "/";
  }
}
