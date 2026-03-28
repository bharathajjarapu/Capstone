import { Routes, Route } from "react-router-dom";

export default function App() {
  return (
    <div className="min-h-dvh bg-neutral-50 text-neutral-900">
      <Routes>
        <Route
          path="/"
          element={
            <main className="p-6">
              <h1 className="text-lg font-medium tracking-tight">
                Ven<span className="text-neutral-400">.</span> <span className="font-normal text-neutral-600">Dot</span>
              </h1>
              <p className="mt-2 text-sm text-neutral-600">Frontend shell — add routes and pages next.</p>
            </main>
          }
        />
      </Routes>
    </div>
  );
}