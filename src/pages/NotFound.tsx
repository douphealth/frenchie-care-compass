import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    document.title = 'Page not found | FrenchyFab Care Compass';
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="text-center max-w-sm">
        <h1 className="mb-3 text-3xl font-black font-display text-foreground">Page not found</h1>
        <p className="mb-5 text-sm text-muted-foreground">That address is not part of the care plan.</p>
        <a href="/" className="text-sm font-bold text-primary underline">
          Back to the care plan
        </a>
      </div>
    </main>
  );
};

export default NotFound;
