import { useState } from 'react';
import './Crossword.css';

interface CrosswordCell {
    letter: string;
    number: number | null;
}

interface Clue {
    number: number;
    clue: string;
    answer: string;
}

interface CrosswordData {
    grid: CrosswordCell[][];
    across: Clue[];
    down: Clue[];
    theme: string;
    size: number;
    word_count: number;
    ai_generated: boolean;
}

export default function Crossword() {
    const [theme, setTheme] = useState('Lifestyle');
    const [customTheme, setCustomTheme] = useState('');
    const [gridSize, setGridSize] = useState(15);
    const [wordCount, setWordCount] = useState(10);
    const [puzzle, setPuzzle] = useState<CrosswordData | null>(null);
    const [loading, setLoading] = useState(false);
    const [isShowingAnswers, setIsShowingAnswers] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateCrossword = async () => {
        setLoading(true);
        setError(null);
        setPuzzle(null);
        setIsShowingAnswers(false);

        const activeTheme = customTheme.trim() || theme;

        try {
            const response = await fetch('/api/crossword/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    theme: activeTheme,
                    size: gridSize,
                    word_count: wordCount,
                    use_ai: true
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail?.message || 'Failed to generate crossword');
            }

            const data = await response.json();
            setPuzzle(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const exportForInDesign = () => {
        if (!puzzle) return;

        let xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xmlString += '<crosswordPuzzle>\n';

        xmlString += `  <metadata>\n`;
        xmlString += `    <theme>${puzzle.theme}</theme>\n`;
        xmlString += `    <size>${puzzle.size}</size>\n`;
        xmlString += `    <wordCount>${puzzle.word_count}</wordCount>\n`;
        xmlString += `    <aiGenerated>${puzzle.ai_generated}</aiGenerated>\n`;
        xmlString += `  </metadata>\n`;

        xmlString += '  <grid>\n';
        puzzle.grid.forEach((row, r) => {
            xmlString += `    <row index="${r}">\n`;
            row.forEach((cell, c) => {
                const isBlack = cell.letter === '#';
                xmlString += `      <cell col="${c}" row="${r}" number="${cell.number || ''}" isBlack="${isBlack}">`;
                if (!isBlack) {
                    xmlString += cell.letter;
                }
                xmlString += '</cell>\n';
            });
            xmlString += '    </row>\n';
        });
        xmlString += '  </grid>\n';

        xmlString += '  <clues>\n';
        xmlString += '    <across>\n';
        puzzle.across.forEach(clue => {
            xmlString += '      <clue>\n';
            xmlString += `        <number>${clue.number}</number>\n`;
            xmlString += `        <text>${clue.clue}</text>\n`;
            xmlString += `        <answer>${clue.answer}</answer>\n`;
            xmlString += '      </clue>\n';
        });
        xmlString += '    </across>\n';
        xmlString += '    <down>\n';
        puzzle.down.forEach(clue => {
            xmlString += '      <clue>\n';
            xmlString += `        <number>${clue.number}</number>\n`;
            xmlString += `        <text>${clue.clue}</text>\n`;
            xmlString += `        <answer>${clue.answer}</answer>\n`;
            xmlString += '      </clue>\n';
        });
        xmlString += '    </down>\n';
        xmlString += '  </clues>\n';

        xmlString += '</crosswordPuzzle>';

        const blob = new Blob([xmlString], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeFilename = (puzzle.theme || 'crossword').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.download = `crossword_${safeFilename}.xml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="crossword-page">
            <header className="page-header">
                <h1>🧩 Crossword Puzzle Generator <span>· Magazine Edition</span></h1>
                <button className="btn back-btn" onClick={() => window.location.href = '/'}>
                    Back to Home
                </button>
            </header>

            <main>
                <section className="controls-panel">
                    <h2 className="section-title">Puzzle Configuration</h2>
                    <div className="controls-grid">
                        <div className="field">
                            <label>Theme Selection</label>
                            <select value={theme} onChange={e => setTheme(e.target.value)}>
                                <option value="Lifestyle">Lifestyle</option>
                                <option value="Travel">Travel</option>
                                <option value="Entertainment">Entertainment</option>
                                <option value="Technology">Technology</option>
                            </select>
                        </div>

                        <div className="field">
                            <label>Custom Theme (Optional)</label>
                            <input
                                type="text"
                                placeholder="e.g., Sports, Science"
                                value={customTheme}
                                onChange={e => setCustomTheme(e.target.value)}
                            />
                        </div>

                        <div className="field">
                            <label>Grid Size</label>
                            <input
                                type="number"
                                min="10" max="20"
                                value={gridSize}
                                onChange={e => setGridSize(Number(e.target.value))}
                            />
                        </div>

                        <div className="field">
                            <label>Number of Words</label>
                            <input
                                type="number"
                                min="5" max="20"
                                value={wordCount}
                                onChange={e => setWordCount(Number(e.target.value))}
                            />
                        </div>

                        <div className="field" style={{ display: 'flex', alignItems: 'flexEnd' }}>
                            <button className="btn" onClick={() => setIsShowingAnswers(!isShowingAnswers)} disabled={!puzzle}>
                                {isShowingAnswers ? 'Hide Answers' : 'Show Answers'}
                            </button>
                        </div>
                    </div>
                    <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                        <button className="btn primary" onClick={generateCrossword} disabled={loading}>
                            {loading ? 'Generating...' : 'Generate Crossword Puzzle'}
                        </button>
                    </div>
                </section>

                <section className="magazine-output-container">
                    {!puzzle && !loading && !error && (
                        <div className="placeholder">
                            <p>Configure your puzzle settings and click "Generate" to begin.</p>
                        </div>
                    )}

                    {loading && (
                        <div className="loading">
                            <div className="spinner"></div>
                            <p>Creating your crossword puzzle with AI...</p>
                        </div>
                    )}

                    {error && (
                        <div className="error">❌ Error: {error}</div>
                    )}

                    {puzzle && (
                        <div className="magazine-page">
                            <div className="export-container">
                                <button className="btn export-btn" onClick={exportForInDesign}>
                                    Export for InDesign (XML)
                                </button>
                            </div>
                            <div className="magazine-header">
                                <h2>The Weekly Crossword</h2>
                                <p>Theme: {puzzle.theme}</p>
                            </div>
                            <div className="magazine-content">
                                <div className="magazine-puzzle-area">
                                    <div
                                        className="crossword-grid"
                                        style={{ gridTemplateColumns: `repeat(${puzzle.size}, 1fr)` }}
                                    >
                                        {puzzle.grid.map((row, r) => (
                                            row.map((cell, c) => {
                                                const isBlack = cell.letter === '#';
                                                return (
                                                    <div key={`${r}-${c}`} className={`cell ${isBlack ? 'black' : ''}`}>
                                                        {cell.number && <span className="cell-number">{cell.number}</span>}
                                                        {isShowingAnswers && !isBlack && cell.letter}
                                                    </div>
                                                );
                                            })
                                        ))}
                                    </div>
                                </div>
                                <div className="magazine-clues-area">
                                    <div className="clues-container">
                                        <div className="clues-section">
                                            <h3>Across</h3>
                                            <div>
                                                {puzzle.across.length > 0 ? puzzle.across.map(clue => (
                                                    <div className="clue-item" key={clue.number}>
                                                        <span className="clue-number">{clue.number}.</span>
                                                        <span>{clue.clue}</span>
                                                    </div>
                                                )) : <div className="clue-item small muted">No across clues</div>}
                                            </div>
                                        </div>
                                        <div className="clues-section">
                                            <h3>Down</h3>
                                            <div>
                                                {puzzle.down.length > 0 ? puzzle.down.map(clue => (
                                                    <div className="clue-item" key={clue.number}>
                                                        <span className="clue-number">{clue.number}.</span>
                                                        <span>{clue.clue}</span>
                                                    </div>
                                                )) : <div className="clue-item small muted">No down clues</div>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
