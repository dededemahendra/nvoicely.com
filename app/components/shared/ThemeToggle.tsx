import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { setTheme, type Theme } from "~/lib/theme";

function ContrastIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
      <path d="M12 3l0 18" />
      <path d="M12 9l4.65 -4.65" />
      <path d="M12 14.3l7.37 -7.37" />
      <path d="M12 19.6l8.85 -8.85" />
    </svg>
  );
}

export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    setThemeState(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  }

  return (
    <Button
      variant="outline"
      size="icon-sm"
      className="h-9 w-9 rounded-xl"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      <ContrastIcon />
    </Button>
  );
}
