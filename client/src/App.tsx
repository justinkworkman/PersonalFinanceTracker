import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { DateProvider } from "@/context/DateContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DateProvider>
        <div className="min-h-screen flex flex-col bg-slate-50">
          {/* Fixed header at the top */}
          <div className="fixed w-full top-0 left-0 right-0 z-10">
            <Header />
          </div>
          {/* Main content with padding to account for fixed header - adjust top padding to account for header height */}
          <main className="flex-1 pt-32 pb-6 px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl w-full mt-4">
            <Router />
          </main>
          <Footer />
        </div>
        <Toaster />
      </DateProvider>
    </QueryClientProvider>
  );
}

export default App;
