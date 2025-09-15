import { useEffect } from "react";
import { useLocation } from "wouter";

interface RedirectComponentProps {
  to: string;
  replace?: boolean;
}

/**
 * A component that redirects to a different route immediately upon mounting.
 * Used for maintaining backward compatibility with legacy URLs.
 */
export default function RedirectComponent({ to, replace = true }: RedirectComponentProps) {
  const [, navigate] = useLocation();
  
  useEffect(() => {
    // Redirect immediately when component mounts
    navigate(to, { replace });
  }, [to, replace, navigate]);

  // Return null since this component only handles redirection
  return null;
}