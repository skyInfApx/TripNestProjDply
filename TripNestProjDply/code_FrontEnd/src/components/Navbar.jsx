import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import NotificationBell from "./NotificationBell";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, isAdmin, logout } = useAuth();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const linkClass = (path) =>
    `nav-link ${location.pathname === path ? "active" : ""}`;

  return (
    <header className="site-header">
      <div className="nav-container">
        <Link to="/" className="brand">
          <span className="brand-mark">✈</span>
          <span>TripNest</span>
        </Link>

        <nav className="nav-links">
          <Link className={linkClass("/")} to="/">Home</Link>
          <Link className={linkClass("/destinations")} to="/destinations">Destinations</Link>

          {isAuthenticated ? (
            <>
              <Link className={linkClass("/trips")} to="/trips">My Trips</Link>
              <Link className={linkClass("/dashboard")} to="/dashboard">Dashboard</Link>
              <Link className={linkClass("/reports")} to="/reports">Reports</Link>
              {isAdmin && (
                <Link className={linkClass("/admin")} to="/admin">Admin Tower</Link>
              )}
              <Link className={linkClass("/settings")} to="/settings">Settings</Link>
              <NotificationBell />

              {user?.email && (
                <Link
                  to="/profile"
                  className={`nav-user-badge ${location.pathname === "/profile" ? "active-profile" : ""}`}
                  title={`View Profile (${user.email})`}
                >
                  {isAdmin ? "🛡️ " : "👤 "}
                  <span>{user.email.split("@")[0]}</span>
                  {isAdmin && (
                    <span
                      style={{
                        marginLeft: "5px",
                        fontSize: "10px",
                        background: "#dc2626",
                        color: "#ffffff",
                        padding: "1px 6px",
                        borderRadius: "10px",
                        fontWeight: "800",
                      }}
                    >
                      ADMIN
                    </span>
                  )}
                </Link>
              )}

              <button className="nav-logout" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link className={linkClass("/login")} to="/login">Login</Link>
              <Link className="nav-register" to="/register">Get Started</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
