# 🏆 We Won 3rd Place at KnightHacks VIII!

## The Challenge

Our organization delivers **Technical Accelerators** - fixed-scope engagements designed to solve common technical challenges. At any given time, we're:
- Developing 8-10 new Accelerators
- Actively delivering up to 600 ongoing projects
- Managing Access to Experts (A2E) requests that fall outside our catalog

**The Problem:** With hundreds of requests flowing through A2E, how do we intelligently identify emerging needs and gaps in our catalog? How do we know which new Accelerators to build next?

## Our Solution: Request Analysis Agent

We built an AI-powered agent that analyzes company data, A2E requests, and our existing catalog to surface hidden opportunities and catalog gaps.

### What It Does

**🔍 Intelligent Clustering**
- Uses advanced NLP (sentence-transformers) to understand request semantics
- Applies UMAP + HDBSCAN to discover natural groupings in demand patterns
- Identifies emerging themes before they become obvious

**📊 Gap Analysis**
- Calculates similarity between request clusters and existing Accelerators
- Highlights high-demand areas poorly served by current offerings
- Ranks opportunities by demand volume and coverage gap

**🎯 Real-Time Classification**
- Live agent API for instant request analysis
- Automatic routing recommendations:
  - **Prioritize for Development** - High demand + High gap
  - **Address with Existing** - Well-covered by current portfolio
  - **Review Manually** - Unique or outlier requests

**📈 Interactive Dashboard**
- Visual cluster exploration with 2D embeddings
- Category distribution analysis
- Drill-down into specific request clusters
- Exportable recommendations for stakeholder review

### The Tech Stack

- **ML/NLP:** Sentence Transformers, UMAP, HDBSCAN, Scikit-learn
- **Backend:** Python, Flask, Pandas, NumPy
- **Visualization:** Plotly, Interactive web dashboards
- **Data Processing:** TF-IDF for keyword extraction, Cosine similarity for matching

### The Impact

This agent transforms reactive request handling into proactive catalog development:

✅ **Data-Driven Decisions** - No more guessing which Accelerators to build
✅ **Resource Optimization** - Focus development on proven demand
✅ **Faster Response** - Instantly classify and route new requests
✅ **Strategic Insight** - Visualize market needs at a glance

### Key Technical Achievements

1. **Scalable Pipeline** - Handles hundreds of requests efficiently
2. **Production-Ready** - Admin interface for easy data updates
3. **Live Agent** - Real-time predictions with cached models
4. **Interpretable Results** - TF-IDF keywords make clusters actionable

## Why This Matters

In a world of growing technical complexity, organizations need to evolve their service offerings based on real signals, not intuition. Our agent provides that signal, turning scattered requests into strategic intelligence.

---

**Built at KnightHacks VIII** | **Team:** [Your Team Name]

**Tech:** Python • Machine Learning • NLP • Flask • UMAP • HDBSCAN

---

## Want to Learn More?

Check out our code: [Repository Link]

Have questions about the approach? Let's connect!

#KnightHacks #MachineLearning #NLP #Hackathon #AI #DataScience #ProductStrategy
