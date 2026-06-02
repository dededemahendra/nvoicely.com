import {
  createRootRoute,
  Outlet,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import appCss from "~/styles/app.css?url";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
    },
  },
});

export const Route = createRootRoute({
  component: RootComponent,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Nvoicely" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
});

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <Outlet />
          <Toaster position="top-right" richColors />
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
