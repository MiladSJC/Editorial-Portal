import { Link } from 'react-router-dom';
import './Home.css';

export default function Home() {
    return (
        <div className="wrap">
            <header>
                <h1 className="float">Content Factori <span className="badge">SJC Media Demo</span></h1>
                <p className="subtitle">January 13, 2026 Executive Showcase. Bridging editorial standards with automated custom media solutions.</p>
            </header>

            <div className="section-title">📝 Core Editorial Pipeline</div>
            <div className="grid">
                <a className="button" href="#" target="_blank">
                    <div className="button-header">
                        <div className="button-icon">✍️</div>
                        <span className="tag">Standard</span>
                    </div>
                    <div className="button-content">
                        <div className="title">Writer / Editor Portal</div>
                        <div className="sub">Workflow for standard editorial features: AI-drafting, fact-check, and legal verification.</div>
                    </div>
                </a>

                <a className="button" href="#" target="_blank">
                    <div className="button-header">
                        <div className="button-icon">📋</div>
                    </div>
                    <div className="button-content">
                        <div className="title">Editorial Calendar</div>
                        <div className="sub">Central tracking for issues, assignments, and contributor deadlines.</div>
                    </div>
                </a>
            </div>

            <div className="section-title">🤝 Branded & Custom Content (Sasha's Group)</div>
            <div className="grid">
                <a className="button highlight" href="#" target="_blank">
                    <div className="button-header">
                        <div className="button-icon">💎</div>
                        <span className="tag new">Beta</span>
                    </div>
                    <div className="button-content">
                        <div className="title">Advertorial Builder</div>
                        <div className="sub"><b>Media Capabilities for Custom Content:</b> Turn brand assets into editorial-style stories for Sasha's group. Includes client review gates.</div>
                    </div>
                </a>

                <a className="button" href="#" target="_blank">
                    <div className="button-header">
                        <div className="button-icon">💼</div>
                    </div>
                    <div className="button-content">
                        <div className="title">Ad Space & Specs Manager</div>
                        <div className="sub">Manage placement specs, client contracts, and ad material verification for print.</div>
                    </div>
                </a>
            </div>

            <div className="section-title">🎨 Content Automation</div>
            <div className="grid three">
                <Link className="button" to="/crossword">
                    <div className="button-header">
                        <div className="button-icon">🧩</div>
                        <span className="tag">Puzzles</span>
                    </div>
                    <div className="button-content">
                        <div className="title">Crossword Generator</div>
                        <div className="sub">AI grids with InDesign XML export for magazine print production.</div>
                    </div>
                </Link>

                <Link className="button" to="/horoscope">
                    <div className="button-header">
                        <div className="button-icon">♈</div>
                        <span className="tag">Print Ready</span>
                    </div>
                    <div className="button-content">
                        <div className="title">Horoscope Automation</div>
                        <div className="sub">Generate and format all 12 signs with custom publication tone presets.</div>
                    </div>
                </Link>

                <a className="button" href="#" target="_blank">
                    <div className="button-header">
                        <div className="button-icon">🍳</div>
                    </div>
                    <div className="button-content">
                        <div className="title">Recipe Formatter</div>
                        <div className="sub">Standardize ingredients and nutritional data for lifestyle publication layouts.</div>
                    </div>
                </a>
            </div>

            <div className="section-title">📊 Analytics & Insights</div>
            <div className="grid">
                <a className="button" href="#" target="_blank">
                    <div className="button-header">
                        <div className="button-icon">📈</div>
                    </div>
                    <div className="button-content">
                        <div className="title">Performance Analytics</div>
                        <div className="sub">Post-publication engagement metrics, read time, and reader demographics.</div>
                    </div>
                </a>

                <a className="button" href="#" target="_blank">
                    <div className="button-header">
                        <div className="button-icon">📧</div>
                    </div>
                    <div className="button-content">
                        <div className="title">Subscriber Management</div>
                        <div className="sub">Audience segmentation, retention metrics, and newsletter distribution logic.</div>
                    </div>
                </a>
            </div>

            <div className="stats">
                <div className="stat">
                    <div className="stat-value">13</div>
                    <div className="stat-label">Active Modules</div>
                </div>
                <div className="stat">
                    <div className="stat-value">Jan 13</div>
                    <div className="stat-label">Demo Date</div>
                </div>
                <div className="stat">
                    <div className="stat-value">SJ Media</div>
                    <div className="stat-label">System Mode</div>
                </div>
            </div>

            <footer>
                Content Factori • Version 2.5.0 • St. Joseph Communications Content Group • Jan 2026
            </footer>
        </div>
    );
}
