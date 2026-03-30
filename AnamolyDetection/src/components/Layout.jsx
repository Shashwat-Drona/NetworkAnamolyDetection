import React from 'react';
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import PageTransition from "./PageTransition";

export default function Layout() {
  return (
    <div className="min-h-screen app-shell text-slate-100 font-sans">
      <Navbar />
      <main className="w-full pt-28 md:pt-24">
        <PageTransition>
          <div className="page-wrap">
            <Outlet />
          </div>
        </PageTransition>
      </main>
    </div>
  );
}
