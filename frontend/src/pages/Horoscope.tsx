import { useState } from 'react';
import './Horoscope.css';

interface ZodiacData {
    name: string;
    icon: string;
    dates: string;
}

const ZODIAC_SIGNS: ZodiacData[] = [
    { name: 'Aries', icon: '♈', dates: 'Mar 21 - Apr 19' },
    { name: 'Taurus', icon: '♉', dates: 'Apr 20 - May 20' },
    { name: 'Gemini', icon: '♊', dates: 'May 21 - Jun 20' },
    { name: 'Cancer', icon: '♋', dates: 'Jun 21 - Jul 22' },
    { name: 'Leo', icon: '♌', dates: 'Jul 23 - Aug 22' },
    { name: 'Virgo', icon: '♍', dates: 'Aug 23 - Sep 22' },
    { name: 'Libra', icon: '♎', dates: 'Sep 23 - Oct 22' },
    { name: 'Scorpio', icon: '♏', dates: 'Oct 23 - Nov 21' },
    { name: 'Sagittarius', icon: '♐', dates: 'Nov 22 - Dec 21' },
    { name: 'Capricorn', icon: '♑', dates: 'Dec 22 - Jan 19' },
    { name: 'Aquarius', icon: '♒', dates: 'Jan 20 - Feb 18' },
    { name: 'Pisces', icon: '♓', dates: 'Feb 19 - Mar 20' }
];

export default function Horoscope() {
    const [magazine, setMagazine] = useState('Fashion Magazine');
    const [horoscopeType, setHoroscopeType] = useState('Daily');
    const [tone, setTone] = useState('Mystical & Poetic');
    const [wordCount, setWordCount] = useState(100);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<Record<string, string>>({});
    const [generated, setGenerated] = useState(false);

    const generateSingleHoroscope = async (sign: ZodiacData) => {
        try {
            const response = await fetch('/api/horoscope/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    magazine,
                    zodiac_sign: sign.name,
                    horoscope_type: horoscopeType,
                    tone,
                    word_count: wordCount
                })
            });

            if (!response.ok) throw new Error('Failed');
            const data = await response.json();
            return { sign: sign.name, content: data.horoscope };
        } catch (e) {
            return { sign: sign.name, content: null };
        }
    };

    const handleGenerate = async () => {
        setLoading(true);
        setGenerated(true);
        setResults({});

        // Initialize loading state for all
        const initialResults: Record<string, string> = {};
        ZODIAC_SIGNS.forEach(z => initialResults[z.name] = 'LOADING');
        setResults(initialResults);

        try {
            // In a real app we might want to batch these or do them sequentially to avoid rate limits
            // For now, doing parallel but maybe we should chunk them?
            const promises = ZODIAC_SIGNS.map(sign => generateSingleHoroscope(sign));
            const outcomes = await Promise.all(promises);

            const newResults: Record<string, string> = {};
            outcomes.forEach(o => {
                newResults[o.sign] = o.content || 'Error generating horoscope.';
            });
            setResults(newResults);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const exportToXML = () => {
        let xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xmlString += '<root>\n';
        xmlString += '  <horoscopeSpread>\n';
        xmlString += `    <metadata>\n`;
        xmlString += `      <publication>${magazine}</publication>\n`;
        xmlString += `      <type>${horoscopeType}</type>\n`;
        xmlString += `      <tone>${tone}</tone>\n`;
        xmlString += `      <wordCount>${wordCount}</wordCount>\n`;
        xmlString += `      <exportDate>${new Date().toISOString()}</exportDate>\n`;
        xmlString += `    </metadata>\n`;
        xmlString += '    <zodiacEntries>\n';

        ZODIAC_SIGNS.forEach(sign => {
            const content = results[sign.name];
            if (content && content !== 'LOADING' && !content.startsWith('Error')) {
                xmlString += '      <entry>\n';
                xmlString += `        <sign>${sign.name}</sign>\n`;
                xmlString += `        <dates>${sign.dates}</dates>\n`;
                xmlString += `        <forecast>${content.replace(/[<>&'"]/g, (c) => {
                    switch (c) {
                        case '<': return '&lt;';
                        case '>': return '&gt;';
                        case '&': return '&amp;';
                        case '\'': return '&apos;';
                        case '"': return '&quot;';
                        default: return c;
                    }
                })}</forecast>\n`;
                xmlString += '      </entry>\n';
            }
        });

        xmlString += '    </zodiacEntries>\n';
        xmlString += '  </horoscopeSpread>\n';
        xmlString += '</root>';

        const blob = new Blob([xmlString], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'horoscope_export.xml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="horoscope-page">
            <header className="page-header">
                <h1>Magazine Horoscopes <span>· AI Astrologer</span></h1>
                <button className="btn secondary" onClick={exportToXML} disabled={!generated || loading}>
                    Export for InDesign (XML)
                </button>
            </header>

            <main>
                <section className="controls-panel">
                    <div className="controls-grid">
                        <div className="field">
                            <label>Target Magazine</label>
                            <select value={magazine} onChange={e => setMagazine(e.target.value)}>
                                <option>Fashion Magazine</option>
                                <option>Hello! Canada</option>
                                <option>Chatelaine English</option>
                                <option>Toronto Life</option>
                                <option>Macleans</option>
                            </select>
                        </div>

                        <div className="field">
                            <label>Horoscope Type</label>
                            <select value={horoscopeType} onChange={e => setHoroscopeType(e.target.value)}>
                                <option>Daily</option>
                                <option>Weekly</option>
                                <option>Monthly</option>
                                <option>Love & Romance</option>
                                <option>Career & Finance</option>
                            </select>
                        </div>

                        <div className="field">
                            <label>Writing Tone</label>
                            <select value={tone} onChange={e => setTone(e.target.value)}>
                                <option>Mystical & Poetic</option>
                                <option>Practical & Action-Oriented</option>
                                <option>Witty & Fun</option>
                                <option>Inspirational & Uplifting</option>
                            </select>
                        </div>

                        <div className="field">
                            <label>Word Count (Estimate)</label>
                            <select value={wordCount} onChange={e => setWordCount(Number(e.target.value))}>
                                <option value="50">Short (50 words)</option>
                                <option value="100">Medium (100 words)</option>
                                <option value="150">Long (150 words)</option>
                                <option value="200">Extended (200 words)</option>
                            </select>
                        </div>

                        <div className="field" style={{ display: 'flex', alignItems: 'flexEnd' }}>
                            <button className="btn primary" onClick={handleGenerate} disabled={loading} style={{ width: '100%' }}>
                                {loading ? 'Consulting the stars...' : 'Generate Horoscope Spread'}
                            </button>
                        </div>
                    </div>
                </section>

                <div id="contentArea">
                    {!generated && (
                        <div className="placeholder">
                            <div className="placeholder-icon">✨</div>
                            <p style={{ fontSize: '18px', margin: '0 0 8px', color: 'var(--heading)', fontWeight: 'bold' }}>Your Horoscope Page Awaits</p>
                            <p style={{ fontSize: '14px', margin: 0 }}>Configure your settings above and click generate to create the magazine spread.</p>
                        </div>
                    )}

                    {generated && (
                        <>
                            <div className="magazine-title">
                                <h2>Your {horoscopeType} Stars</h2>
                                <div className="subtitle">A special forecast for {magazine}</div>
                            </div>
                            <div className="magazine-layout">
                                {ZODIAC_SIGNS.map(sign => (
                                    <article className="horoscope-entry" key={sign.name}>
                                        <div className="entry-header">
                                            <div className="zodiac-icon">{sign.icon}</div>
                                            <div>
                                                <h3>{sign.name}</h3>
                                                <div className="dates">{sign.dates}</div>
                                            </div>
                                        </div>
                                        <div className="entry-body">
                                            {results[sign.name] === 'LOADING' ? (
                                                <div className="loading-state">
                                                    <div className="spinner"></div>
                                                    <span>Generating forecast...</span>
                                                </div>
                                            ) : (
                                                <div style={results[sign.name]?.startsWith('Error') ? { color: '#d9534f' } : {}}>
                                                    {results[sign.name]}
                                                </div>
                                            )}
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
