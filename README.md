# Request Analysis Agent 🏆

**3rd Place Winner - KnightHacks VIII**

An AI-powered agent that intelligently identifies emerging needs and catalog gaps in Technical Accelerator programs by analyzing request patterns and existing service offerings.

## The Problem

Organizations delivering Technical Accelerators face a critical challenge:
- Managing 8-10 new Accelerator developments simultaneously
- Delivering up to 600 ongoing projects
- Processing Access to Experts (A2E) requests outside the catalog
- **Deciding which new Accelerators to build next**

## Our Solution

A machine learning pipeline that transforms scattered request data into strategic intelligence:

### Core Features

🔍 **Semantic Clustering**
- Uses sentence transformers to understand request meaning
- UMAP + HDBSCAN for discovering demand patterns
- TF-IDF keyword extraction for cluster themes

📊 **Gap Analysis**
- Calculates coverage gaps between requests and existing Accelerators
- Ranks opportunities by demand volume and gap size
- Generates actionable recommendations

🎯 **Live Request Agent**
- Real-time classification of new requests
- Instant routing recommendations
- Cached models for fast predictions

📈 **Interactive Dashboard**
- Visual exploration of request clusters
- Category distribution analysis
- Drill-down into specific patterns
- CSV export for stakeholder review

## Tech Stack

- **ML/NLP:** Sentence Transformers, UMAP, HDBSCAN, Scikit-learn
- **Backend:** Python, Flask, Pandas, NumPy
- **Visualization:** Plotly
- **Data Processing:** TF-IDF, Cosine Similarity

## Quick Start

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the analysis pipeline:
```bash
cd KnightHacks/snow
python analysis_pipeline.py
```

3. Start the web server:
```bash
python server.py
```

4. Access the dashboard:
- Main Dashboard: `http://localhost:5000`
- Admin Panel: `http://localhost:5000/admin`

## API Endpoints

- `GET /api/recommendations` - Get all catalog gap recommendations
- `GET /api/cluster-plot` - Get 2D cluster visualization data
- `GET /api/category-data` - Get request category distribution
- `GET /api/cluster-details?id={cluster_id}` - Get details for specific cluster
- `POST /api/analyze-request` - Analyze a single request in real-time
- `GET /api/export-recommendations` - Export recommendations as CSV
- `POST /upload` - Upload new data and rerun analysis

## Project Structure

```
KnightHacks/snow/
├── analysis_pipeline.py    # Core ML pipeline
├── server.py               # Flask web application
├── requirements.txt        # Python dependencies
├── templates/             # HTML templates
├── static/                # Frontend assets and data
│   ├── js/               # Dashboard JavaScript
│   └── data/             # Generated analysis outputs
├── u_hack.csv            # Sample request data
└── accelerators.csv      # Sample catalog data
```

## How It Works

1. **Data Ingestion:** Load request and accelerator catalog data
2. **Vectorization:** Convert text to semantic embeddings
3. **Clustering:** Group similar requests using UMAP + HDBSCAN
4. **Gap Analysis:** Compare clusters to existing accelerators
5. **Recommendation:** Rank by demand × gap score
6. **Visualization:** Generate interactive dashboards
7. **Live Agent:** Classify new requests against learned patterns

## Team

Built at KnightHacks VIII

## License

MIT