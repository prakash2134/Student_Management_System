import { Link } from "react-router-dom";
import { EmptyState } from "../components/ui.jsx";

export default function NotFound() {
  return (
    <EmptyState
      title="This page doesn't exist"
      text="The link may be broken or the page may have moved."
      action={
        <Link className="btn btn-primary" to="/">
          Back to dashboard
        </Link>
      }
    />
  );
}
