import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Horoscope from './pages/Horoscope';
import Crossword from './pages/Crossword';
import './App.css'; // Cleared but kept for consistency if needed later

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/horoscope" element={<Horoscope />} />
      <Route path="/crossword" element={<Crossword />} />
    </Routes>
  );
}

export default App;
