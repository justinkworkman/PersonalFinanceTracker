import { Link } from "wouter";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white border-t border-slate-200 py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <p className="text-sm text-slate-500">
          © {currentYear} BudgetTracker. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <Link href="#" className="text-sm text-slate-500 hover:text-primary">
            Help
          </Link>
          <Link href="#" className="text-sm text-slate-500 hover:text-primary">
            Settings
          </Link>
        </div>
      </div>
    </footer>
  );
}
