import "./App.css";
import { Routes, Route } from "react-router-dom";

function App() {
  return (
    <>
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="text-2xl font-bold">Likeable</div>
        <button className="bg-blue-500 text-white p-2 rounded-md cursor-pointer">Click me</button>
      </div>
      <Routes>
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </>
  );
}

export default App;
