import React from 'react';
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import PageTransition from "./PageTransition";

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <Navbar />
      <main className="w-full">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
    </div>
  );
}
