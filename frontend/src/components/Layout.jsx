import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import Icon from "./Icons.jsx";
import { Avatar } from "./ui.jsx";

const NAV = [
  { to: "/", label: "Dashboard", icon: "dashboard", end: true },
  { to: "/students", label: "Students", icon: "students" },
  { to: "/courses", label: "Courses", icon: "courses" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <svg width="20" height="20" viewBox="0 0 32 32" aria-hidden="true">
              <path d="M5 12l11-5 11 5-11 5z" fill="#fff" />
              <path d="M10 16v5c3 2.6 9 2.6 12 0v-5l-6 2.6z" fill="#F4B63F" />
            </svg>
          </span>
          <span className="brand-name">Campusly</span>
        </div>

        <nav className="nav">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="me">
            <Avatar name={user?.full_name} size={36} />
            <div className="me-text">
              <strong>{user?.full_name}</strong>
              <span>{user?.email}</span>
            </div>
          </div>
          <button className="logout" onClick={handleLogout}>
            <Icon name="logout" size={16} />
            <span>Log out</span>
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
