import React from "react";
import { BoardProvider } from "./context/BoardProvider.jsx";
import Header from "./components/Header.jsx";
import Toolbar from "./components/Toolbar.jsx";
import MergeConflictBannerContainer from "./components/MergeConflictBannerContainer.jsx";
import Board from "./components/Board.jsx";

export default function App() {
  return (
    <BoardProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <Toolbar />
        <main className="flex-1 p-4">
          <Board />
        </main>
      </div>
    </BoardProvider>
  );
}
